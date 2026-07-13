#!/usr/bin/env bash
# Deploy the NestJS backend to the production EC2 host.
#
# The EC2 app dir (~/app) is the contents of server/ deployed as a tarball (not a
# git clone); .env.production lives there and is preserved across deploys. The
# api container runs `prisma migrate deploy && node dist/src/main.js` on start,
# so migrations apply automatically.
#
# Prereqs:
#   - SSH access to the host with the deploy key.
#   - Run from the repo root.
#
# Usage:
#   EC2_HOST=51.20.251.133 SSH_KEY=~/.ssh/27markets-ec2 ./scripts/deploy-backend.sh
set -euo pipefail

: "${EC2_HOST:?Set EC2_HOST (the api server public IP or DNS)}"
: "${SSH_KEY:=$HOME/.ssh/27markets-ec2}"
: "${EC2_USER:=ec2-user}"
: "${APP_DIR:=~/app}"

SSH="ssh -i $SSH_KEY -o ConnectTimeout=20 ${EC2_USER}@${EC2_HOST}"
STAMP="$(date +%F-%H%M%S)"

echo "==> Backing up the production database first"
$SSH "docker exec apex_postgres sh -c 'PGPASSWORD=\$POSTGRES_PASSWORD pg_dump -U apex -d apex_markets' > ~/db-backup-${STAMP}.sql && echo backed up to ~/db-backup-${STAMP}.sql (\$(du -h ~/db-backup-${STAMP}.sql | cut -f1))"

echo "==> Packaging server/ (excluding node_modules, dist, secrets)"
tar czf "/tmp/server-${STAMP}.tgz" -C server \
  --exclude=node_modules --exclude=dist --exclude='.env' --exclude='.env.production' --exclude=.git \
  prisma src package.json package-lock.json tsconfig.json nest-cli.json Dockerfile \
  docker-compose.prod.yml docker-compose.yml jest.config.js .dockerignore

echo "==> Uploading + extracting into ${APP_DIR} (.env.production preserved)"
scp -i "$SSH_KEY" "/tmp/server-${STAMP}.tgz" "${EC2_USER}@${EC2_HOST}:~/server-new.tgz"
$SSH "cd ${APP_DIR} && tar xzf ~/server-new.tgz"

echo "==> Rebuilding + restarting the api container (migrations run on start)"
$SSH "cd ${APP_DIR} && docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build"

echo "==> Waiting for health"
sleep 10
$SSH "curl -sS -m 10 http://localhost:4000/api/health" && echo
echo "==> Done."
