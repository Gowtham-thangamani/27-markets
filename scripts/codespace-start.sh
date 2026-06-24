#!/usr/bin/env bash
# One command to bring the whole stack up in a Codespace (or any Docker host):
# Postgres → migrations → seed → API (background) → web (foreground).
set -e
cd "$(dirname "$0")/.."

echo "▸ Starting Postgres…"
docker compose -f server/docker-compose.yml up -d

echo "▸ Waiting for Postgres…"
until docker exec apex_postgres pg_isready -U apex -d apex_markets >/dev/null 2>&1; do sleep 2; done

echo "▸ Applying migrations + seeding demo data…"
( cd server && npx prisma migrate deploy && npm run db:seed )

echo "▸ Starting API on :4000 (logs → /tmp/api.log)…"
( cd server && npm run start:dev > /tmp/api.log 2>&1 & )

# Wait until the API answers before serving the web app.
until curl -sf http://localhost:4000/api/health >/dev/null 2>&1; do sleep 2; done
echo "✓ API is up."

echo "▸ Starting web on :5173…"
echo "  → In the Ports tab, set port 5173 visibility to 'Public' and open the URL."
echo "  → Demo logins: client@27markets.io / Client123!   admin@27markets.io / Admin123!"
npm run dev
