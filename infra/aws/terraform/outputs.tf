output "public_ip" {
  description = "Elastic IP of the server. Point the domain's A record here."
  value       = aws_eip.app.public_ip
}

output "instance_id" {
  description = "EC2 instance ID (GitHub variable AWS_INSTANCE_ID; target of aws ssm start-session)."
  value       = aws_instance.app.id
}

output "github_variables" {
  description = "Repository variables for .github/workflows/deploy-aws.yml (Settings > Secrets and variables > Actions > Variables). None of them is secret."
  value = {
    AWS_REGION          = var.region
    AWS_DEPLOY_ROLE_ARN = aws_iam_role.github_deploy.arn
    AWS_INSTANCE_ID     = aws_instance.app.id
    ECR_REGISTRY        = local.registry
    DOMAIN              = var.domain
  }
}

output "parameter_path" {
  description = "Parameter Store path that holds the settings and secrets."
  value       = local.param_path
}

output "backup_bucket" {
  description = "S3 bucket with the database dumps."
  value       = aws_s3_bucket.backups.bucket
}
