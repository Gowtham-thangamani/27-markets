#!/usr/bin/env bash
# Runs once when the Codespace is created: install deps, generate env + Prisma client.
set -e
cd "$(dirname "$0")/.."

echo "▸ Frontend env (same-origin API via Vite proxy)"
printf 'VITE_API_URL=/api\n' > .env

echo "▸ Installing frontend deps"
npm install --no-audit --no-fund

echo "▸ Backend env"
cd server
if [ ! -f .env ]; then
  cp .env.example .env
  ACC=$(openssl rand -hex 48)
  REF=$(openssl rand -hex 48)
  sed -i "s|^JWT_ACCESS_SECRET=.*|JWT_ACCESS_SECRET=$ACC|" .env
  sed -i "s|^JWT_REFRESH_SECRET=.*|JWT_REFRESH_SECRET=$REF|" .env
fi

echo "▸ Installing backend deps"
npm install --no-audit --no-fund
npx prisma generate
cd ..

echo "✓ Setup complete. Start the app with:  bash scripts/codespace-start.sh"
