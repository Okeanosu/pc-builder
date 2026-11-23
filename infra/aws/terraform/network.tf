# Two availability zones (the load balancer, RDS and ElastiCache all require two).
# Public subnets hold only the Fargate task, which needs outbound internet (ECR, Gemini, SSM) and gets a public
# IP instead of a NAT gateway (NAT costs about 45 USD/month); its security group admits nothing from the internet.
# Private subnets have no route out at all and hold the internal load balancer, the database and the cache.

# trivy:ignore:AVD-AWS-0178 (flow logs are billed per GB; enable them when investigating an incident)
resource "aws_vpc" "main" {
  cidr_block           = "10.20.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = { Name = local.name }
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
  tags   = { Name = local.name }
}

resource "aws_subnet" "public" {
  count = 2

  vpc_id                  = aws_vpc.main.id
  cidr_block              = cidrsubnet(aws_vpc.main.cidr_block, 8, count.index + 1)
  availability_zone       = local.azs[count.index]
  map_public_ip_on_launch = false

  tags = { Name = "${local.name}-public-${count.index + 1}" }
}

resource "aws_subnet" "private" {
  count = 2

  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(aws_vpc.main.cidr_block, 8, count.index + 11)
  availability_zone = local.azs[count.index]

  tags = { Name = "${local.name}-private-${count.index + 1}" }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = { Name = "${local.name}-public" }
}

resource "aws_route_table_association" "public" {
  count          = 2
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id
  tags   = { Name = "${local.name}-private" }
}

resource "aws_route_table_association" "private" {
  count          = 2
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private.id
}

# The default security group allows all traffic between its members; strip it so nothing can use it.
resource "aws_default_security_group" "default" {
  vpc_id = aws_vpc.main.id
}

############################################
# Security groups: internet -> CloudFront -> ALB -> task -> database/cache
############################################

resource "aws_security_group" "alb" {
  name        = "${local.name}-alb"
  description = "Internal load balancer, reached only by CloudFront through its VPC origin"
  vpc_id      = aws_vpc.main.id
}

resource "aws_security_group" "task" {
  name        = "${local.name}-task"
  description = "Fargate task (web + api): traffic only from the load balancer"
  vpc_id      = aws_vpc.main.id
}

resource "aws_security_group" "db" {
  name        = "${local.name}-db"
  description = "RDS PostgreSQL: only the task"
  vpc_id      = aws_vpc.main.id
}

resource "aws_security_group" "cache" {
  name        = "${local.name}-cache"
  description = "ElastiCache Valkey: only the task"
  vpc_id      = aws_vpc.main.id
}

# The load balancer is internal (no public address); CloudFront's VPC origin connects from inside the VPC.
resource "aws_vpc_security_group_ingress_rule" "alb_from_vpc" {
  security_group_id = aws_security_group.alb.id
  description       = "CloudFront VPC origin"
  ip_protocol       = "tcp"
  from_port         = 80
  to_port           = 80
  cidr_ipv4         = aws_vpc.main.cidr_block
}

resource "aws_vpc_security_group_egress_rule" "alb_to_task" {
  for_each = { web = 3000, api = 4000 }

  security_group_id            = aws_security_group.alb.id
  description                  = "To the ${each.key} container"
  ip_protocol                  = "tcp"
  from_port                    = each.value
  to_port                      = each.value
  referenced_security_group_id = aws_security_group.task.id
}

resource "aws_vpc_security_group_ingress_rule" "task_from_alb" {
  for_each = { web = 3000, api = 4000 }

  security_group_id            = aws_security_group.task.id
  description                  = "${each.key} from the load balancer"
  ip_protocol                  = "tcp"
  from_port                    = each.value
  to_port                      = each.value
  referenced_security_group_id = aws_security_group.alb.id
}

# Outbound HTTPS for ECR, Parameter Store, CloudWatch Logs and Gemini, whose addresses are not fixed.
# trivy:ignore:AVD-AWS-0104
resource "aws_vpc_security_group_egress_rule" "task_https" {
  security_group_id = aws_security_group.task.id
  description       = "HTTPS out"
  ip_protocol       = "tcp"
  from_port         = 443
  to_port           = 443
  cidr_ipv4         = "0.0.0.0/0"
}

resource "aws_vpc_security_group_egress_rule" "task_to_data" {
  for_each = {
    db    = { port = 5432, sg = aws_security_group.db.id }
    cache = { port = 6379, sg = aws_security_group.cache.id }
  }

  security_group_id            = aws_security_group.task.id
  description                  = "To ${each.key}"
  ip_protocol                  = "tcp"
  from_port                    = each.value.port
  to_port                      = each.value.port
  referenced_security_group_id = each.value.sg
}

resource "aws_vpc_security_group_ingress_rule" "db_from_task" {
  security_group_id            = aws_security_group.db.id
  description                  = "PostgreSQL from the task"
  ip_protocol                  = "tcp"
  from_port                    = 5432
  to_port                      = 5432
  referenced_security_group_id = aws_security_group.task.id
}

resource "aws_vpc_security_group_ingress_rule" "cache_from_task" {
  security_group_id            = aws_security_group.cache.id
  description                  = "Valkey from the task"
  ip_protocol                  = "tcp"
  from_port                    = 6379
  to_port                      = 6379
  referenced_security_group_id = aws_security_group.task.id
}
