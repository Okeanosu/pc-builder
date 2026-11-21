############################################
# Settings in Parameter Store
############################################
# Non-secret settings only. Secrets (POSTGRES_PASSWORD, JWT_*, SEPAY_API_KEY, GEMINI_API_KEY, VIETQR_ACCOUNT_NO)
# are written as SecureString by scripts/secrets.sh, so their values never appear in Terraform state or plans.

resource "aws_ssm_parameter" "setting" {
  for_each = merge(var.app_settings, { DOMAIN = var.domain })

  name  = "${local.param_path}/${each.key}"
  type  = "String"
  value = each.value
}

############################################
# Deploy document
############################################
# The only command CI may run on the server. Each run rewrites the stack files from this repository (so
# compose.yml, the Caddyfile and the host scripts follow terraform apply) and then calls deploy.sh with one commit
# SHA. The parameter pattern keeps anything else out of the shell.

locals {
  host_files = {
    "compose.yml"       = { source = "${path.module}/../compose.yml", mode = "0600" }
    "Caddyfile"         = { source = "${path.module}/../Caddyfile", mode = "0644" }
    "bin/lib.sh"        = { source = "${path.module}/../host/lib.sh", mode = "0600" }
    "bin/render-env.sh" = { source = "${path.module}/../host/render-env.sh", mode = "0700" }
    "bin/deploy.sh"     = { source = "${path.module}/../host/deploy.sh", mode = "0700" }
    "bin/backup.sh"     = { source = "${path.module}/../host/backup.sh", mode = "0700" }
    "bin/seed.sh"       = { source = "${path.module}/../host/seed.sh", mode = "0700" }
  }

  write_host_files = concat(
    [for path, file in local.host_files : join(" ", [
      "echo '${filebase64(file.source)}' | base64 -d > /opt/pcbuilder/${path}.tmp",
      "&& chmod ${file.mode} /opt/pcbuilder/${path}.tmp",
      "&& mv -f /opt/pcbuilder/${path}.tmp /opt/pcbuilder/${path}",
    ])],
    [
      "echo '${base64encode(local.host_env)}' | base64 -d > /opt/pcbuilder/host.env.tmp && chmod 0600 /opt/pcbuilder/host.env.tmp && mv -f /opt/pcbuilder/host.env.tmp /opt/pcbuilder/host.env",
    ],
  )
}

resource "aws_ssm_document" "deploy" {
  name            = "${local.name}-deploy"
  document_type   = "Command"
  document_format = "JSON"

  content = jsonencode({
    schemaVersion = "2.2"
    description   = "Deploy PC Builder: refresh the stack files, then run the images of one commit."
    parameters = {
      imageTag = {
        type           = "String"
        description    = "Full git commit SHA of the images to run, or 'current' to restart the running one with fresh settings."
        allowedPattern = "^([0-9a-f]{40}|current)$"
      }
    }
    mainSteps = [{
      action = "aws:runShellScript"
      name   = "deploy"
      inputs = {
        timeoutSeconds = "900"
        runCommand = concat(
          ["set -eu", "install -d -m 0700 /opt/pcbuilder /opt/pcbuilder/bin"],
          local.write_host_files,
          ["exec /opt/pcbuilder/bin/deploy.sh '{{ imageTag }}'"],
        )
      }
    }]
  })
}
