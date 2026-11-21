#!/usr/bin/env bash
# Manages the application secrets in Parameter Store (SecureString) from the operator's machine. Values are generated
# here or typed without echo, and go to AWS through a 0600 temp file: never the terminal, history, git, CI or tfstate.
set -euo pipefail
umask 077

usage() {
  cat <<'EOF'
Usage: infra/aws/scripts/secrets.sh <command> [NAME]
  init          create every missing secret: random ones are generated, the others are asked for
  set NAME      type a new value for NAME (input hidden)
  rotate NAME   replace a generated secret with a new random value
  copy NAME     copy a value to the clipboard (SEPAY_API_KEY for the SePay dashboard)
  list          names, types and dates; never values
Profile, region and account come from terraform.tfvars (a shell AWS_PROFILE is ignored); other accounts are refused.
Apply a change on the server with: infra/aws/scripts/ssm-deploy.sh <instance-id> current
EOF
}

GENERATED=(POSTGRES_PASSWORD JWT_ACCESS_SECRET JWT_REFRESH_SECRET SEPAY_API_KEY)
TYPED=(VIETQR_ACCOUNT_NO GEMINI_API_KEY)
PARAM_PATH=/pcbuilder/prod

here=$(cd "$(dirname "$0")" && pwd)

in_list() {
  local needle=$1
  shift
  local item
  for item in "$@"; do [[ $item == "$needle" ]] && return 0; done
  return 1
}

check_account() {
  # shellcheck source=aws-env.sh
  . "$here/aws-env.sh"
}

exists() {
  aws ssm get-parameter --name "$PARAM_PATH/$1" --query Parameter.Name --output text >/dev/null 2>&1
}

put() {
  local name=$1 value=$2 dir status=0
  dir=$(mktemp -d)
  printf '%s' "$value" >"$dir/value"
  aws ssm put-parameter --name "$PARAM_PATH/$name" --type SecureString --value "file://$dir/value" --overwrite \
    >/dev/null || status=$?
  rm -rf "$dir"
  return "$status"
}

validate() {
  local name=$1 value=$2
  case $name in
    VIETQR_ACCOUNT_NO)
      [[ $value =~ ^[0-9]{6,19}$ ]] || { echo "$name must be 6-19 digits." >&2; return 1; } ;;
    POSTGRES_PASSWORD)
      # It is embedded unescaped in DATABASE_URL.
      [[ $value =~ ^[A-Za-z0-9._~-]{24,}$ ]] || {
        echo "$name must be 24+ characters of A-Z a-z 0-9 . _ ~ -" >&2
        return 1
      } ;;
    JWT_ACCESS_SECRET | JWT_REFRESH_SECRET | SEPAY_API_KEY)
      ((${#value} >= 32)) || { echo "$name must be at least 32 characters (the API refuses shorter)." >&2; return 1; } ;;
  esac
  [[ $value != *"'"* && $value != *$'\n'* ]] || { echo "$name cannot contain a quote or a newline." >&2; return 1; }
}

ask() {
  local name=$1 value
  if [[ $name == VIETQR_ACCOUNT_NO ]]; then
    read -r -p "VIETQR_ACCOUNT_NO (bank account that receives payments): " value
  else
    read -r -s -p "$name (input hidden${2:+, $2}): " value
    echo
  fi
  if [[ -z $value && $name == GEMINI_API_KEY ]]; then
    echo "  $name: skipped (chatbot runs rule-based until it is set)"
    return 0
  fi
  validate "$name" "$value"
  put "$name" "$value"
  echo "  $name: saved"
}

command=${1:-}
name=${2:-}
case $command in
  init)
    check_account
    for name in "${GENERATED[@]}"; do
      if exists "$name"; then
        echo "  $name: exists, kept"
      else
        put "$name" "$(openssl rand -hex 32)"
        echo "  $name: generated"
      fi
    done
    for name in "${TYPED[@]}"; do
      if exists "$name"; then
        echo "  $name: exists, kept"
      else
        ask "$name" "empty = skip"
      fi
    done
    ;;
  set)
    in_list "$name" "${GENERATED[@]}" "${TYPED[@]}" || { usage >&2; exit 2; }
    check_account
    ask "$name"
    ;;
  rotate)
    in_list "$name" "${GENERATED[@]}" || { echo "rotate works on: ${GENERATED[*]}" >&2; exit 2; }
    check_account
    put "$name" "$(openssl rand -hex 32)"
    echo "  $name: rotated. Apply it with ssm-deploy.sh <instance-id> current"
    ;;
  copy)
    in_list "$name" "${GENERATED[@]}" "${TYPED[@]}" || { usage >&2; exit 2; }
    command -v pbcopy >/dev/null || { echo "copy needs pbcopy (macOS)." >&2; exit 1; }
    check_account
    aws ssm get-parameter --name "$PARAM_PATH/$name" --with-decryption --query Parameter.Value --output text |
      tr -d '\n' | pbcopy
    echo "  $name copied to the clipboard. Paste it, then copy something else to clear it."
    ;;
  list)
    check_account
    aws ssm get-parameters-by-path --path "$PARAM_PATH" --recursive \
      --query 'Parameters[].[Name,Type,LastModifiedDate]' --output table
    ;;
  *)
    usage
    [[ $command == -h || $command == --help ]] || exit 2
    ;;
esac
