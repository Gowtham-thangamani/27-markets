#!/usr/bin/env bash
# Build one surface of the React app for production and publish it to S3 +
# invalidate CloudFront.
#
# Each surface (marketing, portal, partner, admin) is a separate bundle on its
# own hostname and its own bucket. "all" is the combined pre-split build that
# 27markets.com/staging/ serves.
#
# Prereqs (one-time):
#   - AWS CLI installed and `aws configure` done (or an IAM user/role with S3 +
#     CloudFront permissions).
#   - The S3 bucket and CloudFront distribution already created (see docs/DEPLOYMENT.md).
#
# Usage:
#   SURFACE=all S3_BUCKET=27markets-frontend S3_PREFIX=staging/ \
#     CF_DISTRIBUTION_ID=E19DRXVNFKYHB4 ./scripts/deploy-frontend.sh
#
# Options:
#   S3_PREFIX=staging/    publish under a folder instead of the bucket root
#   DRY_RUN=1             show every action without changing anything
#   ALLOW_DELETE=1        permit removal of files this build did not produce
#   ALLOW_BUCKET_OVERRIDE=1   permit a surface/bucket pairing outside the table
#
set -euo pipefail

: "${S3_BUCKET:?Set S3_BUCKET (the frontend bucket name)}"
: "${CF_DISTRIBUTION_ID:?Set CF_DISTRIBUTION_ID (CloudFront distribution id)}"
# Which slice of the app to build. vite.config.ts rejects anything else.
: "${SURFACE:?Set SURFACE: marketing, portal, partner, admin or all}"
# The API the built site talks to. Baked into the bundle at build time.
: "${VITE_API_URL:=https://api.27markets.com/api}"
# Publish under a folder. Empty = bucket root. Must end in "/" if set.
S3_PREFIX="${S3_PREFIX:-}"
[[ -z "$S3_PREFIX" || "$S3_PREFIX" == */ ]] || S3_PREFIX="$S3_PREFIX/"

DEST="s3://$S3_BUCKET/$S3_PREFIX"
DRY_RUN="${DRY_RUN:-}"
run() { if [[ "$DRY_RUN" == "1" ]]; then echo "   [dry-run] $*"; else "$@"; fi; }

# Bind each surface to the bucket(s) it may publish to.
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

echo "==> Building surface '$SURFACE' -> $DEST (VITE_API_URL=$VITE_API_URL)"
export VITE_API_URL
export VITE_SURFACE="$SURFACE"
npm run build

# Prove this bundle carries no other surface's code BEFORE anything is published.
# Under `set -e` a non-zero exit aborts the deploy, so a leaking build never
# reaches S3 — which is the whole point of splitting the surfaces.
echo "==> Verifying bundle isolation"
node scripts/check-bundle-isolation.mjs "$SURFACE" dist

# --------------------------------------------------------------------------
# Deletion guard.
#
# On 2026-10-15 a deploy of SURFACE=all to the bucket ROOT removed the Coming
# Soon holding page (index.html, bg.png, logo.png, logo-mark.png,
# three.module.js) and the entire staging/ folder, because `aws s3 sync
# --delete` deletes everything in the destination the build did not produce —
# and the holding page lives in the same bucket. The site was publicly exposed
# until it was restored by hand.
#
# So: ask S3 what it intends to delete, print it, and stop unless the operator
# says that is what they meant. A deploy should never silently remove a file it
# did not create.
# --------------------------------------------------------------------------
echo "==> Checking what this deploy would remove"
PLANNED_DELETES=$(
  aws s3 sync dist/ "$DEST" --delete --exclude "assets/*" --dryrun 2>/dev/null \
    | grep -E "^\(dryrun\) delete:" || true
)

if [[ -n "$PLANNED_DELETES" ]]; then
  COUNT=$(printf '%s\n' "$PLANNED_DELETES" | wc -l | tr -d ' ')
  echo "" >&2
  echo "REFUSING: this deploy would DELETE $COUNT file(s) from $DEST" >&2
  echo "          that the build did not produce:" >&2
  printf '%s\n' "$PLANNED_DELETES" | sed 's/^(dryrun) delete: /            /' | head -40 >&2
  [[ "$COUNT" -gt 40 ]] && echo "            ...and $((COUNT - 40)) more" >&2
  echo "" >&2
  echo "          If these are stale build artefacts, re-run with ALLOW_DELETE=1." >&2
  echo "          If you recognise anything you did NOT build — a holding page, a" >&2
  echo "          sibling folder — publish under S3_PREFIX instead of the root." >&2
  [[ "${ALLOW_DELETE:-}" == "1" ]] || exit 1
  echo "          ALLOW_DELETE=1 set — continuing." >&2
fi

echo "==> Syncing dist/ to $DEST"
# 1) Hashed, content-addressed files under assets/ never change → cache forever.
#    --delete is safe here: every name is content-addressed and ours.
run aws s3 sync dist/assets/ "${DEST}assets" --delete \
  --cache-control "public,max-age=31536000,immutable"
# 2) Unhashed files (favicons, images, news.json, …) reuse their names across
#    deploys, so they must revalidate — a short TTL avoids serving a year-stale
#    copy after a redeploy (CloudFront invalidation only clears the edge, not
#    browsers that already cached an immutable copy).
#    No --delete: the guard above governs removals, not this line.
run aws s3 sync dist/ "$DEST" --exclude "assets/*" --exclude "index.html" \
  --cache-control "public,max-age=300,must-revalidate"
# 3) index.html: never cache, so a new deploy is picked up immediately.
run aws s3 cp dist/index.html "${DEST}index.html" \
  --cache-control "no-cache,no-store,must-revalidate" --content-type text/html

# Invalidate only what we published. A blanket /* on a shared bucket also evicts
# the holding page and any sibling folder, which is slower and more expensive.
INVALIDATION_PATH="/${S3_PREFIX}*"
echo "==> Invalidating CloudFront $CF_DISTRIBUTION_ID at $INVALIDATION_PATH"
run aws cloudfront create-invalidation \
  --distribution-id "$CF_DISTRIBUTION_ID" \
  --paths "$INVALIDATION_PATH" >/dev/null

if [[ "$DRY_RUN" == "1" ]]; then
  echo "==> Dry run complete. Nothing was changed."
else
  echo "==> Done. Surface '$SURFACE' published to $DEST (allow ~1 min for the CDN)."
fi
