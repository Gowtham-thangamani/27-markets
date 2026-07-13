#!/bin/sh
# Nightly production DB backup, run ON the EC2 host (via cron) — streams a
# compressed pg_dump straight to S3 using the instance's IAM role (no stored
# keys). Inbound SSH stays firewalled; only outbound EC2 -> S3 is used.
#
# Install (already done once): scp to ~/backup-db.sh, chmod +x, and add cron:
#   0 3 * * * /home/ec2-user/backup-db.sh >> /home/ec2-user/backup.log 2>&1
# The bucket has versioning + AES256 + a 90-day lifecycle.
set -eu

BUCKET="${BACKUP_S3_BUCKET:-27markets-db-backups}"
REGION="${AWS_REGION:-eu-north-1}"
STAMP="$(date -u +%Y-%m-%d_%H%M%S)"
KEY="db-backups/apex_markets/${STAMP}.sql.gz"

docker exec apex_postgres sh -c 'PGPASSWORD=$POSTGRES_PASSWORD pg_dump -U apex -d apex_markets' \
  | gzip -9 \
  | aws s3 cp - "s3://${BUCKET}/${KEY}" --sse AES256 --region "${REGION}"

echo "$(date -u +%FT%TZ) backup ok -> s3://${BUCKET}/${KEY}"
