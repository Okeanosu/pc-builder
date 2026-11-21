#!/usr/bin/env bash
# Writes /opt/pcbuilder/.env from Parameter Store (every parameter under PARAM_PATH, SecureStrings decrypted).
# The file is root-only (0600) and rewritten on each deploy, so a changed or rotated secret takes effect at the next
# deploy. Values are never printed.
set -euo pipefail
cd /opt/pcbuilder
# shellcheck source=/dev/null
. ./host.env

required=(DOMAIN POSTGRES_USER POSTGRES_DB POSTGRES_PASSWORD JWT_ACCESS_SECRET JWT_REFRESH_SECRET SEPAY_API_KEY
  VIETQR_ACCOUNT_NO)

umask 077
tmp=$(mktemp /opt/pcbuilder/.env.XXXXXX)
trap 'rm -f "$tmp"' EXIT

aws ssm get-parameters-by-path --region "$AWS_REGION" --path "$PARAM_PATH" --recursive --with-decryption \
  --query 'Parameters[].[Name,Value]' --output text |
  while IFS=$'\t' read -r name value; do
    key=${name##*/}
    if [[ ! $key =~ ^[A-Z][A-Z0-9_]*$ ]]; then
      echo "render-env: skipping parameter with an invalid name: $name" >&2
      continue
    fi
    # Single-quoted values are taken literally by Compose (no $ interpolation), so a quote cannot be represented.
    if [[ $value == *"'"* ]]; then
      echo "render-env: $key contains a single quote, which .env cannot hold" >&2
      exit 1
    fi
    printf "%s='%s'\n" "$key" "$value"
  done >"$tmp"

missing=()
for key in "${required[@]}"; do
  grep -q "^$key=" "$tmp" || missing+=("$key")
done
if ((${#missing[@]})); then
  echo "render-env: missing in $PARAM_PATH: ${missing[*]} (run infra/aws/scripts/secrets.sh init)" >&2
  exit 1
fi

mv -f "$tmp" .env
trap - EXIT
echo "render-env: wrote $(wc -l <.env | tr -d ' ') settings to /opt/pcbuilder/.env"
