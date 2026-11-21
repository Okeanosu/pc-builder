#!/usr/bin/env bash
# Dumps the database to s3://$BACKUP_BUCKET/postgres/ (pg_dump custom format) and reports success to CloudWatch.
# Started by pcbuilder-backup.timer; the backup-missing alarm fires after 24 hours without one. Restore steps are in
# docs/deploy-aws.md.
set -euo pipefail
# shellcheck source=lib.sh
. /opt/pcbuilder/bin/lib.sh

key="postgres/pcbuilder-$(date -u +%Y%m%dT%H%M%SZ).dump"

# The dump streams straight to S3; nothing is written to the server disk.
# shellcheck disable=SC2016 # the variables expand inside the postgres container
compose exec -T postgres sh -c 'pg_dump --format=custom --username="$POSTGRES_USER" --dbname="$POSTGRES_DB"' |
  aws s3 cp - "s3://$BACKUP_BUCKET/$key" --region "$AWS_REGION" --only-show-errors

aws cloudwatch put-metric-data --region "$AWS_REGION" --namespace "$METRIC_NAMESPACE" \
  --metric-name BackupSucceeded --value 1 --unit Count
echo "backup: wrote s3://$BACKUP_BUCKET/$key"
