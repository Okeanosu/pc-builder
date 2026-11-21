#!/usr/bin/env bash
# Run as root by the pcbuilder-deploy SSM document: render .env, pull from ECR, restart, wait for health.
# Usage: deploy.sh <40-char commit sha>  (deploy or roll back)
#        deploy.sh current               (restart the running commit with fresh settings, e.g. after a rotation)
set -euo pipefail

requested="${1:-}"
cd /opt/pcbuilder
if [[ $requested == current ]]; then
  requested=$(cat current-tag 2>/dev/null || true)
fi
if [[ ! $requested =~ ^[0-9a-f]{40}$ ]]; then
  echo "usage: deploy.sh <commit sha>|current (nothing deployed yet?)" >&2
  exit 2
fi

IMAGE_TAG=$requested
# shellcheck source=lib.sh
. /opt/pcbuilder/bin/lib.sh

/opt/pcbuilder/bin/render-env.sh

aws ecr get-login-password --region "$AWS_REGION" |
  docker login --username AWS --password-stdin "$REGISTRY" >/dev/null
# The ECR token lasts 12 hours; do not leave it in /root/.docker/config.json.
trap 'docker logout "$REGISTRY" >/dev/null 2>&1 || true' EXIT

env_value() { sed -n "s/^$1='\(.*\)'\$/\1/p" .env; }

# Postgres reads POSTGRES_PASSWORD only when it creates the database, so a rotated password must be re-applied to
# the role before the API restarts with it. Sent over stdin (never a command line) through the container's trusted
# local socket; a no-op when nothing changed.
sync_db_password() {
  compose ps --status running --services 2>/dev/null | grep -qx postgres || return 0
  local user password
  user=$(env_value POSTGRES_USER)
  password=$(env_value POSTGRES_PASSWORD)
  [[ $user =~ ^[a-z_][a-z0-9_]*$ && $password =~ ^[A-Za-z0-9._~-]+$ ]] || {
    echo "deploy: POSTGRES_USER or POSTGRES_PASSWORD has characters that are unsafe in DATABASE_URL" >&2
    return 1
  }
  printf "ALTER ROLE %s PASSWORD '%s';\n" "$user" "$password" |
    compose exec -T postgres psql --quiet -v ON_ERROR_STOP=1 -U "$user" -d "$(env_value POSTGRES_DB)" >/dev/null
}

echo "deploy: pulling $IMAGE_TAG"
compose pull --quiet
sync_db_password

echo "deploy: starting"
if ! compose up --detach --remove-orphans --wait --wait-timeout 300; then
  echo "deploy: a service did not become healthy; recent logs:" >&2
  compose ps >&2 || true
  compose logs --no-color --tail 60 api web >&2 || true
  exit 1
fi

previous=$(cat current-tag 2>/dev/null || true)
if [[ -n $previous && $previous != "$IMAGE_TAG" ]]; then
  echo "$previous" >previous-tag
fi
echo "$IMAGE_TAG" >current-tag

docker image prune --all --force >/dev/null
compose ps
echo "deploy: running $IMAGE_TAG"
