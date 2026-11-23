resource "aws_ecs_cluster" "main" {
  name = local.name

  setting {
    name  = "containerInsights"
    value = "disabled" # billed per metric; the load balancer alarms cover availability
  }
}

# trivy:ignore:AVD-AWS-0017 (a customer-managed KMS key adds cost; logs hold no secrets, pino redacts auth headers)
resource "aws_cloudwatch_log_group" "app" {
  name              = "/ecs/${local.name}"
  retention_in_days = 30
}

############################################
# Roles
############################################

data "aws_iam_policy_document" "ecs_tasks_trust" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
    condition {
      test     = "StringEquals"
      variable = "aws:SourceAccount"
      values   = [local.account_id]
    }
  }
}

# Used by ECS itself to start the task: pull images, write logs, read the secrets it injects.
resource "aws_iam_role" "execution" {
  name               = "${local.name}-ecs-execution"
  assume_role_policy = data.aws_iam_policy_document.ecs_tasks_trust.json
}

resource "aws_iam_role_policy_attachment" "execution" {
  role       = aws_iam_role.execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

data "aws_iam_policy_document" "execution_secrets" {
  statement {
    sid       = "ReadOwnSecrets"
    actions   = ["ssm:GetParameters"]
    resources = ["arn:aws:ssm:${var.region}:${local.account_id}:parameter${local.param_path}/*"]
  }
}

resource "aws_iam_role_policy" "execution_secrets" {
  name   = "${local.name}-read-secrets"
  role   = aws_iam_role.execution.id
  policy = data.aws_iam_policy_document.execution_secrets.json
}

# Used by the running containers. The app calls no AWS API; the only permissions are for ECS Exec, the IAM-checked
# replacement for SSH (aws ecs execute-command).
resource "aws_iam_role" "task" {
  name               = "${local.name}-ecs-task"
  assume_role_policy = data.aws_iam_policy_document.ecs_tasks_trust.json
}

data "aws_iam_policy_document" "task" {
  statement {
    sid = "EcsExec"
    actions = [
      "ssmmessages:CreateControlChannel",
      "ssmmessages:CreateDataChannel",
      "ssmmessages:OpenControlChannel",
      "ssmmessages:OpenDataChannel",
    ]
    resources = ["*"]
  }
}

resource "aws_iam_role_policy" "task" {
  name   = "${local.name}-ecs-exec"
  role   = aws_iam_role.task.id
  policy = data.aws_iam_policy_document.task.json
}

############################################
# Task definition: web + api in one task
############################################
# Both containers share the task's network namespace, so server-side rendering calls the API on 127.0.0.1 without
# leaving the task. Images start at the "bootstrap" tag; scripts/ecs-deploy.sh registers revisions with real
# commit SHAs, and the service ignores task definition changes made by Terraform until the next deploy.

locals {
  api_environment = merge(var.app_settings, {
    NODE_ENV         = "production"
    PORT             = "4000"
    DATABASE_URL     = "postgres://${aws_db_instance.main.username}@${aws_db_instance.main.address}:${aws_db_instance.main.port}/${aws_db_instance.main.db_name}?sslmode=require"
    REDIS_URL        = "rediss://${aws_elasticache_replication_group.main.primary_endpoint_address}:6379/0"
    WEB_ORIGIN       = "https://${local.site_domain}"
    TRUST_PROXY_HOPS = "2" # CloudFront + load balancer
  })

  secret_refs = [
    for env_name, param in local.api_secrets : {
      name      = env_name
      valueFrom = "arn:aws:ssm:${var.region}:${local.account_id}:parameter${local.param_path}/${param}"
    }
  ]

  container_defaults = {
    essential              = true
    readonlyRootFilesystem = false # Next.js writes its image cache
    linuxParameters = {
      capabilities       = { drop = ["ALL"] }
      initProcessEnabled = true
    }
  }

  log_options = {
    "awslogs-group"  = aws_cloudwatch_log_group.app.name
    "awslogs-region" = var.region
  }

  api_container = merge(local.container_defaults, {
    name         = "api"
    image        = "${aws_ecr_repository.app["api"].repository_url}:bootstrap"
    portMappings = [{ containerPort = 4000, protocol = "tcp" }]
    environment  = [for k, v in local.api_environment : { name = k, value = v }]
    secrets      = local.secret_refs
    healthCheck = {
      command     = ["CMD-SHELL", "wget -qO- http://127.0.0.1:4000/api/health >/dev/null || exit 1"]
      interval    = 15
      timeout     = 5
      retries     = 5
      startPeriod = 60
    }
    logConfiguration = {
      logDriver = "awslogs"
      options   = merge(local.log_options, { "awslogs-stream-prefix" = "api" })
    }
  })
}

resource "aws_ecs_task_definition" "app" {
  family                   = "${local.name}-app"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.task_cpu
  memory                   = var.task_memory
  execution_role_arn       = aws_iam_role.execution.arn
  task_role_arn            = aws_iam_role.task.arn
  skip_destroy             = true # keep old revisions so a rollback can still use them

  runtime_platform {
    operating_system_family = "LINUX"
    cpu_architecture        = "ARM64"
  }

  container_definitions = jsonencode([
    local.api_container,
    merge(local.container_defaults, {
      name         = "web"
      image        = "${aws_ecr_repository.app["web"].repository_url}:bootstrap"
      portMappings = [{ containerPort = 3000, protocol = "tcp" }]
      environment = [
        { name = "NODE_ENV", value = "production" },
        { name = "PORT", value = "3000" },
        { name = "HOSTNAME", value = "0.0.0.0" },
        { name = "API_INTERNAL_URL", value = "http://127.0.0.1:4000/api" },
      ]
      dependsOn = [{ containerName = "api", condition = "HEALTHY" }]
      healthCheck = {
        command     = ["CMD-SHELL", "wget -qO- http://127.0.0.1:3000/ >/dev/null || exit 1"]
        interval    = 15
        timeout     = 5
        retries     = 5
        startPeriod = 30
      }
      logConfiguration = {
        logDriver = "awslogs"
        options   = merge(local.log_options, { "awslogs-stream-prefix" = "web" })
      }
    }),
  ])
}

# One-off seed: same api image, plus SEED_ADMIN_PASSWORD, which scripts/seed.sh puts in Parameter Store just for
# the run and deletes afterwards. Run only by that script.
resource "aws_ecs_task_definition" "seed" {
  family                   = "${local.name}-seed"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = 512
  memory                   = 1024
  execution_role_arn       = aws_iam_role.execution.arn
  task_role_arn            = aws_iam_role.task.arn
  skip_destroy             = true

  runtime_platform {
    operating_system_family = "LINUX"
    cpu_architecture        = "ARM64"
  }

  container_definitions = jsonencode([
    merge(local.api_container, {
      command = ["node", "--import", "tsx", "src/db/seed/index.ts"]
      secrets = concat(local.secret_refs, [{
        name      = "SEED_ADMIN_PASSWORD"
        valueFrom = "arn:aws:ssm:${var.region}:${local.account_id}:parameter${local.param_path}/SEED_ADMIN_PASSWORD"
      }])
      healthCheck  = null
      portMappings = []
    }),
  ])
}

############################################
# Service
############################################

resource "aws_ecs_service" "app" {
  name                   = "${local.name}-app"
  cluster                = aws_ecs_cluster.main.id
  task_definition        = aws_ecs_task_definition.app.arn
  desired_count          = 0 # the first deploy (scripts/ecs-deploy.sh) sets it to 1 once real images exist
  launch_type            = "FARGATE"
  platform_version       = "LATEST"
  enable_execute_command = true
  propagate_tags         = "SERVICE"

  # One task; during a deploy the new one starts and turns healthy before the old one stops. The API runs its
  # migrations on start, which is safe because only the single new task migrates.
  deployment_minimum_healthy_percent = 100
  deployment_maximum_percent         = 200
  health_check_grace_period_seconds  = 120

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  network_configuration {
    subnets          = aws_subnet.public[*].id
    security_groups  = [aws_security_group.task.id]
    assign_public_ip = true # outbound only; the security group admits nothing but the load balancer
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.app["web"].arn
    container_name   = "web"
    container_port   = 3000
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.app["api"].arn
    container_name   = "api"
    container_port   = 4000
  }

  lifecycle {
    ignore_changes = [task_definition, desired_count]
  }

  depends_on = [aws_lb_listener_rule.api]
}
