############################################
# Server role: what the EC2 host itself may do
############################################

data "aws_iam_policy_document" "ec2_trust" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "app" {
  name               = "${local.name}-server"
  description        = "PC Builder EC2 host: SSM agent, read its own secrets, pull images, write backups"
  assume_role_policy = data.aws_iam_policy_document.ec2_trust.json
}

resource "aws_iam_instance_profile" "app" {
  name = "${local.name}-server"
  role = aws_iam_role.app.name
}

# Lets the SSM agent register, run the deploy document and open Session Manager shells.
resource "aws_iam_role_policy_attachment" "ssm_core" {
  role       = aws_iam_role.app.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

locals {
  param_arns = [
    "arn:aws:ssm:${var.region}:${local.account_id}:parameter${local.param_path}",
    "arn:aws:ssm:${var.region}:${local.account_id}:parameter${local.param_path}/*",
  ]
}

data "aws_iam_policy_document" "app" {
  statement {
    sid       = "ReadOwnSettings"
    actions   = ["ssm:GetParametersByPath", "ssm:GetParameters", "ssm:GetParameter"]
    resources = local.param_arns
  }

  # AmazonSSMManagedInstanceCore grants ssm:GetParameter(s) on every parameter. Narrow it back to this
  # project's path, so the host cannot read anything else that is ever stored in the account.
  statement {
    sid           = "NoOtherParameters"
    effect        = "Deny"
    actions       = ["ssm:GetParameter", "ssm:GetParameters", "ssm:GetParametersByPath", "ssm:GetParameterHistory"]
    not_resources = local.param_arns
  }

  statement {
    sid       = "EcrLogin"
    actions   = ["ecr:GetAuthorizationToken"]
    resources = ["*"]
  }

  statement {
    sid       = "PullImages"
    actions   = ["ecr:BatchGetImage", "ecr:GetDownloadUrlForLayer", "ecr:BatchCheckLayerAvailability"]
    resources = [for repo in aws_ecr_repository.app : repo.arn]
  }

  # Write-only: a compromised host can add dumps but cannot read, list or delete existing ones, and versioning
  # keeps the previous object if it overwrites a key.
  statement {
    sid       = "WriteBackups"
    actions   = ["s3:PutObject", "s3:AbortMultipartUpload"]
    resources = ["${aws_s3_bucket.backups.arn}/postgres/*"]
  }

  statement {
    sid       = "BackupHeartbeat"
    actions   = ["cloudwatch:PutMetricData"]
    resources = ["*"]
    condition {
      test     = "StringEquals"
      variable = "cloudwatch:namespace"
      values   = [local.metric_namespace]
    }
  }
}

resource "aws_iam_role_policy" "app" {
  name   = "${local.name}-server"
  role   = aws_iam_role.app.id
  policy = data.aws_iam_policy_document.app.json
}
