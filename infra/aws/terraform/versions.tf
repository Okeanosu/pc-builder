terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }

  # State stays on the operator's machine (gitignored). It holds resource IDs only: secret values are written to
  # Parameter Store by scripts/secrets.sh and never pass through Terraform.
}

provider "aws" {
  region  = var.region
  profile = var.aws_profile

  # Refuse to run against any other account, so a leftover AWS_PROFILE (a work account, say) can never receive
  # these resources or have its own resources changed.
  allowed_account_ids = [var.aws_account_id]

  default_tags {
    tags = {
      Project   = local.name
      ManagedBy = "terraform"
    }
  }
}
