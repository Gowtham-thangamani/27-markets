# Backend (NestJS + Prisma) production image for Render/Railway/Fly.
FROM node:20-slim AS base
# Prisma needs openssl at runtime
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Install ALL deps (Prisma CLI + ts-node are needed for migrate/seed at start)
COPY package*.json ./
RUN npm ci

# Generate client + build
COPY prisma ./prisma
RUN npx prisma generate
COPY . .
RUN npm run build

ENV NODE_ENV=production
# Render/Railway inject PORT; the app reads process.env.PORT.
EXPOSE 4000

# Apply migrations, then start. The demo seed is intentionally NOT run here — it
# creates well-known default credentials and self-aborts in production anyway.
# Provision the first admin via a one-time script that reads a secret password.
# Nest emits dist/src/main.js (tsconfig includes both src and prisma, so the
# common root is the project dir). Launch the built entrypoint at that path.
CMD npx prisma migrate deploy && node dist/src/main.js
