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
# 1) Hashed, content-addressed files under assets/ never change → cache forever.
aws s3 sync dist/assets/ "s3://$S3_BUCKET/assets" --delete \
  --cache-control "public,max-age=31536000,immutable"
# 2) Unhashed files (favicons, images, news.json, …) reuse their names across
#    deploys, so they must revalidate — a short TTL avoids serving a year-stale
#    copy after a redeploy (CloudFront invalidation only clears the edge, not
#    browsers that already cached an immutable copy).
aws s3 sync dist/ "s3://$S3_BUCKET" --delete --exclude "assets/*" --exclude "index.html" \
  --cache-control "public,max-age=300,must-revalidate"
# 3) index.html: never cache, so a new deploy is picked up immediately.
aws s3 cp dist/index.html "s3://$S3_BUCKET/index.html" \
  --cache-control "no-cache,no-store,must-revalidate" --content-type text/html

echo "==> Invalidating CloudFront $CF_DISTRIBUTION_ID"
aws cloudfront create-invalidation \
  --distribution-id "$CF_DISTRIBUTION_ID" \
  --paths "/*" >/dev/null

echo "==> Done. Live at https://27markets.com (allow ~1 min for the CDN)."
