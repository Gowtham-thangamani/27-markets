#!/usr/bin/env bash
# Build the React app for production and publish it to S3 + invalidate CloudFront.
#
# Prereqs (one-time):
#   - AWS CLI installed and `aws configure` done (or an IAM user/role with S3 +
#     CloudFront permissions).
#   - The S3 bucket and CloudFront distribution already created (see docs/DEPLOYMENT.md).
#
# Usage:
#   S3_BUCKET=27markets-frontend CF_DISTRIBUTION_ID=E1234ABC ./scripts/deploy-frontend.sh
#
set -euo pipefail

: "${S3_BUCKET:?Set S3_BUCKET (the frontend bucket name)}"
: "${CF_DISTRIBUTION_ID:?Set CF_DISTRIBUTION_ID (CloudFront distribution id)}"
# The API the built site talks to. Baked into the bundle at build time.
: "${VITE_API_URL:=https://api.27markets.com/api}"

echo "==> Building frontend with VITE_API_URL=$VITE_API_URL"
export VITE_API_URL
npm run build

echo "==> Syncing dist/ to s3://$S3_BUCKET"
# Long-cache the hashed assets; never cache index.html so new deploys show up.
aws s3 sync dist/ "s3://$S3_BUCKET" --delete \
  --exclude index.html \
  --cache-control "public,max-age=31536000,immutable"
aws s3 cp dist/index.html "s3://$S3_BUCKET/index.html" \
  --cache-control "no-cache,no-store,must-revalidate"

echo "==> Invalidating CloudFront $CF_DISTRIBUTION_ID"
aws cloudfront create-invalidation \
  --distribution-id "$CF_DISTRIBUTION_ID" \
  --paths "/*" >/dev/null

echo "==> Done. Live at https://27markets.com (allow ~1 min for the CDN)."
