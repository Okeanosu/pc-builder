locals {
  name       = "pcbuilder"
  account_id = var.aws_account_id
  param_path = "/${local.name}/prod"
  registry   = "${local.account_id}.dkr.ecr.${var.region}.amazonaws.com"
  azs        = slice(data.aws_availability_zones.available.names, 0, 2)

  # The public host name: the custom domain when set, otherwise the CloudFront one.
  site_domain = var.custom_domain != "" ? var.custom_domain : aws_cloudfront_distribution.site.domain_name

  # Secrets injected into the api container from Parameter Store (SecureString, written by scripts/secrets.sh).
  # PGPASSWORD is read by postgres.js, so DATABASE_URL itself carries no password.
  api_secrets = {
    PGPASSWORD         = "POSTGRES_PASSWORD"
    JWT_ACCESS_SECRET  = "JWT_ACCESS_SECRET"
    JWT_REFRESH_SECRET = "JWT_REFRESH_SECRET"
    SEPAY_API_KEY      = "SEPAY_API_KEY"
    VIETQR_ACCOUNT_NO  = "VIETQR_ACCOUNT_NO"
    GEMINI_API_KEY     = "GEMINI_API_KEY"
  }
}

data "aws_availability_zones" "available" {
  state = "available"
}
