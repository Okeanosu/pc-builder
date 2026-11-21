# Shared by the host scripts in /opt/pcbuilder/bin (sourced, not run). Sets the variables compose.yml needs and
# defines `compose`, which always targets the production project.
# shellcheck shell=bash

cd /opt/pcbuilder || exit 1

# shellcheck source=/dev/null
. ./host.env
export API_IMAGE WEB_IMAGE

IMAGE_TAG="${IMAGE_TAG:-$(cat current-tag 2>/dev/null || true)}"
export IMAGE_TAG

compose() {
  docker compose --project-name pcbuilder --file compose.yml --env-file .env "$@"
}
