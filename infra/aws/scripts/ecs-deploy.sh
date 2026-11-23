#!/usr/bin/env bash
# Rolls the ECS service to the images of one commit and waits until the new task is healthy. Used by CI, and by hand
# for rollbacks and for applying changed secrets: ecs-deploy.sh <40-char commit sha | current>
set -euo pipefail

usage="usage: ecs-deploy.sh <commit-sha|current>"
tag=${1:?$usage}
[[ $tag =~ ^([0-9a-f]{40}|current)$ ]] || { echo "$usage" >&2; exit 2; }
here=$(cd "$(dirname "$0")" && pwd)
# shellcheck source=aws-env.sh
. "$here/aws-env.sh"

cluster=pcbuilder
service=pcbuilder-app
family=pcbuilder-app
registry=$(aws sts get-caller-identity --query Account --output text).dkr.ecr.${AWS_REGION}.amazonaws.com

if [[ $tag == current ]]; then
  running=$(aws ecs describe-services --cluster "$cluster" --services "$service" \
    --query 'services[0].taskDefinition' --output text)
  tag=$(aws ecs describe-task-definition --task-definition "$running" | python3 "$here/task-def.py" --tag-of api)
  [[ $tag =~ ^[0-9a-f]{40}$ ]] || { echo "ecs-deploy: nothing deployed yet" >&2; exit 1; }
fi

# The newest revision of the family carries the latest Terraform settings (environment, secrets, size); only the
# image tags change here.
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
aws ecs describe-task-definition --task-definition "$family" |
  python3 "$here/task-def.py" "api=$registry/pcbuilder/api:$tag" "web=$registry/pcbuilder/web:$tag" >"$work/td.json"
new_td=$(aws ecs register-task-definition --cli-input-json "file://$work/td.json" \
  --query 'taskDefinition.taskDefinitionArn' --output text)
echo "ecs-deploy: registered $new_td"

desired=$(aws ecs describe-services --cluster "$cluster" --services "$service" \
  --query 'services[0].desiredCount' --output text)
aws ecs update-service --cluster "$cluster" --service "$service" --task-definition "$new_td" \
  --desired-count "$((desired > 0 ? desired : 1))" >/dev/null
echo "ecs-deploy: rolling $service to $tag"

aws ecs wait services-stable --cluster "$cluster" --services "$service" || true

# The circuit breaker rolls back a failed deployment, after which the service is "stable" on the old revision.
# shellcheck disable=SC2016 # backticks are a JMESPath literal
read -r state current_td < <(aws ecs describe-services --cluster "$cluster" --services "$service" \
  --query 'services[0].deployments[?status==`PRIMARY`] | [0].[rolloutState,taskDefinition]' --output text)
if [[ $state != COMPLETED || $current_td != "$new_td" ]]; then
  echo "ecs-deploy: deployment did not complete (state $state, running $current_td)." >&2
  echo "ecs-deploy: recent events:" >&2
  aws ecs describe-services --cluster "$cluster" --services "$service" \
    --query 'services[0].events[:8].[createdAt,message]' --output text >&2
  exit 1
fi
echo "ecs-deploy: $service runs $tag"
