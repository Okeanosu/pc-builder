variable "aws_account_id" {
  description = "12-digit ID of the dedicated personal AWS account. Terraform refuses to touch any other account."
  type        = string

  validation {
    condition     = can(regex("^[0-9]{12}$", var.aws_account_id))
    error_message = "aws_account_id must be the 12-digit account ID."
  }
}

variable "aws_profile" {
  description = "AWS CLI profile (IAM Identity Center / SSO) of the personal account."
  type        = string
  default     = "pcbuilder"
}

variable "region" {
  description = "AWS region. Singapore is the closest region to Vietnam with every service used here."
  type        = string
  default     = "ap-southeast-1"
}

variable "custom_domain" {
  description = "Optional own host name (e.g. shop.example.com). Empty = use the CloudFront domain (d123.cloudfront.net)."
  type        = string
  default     = ""
}

variable "custom_domain_certificate_arn" {
  description = "ACM certificate for custom_domain, issued in us-east-1 (CloudFront only reads certificates from there)."
  type        = string
  default     = ""

  validation {
    condition     = var.custom_domain_certificate_arn == "" || can(regex("^arn:aws:acm:us-east-1:", var.custom_domain_certificate_arn))
    error_message = "The certificate must be in us-east-1."
  }
}

variable "task_cpu" {
  description = "Fargate CPU units for the task running web + api (512 = 0.5 vCPU). Raise to 1024 if pages feel slow."
  type        = number
  default     = 512
}

variable "task_memory" {
  description = "Fargate memory (MiB) for the task running web + api."
  type        = number
  default     = 1024
}

variable "db_instance_class" {
  description = "RDS PostgreSQL instance class."
  type        = string
  default     = "db.t4g.micro"
}

variable "db_storage_gb" {
  description = "RDS storage (gp3)."
  type        = number
  default     = 20
}

variable "cache_node_type" {
  description = "ElastiCache Valkey node type."
  type        = string
  default     = "cache.t4g.micro"
}

variable "deletion_protection" {
  description = "Block deleting the database and load balancer. Set to false (and apply) before terraform destroy."
  type        = bool
  default     = true
}

variable "github_repository" {
  description = "owner/name of the GitHub repository whose workflow may deploy."
  type        = string
  default     = "yamadaOliva/pc-builder"
}

variable "github_environment" {
  description = "GitHub environment the deploy job runs in. Only jobs in this environment can assume the deploy role."
  type        = string
  default     = "production"
}

variable "create_github_oidc_provider" {
  description = "Create the GitHub OIDC identity provider. Set to false if the account already has one."
  type        = bool
  default     = true
}

variable "alert_email" {
  description = "Email that receives alarms (site down, database disk) and budget warnings."
  type        = string
}

variable "monthly_budget_usd" {
  description = "Monthly cost budget. Email at 80% of actual spend and when the forecast passes 100%."
  type        = number
  default     = 100
}

# Non-secret API settings, passed to the container as plain environment variables.
variable "app_settings" {
  description = "Non-secret API settings (see apps/api/src/config/env.ts)."
  type        = map(string)
  default = {
    ASSEMBLY_FEE        = "200000"
    ORDER_HOLD_MINUTES  = "15"
    GEMINI_MODEL        = "gemini-flash-latest"
    GEMINI_TIMEOUT_MS   = "20000"
    VIETQR_BANK_BIN     = "970422"
    VIETQR_ACCOUNT_NAME = "PC BUILDER STORE"
  }

  # Secrets set here would end up in plain text in terraform.tfstate and in the task definition.
  validation {
    condition = alltrue([
      for key in keys(var.app_settings) : can(regex("^[A-Z][A-Z0-9_]*$", key)) && !contains([
        "POSTGRES_PASSWORD", "PGPASSWORD", "JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET", "SEPAY_API_KEY",
        "GEMINI_API_KEY", "VIETQR_ACCOUNT_NO", "DATABASE_URL", "REDIS_URL", "SEED_ADMIN_PASSWORD",
      ], key)
    ])
    error_message = "app_settings must not contain secrets (use scripts/secrets.sh) and keys must be UPPER_SNAKE_CASE."
  }
}
