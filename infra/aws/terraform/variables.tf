variable "aws_account_id" {
  description = "12-digit ID of the dedicated AWS account for this project. Terraform refuses to touch any other account."
  type        = string

  validation {
    condition     = can(regex("^[0-9]{12}$", var.aws_account_id))
    error_message = "aws_account_id must be the 12-digit account ID."
  }
}

variable "aws_profile" {
  description = "AWS CLI profile (IAM Identity Center / SSO) used to run Terraform."
  type        = string
  default     = "pcbuilder"
}

variable "region" {
  description = "AWS region. Singapore is the closest region to Vietnam with every service used here."
  type        = string
  default     = "ap-southeast-1"
}

variable "domain" {
  description = "Public host name of the shop, e.g. shop.example.com. Its A record must point at the Elastic IP."
  type        = string

  validation {
    condition     = can(regex("^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$", var.domain))
    error_message = "domain must be a lowercase host name such as shop.example.com (no scheme, no port)."
  }
}

variable "instance_type" {
  description = "Graviton (arm64) instance type. t4g.small (2 vCPU, 2 GiB) is the smallest that runs the whole stack."
  type        = string
  default     = "t4g.small"

  validation {
    condition     = can(regex("^[a-z]+[0-9]+g[a-z]*\\.", var.instance_type))
    error_message = "Images are built for arm64, so instance_type must be a Graviton type (t4g, m7g, c7g, ...)."
  }
}

variable "root_volume_gb" {
  description = "Size of the encrypted gp3 root volume (OS, Docker images, database, logs)."
  type        = number
  default     = 20
}

variable "termination_protection" {
  description = "Block accidental termination of the server. Set to false (and apply) before terraform destroy."
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
  description = "Email that receives alarms (server down, backup missing) and budget warnings."
  type        = string
}

variable "monthly_budget_usd" {
  description = "Monthly cost budget. Email at 80% of actual spend and when the forecast passes 100%."
  type        = number
  default     = 25
}

variable "backup_retention_days" {
  description = "Days to keep database dumps in S3."
  type        = number
  default     = 30
}

variable "snapshot_retention_count" {
  description = "Number of daily EBS snapshots of the server disk to keep."
  type        = number
  default     = 7
}

# Non-secret application settings. They are stored as plain String parameters next to the secrets.
variable "app_settings" {
  description = "Non-secret API settings written to Parameter Store (see apps/api/src/config/env.ts)."
  type        = map(string)
  default = {
    POSTGRES_USER       = "pc"
    POSTGRES_DB         = "pcbuilder"
    ASSEMBLY_FEE        = "200000"
    ORDER_HOLD_MINUTES  = "15"
    GEMINI_MODEL        = "gemini-flash-latest"
    GEMINI_TIMEOUT_MS   = "20000"
    VIETQR_BANK_BIN     = "970422"
    VIETQR_ACCOUNT_NAME = "PC BUILDER STORE"
  }

  # Secrets set here would end up in plain text in terraform.tfstate.
  validation {
    condition = alltrue([
      for key in keys(var.app_settings) : can(regex("^[A-Z][A-Z0-9_]*$", key)) && !contains([
        "POSTGRES_PASSWORD", "JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET", "SEPAY_API_KEY", "GEMINI_API_KEY",
        "VIETQR_ACCOUNT_NO", "DOMAIN",
      ], key)
    ])
    error_message = "app_settings must not contain secrets (use scripts/secrets.sh) and keys must be UPPER_SNAKE_CASE."
  }
}
