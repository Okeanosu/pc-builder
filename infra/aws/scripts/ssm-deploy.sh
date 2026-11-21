#!/usr/bin/env bash
# Runs the pcbuilder-deploy SSM document on the server and waits for it. Used by CI, and by hand for rollbacks and
# for applying changed settings: ssm-deploy.sh <instance-id> <40-char commit sha | current>
set -euo pipefail

usage="usage: ssm-deploy.sh <instance-id> <commit-sha|current>"
instance=${1:?$usage}
tag=${2:?$usage}
[[ $instance =~ ^i-[0-9a-f]{8,17}$ ]] || { echo "$usage" >&2; exit 2; }
[[ $tag =~ ^([0-9a-f]{40}|current)$ ]] || { echo "$usage" >&2; exit 2; }
# shellcheck source=aws-env.sh
. "$(cd "$(dirname "$0")" && pwd)/aws-env.sh"

# shellcheck disable=SC2016 # $LATEST is an SSM keyword, not a shell variable
command_id=$(aws ssm send-command --instance-ids "$instance" --document-name pcbuilder-deploy \
  --document-version '$LATEST' --parameters "imageTag=$tag" --comment "deploy $tag" \
  --query Command.CommandId --output text)
echo "ssm-deploy: command $command_id on $instance"

invocation() {
  aws ssm get-command-invocation --command-id "$command_id" --instance-id "$instance" --query "$1" --output text
}

status=Pending
for _ in $(seq 1 200); do
  sleep 5
  status=$(invocation Status 2>/dev/null || echo Pending)
  case $status in
    Pending | InProgress | Delayed) ;;
    *) break ;;
  esac
done

invocation StandardOutputContent
if [[ $status != Success ]]; then
  invocation StandardErrorContent >&2 || true
  echo "ssm-deploy: $status" >&2
  exit 1
fi
