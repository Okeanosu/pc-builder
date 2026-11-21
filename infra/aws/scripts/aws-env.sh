# Sourced by the operator scripts. On a laptop: pin profile and region to terraform.tfvars (an ambient AWS_PROFILE,
# e.g. a work account, is ignored) and stop unless that profile is the project account. CI's OIDC role needs neither.
# shellcheck shell=bash

if [[ ${GITHUB_ACTIONS:-} != true ]]; then
  _tfvars="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../terraform/terraform.tfvars"
  [[ -f $_tfvars ]] || { echo "Missing $_tfvars (copy terraform.tfvars.example and fill it in first)." >&2; exit 1; }
  _tfvar() { sed -nE "s/^[[:space:]]*$1[[:space:]]*=[[:space:]]*\"([^\"]*)\".*/\1/p" "$_tfvars" | head -n 1; }

  PCBUILDER_ACCOUNT_ID=$(_tfvar aws_account_id)
  AWS_PROFILE=${PCBUILDER_AWS_PROFILE:-$(_tfvar aws_profile)}
  AWS_PROFILE=${AWS_PROFILE:-pcbuilder}
  AWS_REGION=$(_tfvar region)
  AWS_REGION=${AWS_REGION:-ap-southeast-1}
  export AWS_PROFILE AWS_REGION
  unset AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY AWS_SESSION_TOKEN AWS_DEFAULT_PROFILE

  _actual=$(aws sts get-caller-identity --query Account --output text) || {
    echo "Cannot use profile '$AWS_PROFILE'. Log in first: aws sso login --profile $AWS_PROFILE" >&2
    exit 1
  }
  if [[ $_actual != "$PCBUILDER_ACCOUNT_ID" ]]; then
    echo "Refusing: profile '$AWS_PROFILE' is account $_actual but terraform.tfvars names $PCBUILDER_ACCOUNT_ID." >&2
    exit 1
  fi
  unset _tfvars _actual
fi
export AWS_PAGER=""
