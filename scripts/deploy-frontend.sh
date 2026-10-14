#!/usr/bin/env bash
# Build one surface of the React app for production and publish it to S3 +
# invalidate CloudFront.
#
# Each surface (marketing, portal, partner, admin) is a separate bundle on its
# own hostname and its own bucket + distribution. "all" is the combined
# pre-split build that 27markets.com/staging/ still serves.
#
# Prereqs (one-time):
#   - AWS CLI installed and `aws configure` done (or an IAM user/role with S3 +
#     CloudFront permissions).
#   - The S3 bucket and CloudFront distribution already created (see docs/DEPLOYMENT.md).
#
# Usage:
#   SURFACE=admin S3_BUCKET=27markets-admin CF_DISTRIBUTION_ID=E1234ABC \
#     ./scripts/deploy-frontend.sh
#
set -euo pipefail

: "${S3_BUCKET:?Set S3_BUCKET (the frontend bucket name)}"
: "${CF_DISTRIBUTION_ID:?Set CF_DISTRIBUTION_ID (CloudFront distribution id)}"
# Which slice of the app to build. vite.config.ts rejects anything else.
: "${SURFACE:?Set SURFACE: marketing, portal, partner, admin or all}"
# The API the built site talks to. Baked into the bundle at build time.
: "${VITE_API_URL:=https://api.27markets.com/api}"

# Bind each surface to the bucket(s) it is allowed to publish to.
#
# The isolation gate below answers "does this bundle contain only surface X's
# code". It cannot answer "is surface X going to surface X's bucket" — so
# without this table, editing SURFACE but not S3_BUCKET in a recalled command
# publishes the admin CRM to the public apex bucket and invalidates the CDN
# immediately. Separate buckets only help if the pairing is enforced.
case "$SURFACE" in
  marketing) ALLOWED_BUCKETS="27markets-preview 27markets-frontend" ;;
  portal)    ALLOWED_BUCKETS="27markets-portal" ;;
  partner)   ALLOWED_BUCKETS="27markets-partners" ;;
  admin)     ALLOWED_BUCKETS="27markets-admin" ;;
  all)       ALLOWED_BUCKETS="27markets-frontend" ;;
  *)         echo "Unknown SURFACE '$SURFACE'" >&2; exit 1 ;;
esac

if [[ " $ALLOWED_BUCKETS " != *" $S3_BUCKET "* ]]; then
  echo "REFUSING: surface '$SURFACE' may only publish to: $ALLOWED_BUCKETS" >&2
  echo "          but S3_BUCKET is '$S3_BUCKET'." >&2
  echo "          Set ALLOW_BUCKET_OVERRIDE=1 if this pairing is deliberate." >&2
  [[ "${ALLOW_BUCKET_OVERRIDE:-}" == "1" ]] || exit 1
  echo "          ALLOW_BUCKET_OVERRIDE=1 set — continuing." >&2
fi

echo "==> Building surface '$SURFACE' with VITE_API_URL=$VITE_API_URL"
export VITE_API_URL
export VITE_SURFACE="$SURFACE"
npm run build

# Prove this bundle carries no other surface's code BEFORE anything is published.
# Under `set -e` a non-zero exit aborts the deploy, so a leaking build never
# reaches S3 — which is the whole point of splitting the surfaces.
echo "==> Verifying bundle isolation"
node scripts/check-bundle-isolation.mjs "$SURFACE" dist

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

echo "==> Done. Surface '$SURFACE' published (allow ~1 min for the CDN)."
