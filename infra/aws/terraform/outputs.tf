output "site_url" {
  description = "Public address of the shop."
  value       = "https://${local.site_domain}"
}

output "cloudfront_domain" {
  description = "CloudFront host name. With a custom domain, point a CNAME (or ALIAS) record at it."
  value       = aws_cloudfront_distribution.site.domain_name
}

output "github_variables" {
  description = "Repository variables for .github/workflows/deploy-aws.yml (Settings > Secrets and variables > Actions > Variables). None of them is secret."
  value = {
    AWS_REGION          = var.region
    AWS_DEPLOY_ROLE_ARN = aws_iam_role.github_deploy.arn
    ECR_REGISTRY        = local.registry
    DOMAIN              = local.site_domain
  }
}

output "parameter_path" {
  description = "Parameter Store path that holds the secrets."
  value       = local.param_path
}

output "database" {
  description = "RDS instance identifier (backups: RDS console > Automated backups)."
  value       = aws_db_instance.main.identifier
}
