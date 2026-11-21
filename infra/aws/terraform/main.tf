locals {
  name       = "pcbuilder"
  account_id = var.aws_account_id
  param_path = "/${local.name}/prod"
  registry   = "${local.account_id}.dkr.ecr.${var.region}.amazonaws.com"

  # Values the host scripts need. Nothing secret: secrets are read from Parameter Store at deploy time.
  host_env = <<-EOT
    AWS_REGION=${var.region}
    PARAM_PATH=${local.param_path}
    REGISTRY=${local.registry}
    API_IMAGE=${aws_ecr_repository.app["api"].repository_url}
    WEB_IMAGE=${aws_ecr_repository.app["web"].repository_url}
    BACKUP_BUCKET=${aws_s3_bucket.backups.bucket}
    METRIC_NAMESPACE=${local.metric_namespace}
  EOT

  metric_namespace = "PCBuilder"
}

data "aws_availability_zones" "available" {
  state = "available"
}

# Latest Amazon Linux 2023 for arm64. The instance ignores later AMI changes (see compute.tf), so a newer image does
# not replace the running server; the OS keeps itself patched with dnf-automatic instead.
data "aws_ami" "al2023" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-2023.*-kernel-*-arm64"]
  }

  filter {
    name   = "architecture"
    values = ["arm64"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}
