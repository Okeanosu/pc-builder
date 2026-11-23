#!/usr/bin/env bash
# One-off: wipe products, orders and users, load the sample catalogue and create admin@pcbuilder.vn (deployed image).
# The admin password is typed hidden and lives in Parameter Store only during the run; ECS injects it as a secret, so
# it never appears in an API call or log.
set -euo pipefail
umask 077
here=$(cd "$(dirname "$0")" && pwd)
# shellcheck source=aws-env.sh
. "$here/aws-env.sh"

cluster=pcbuilder
param=/pcbuilder/prod/SEED_ADMIN_PASSWORD

read -r -p "This deletes every product, order and account, then loads the sample data. Type SEED to continue: " answer
[[ $answer == SEED ]] || { echo "Cancelled."; exit 1; }
read -r -s -p "New password for admin@pcbuilder.vn (at least 12 characters): " password
echo
read -r -s -p "Repeat it: " repeat
echo
[[ $password == "$repeat" ]] || { echo "The two entries differ." >&2; exit 1; }
((${#password} >= 12)) || { echo "Too short." >&2; exit 1; }

work=$(mktemp -d)
cleanup() {
  aws ssm delete-parameter --name "$param" >/dev/null 2>&1 || true
  rm -rf "$work"
}
trap cleanup EXIT

printf '%s' "$password" >"$work/value"
unset password repeat
aws ssm put-parameter --name "$param" --type SecureString --value "file://$work/value" --overwrite >/dev/null
rm -f "$work/value"

# Same image as the running service.
running=$(aws ecs describe-services --cluster "$cluster" --services pcbuilder-app \
  --query 'services[0].taskDefinition' --output text)
image_tag=$(aws ecs describe-task-definition --task-definition "$running" | python3 "$here/task-def.py" --tag-of api)
[[ $image_tag =~ ^[0-9a-f]{40}$ ]] || { echo "Deploy the app first (nothing is running yet)." >&2; exit 1; }
registry=$(aws sts get-caller-identity --query Account --output text).dkr.ecr.${AWS_REGION}.amazonaws.com
aws ecs describe-task-definition --task-definition pcbuilder-seed |
  python3 "$here/task-def.py" "api=$registry/pcbuilder/api:$image_tag" >"$work/td.json"
seed_td=$(aws ecs register-task-definition --cli-input-json "file://$work/td.json" \
  --query 'taskDefinition.taskDefinitionArn' --output text)

network=$(aws ecs describe-services --cluster "$cluster" --services pcbuilder-app \
  --query 'services[0].networkConfiguration' --output json)
task=$(aws ecs run-task --cluster "$cluster" --task-definition "$seed_td" --launch-type FARGATE \
  --network-configuration "$network" --query 'tasks[0].taskArn' --output text)
echo "seed: started ${task##*/}, waiting (about 1-2 minutes)..."
aws ecs wait tasks-stopped --cluster "$cluster" --tasks "$task"

exit_code=$(aws ecs describe-tasks --cluster "$cluster" --tasks "$task" \
  --query 'tasks[0].containers[0].exitCode' --output text)
aws logs get-log-events --log-group-name /ecs/pcbuilder --log-stream-name "api/api/${task##*/}" \
  --query 'events[].message' --output text 2>/dev/null | tr '\t' '\n' | tail -n 20 || true
if [[ $exit_code != 0 ]]; then
  echo "seed: failed (exit $exit_code)" >&2
  exit 1
fi
echo "seed: done. Log in as admin@pcbuilder.vn with the password you typed."
