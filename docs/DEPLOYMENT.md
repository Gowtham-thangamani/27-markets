# 27 Markets — Production Deployment (AWS + Namecheap)

This runbook hosts the platform on AWS with a domain registered at Namecheap.

```
  Namecheap DNS
    ├── 27markets.com , www  ──► CloudFront ──► S3 bucket   (React frontend)
    └── api.27markets.com    ──► EC2 (Docker: NestJS + Postgres + Redis)
```

> **Safety rail:** production runs `TRADING_MODE=SIMULATION` / `ALLOW_LIVE_MODE=false`.
> No real money can move. The API refuses to boot in LIVE / Stripe / MT5 mode
> until you are licensed and set `ALLOW_LIVE_MODE=true` deliberately. Do **not**
> change this to go live.

Replace `27markets.com` throughout if your domain differs.

---

## Part A — Backend on EC2

### A1. Launch the instance
1. AWS Console → **EC2 → Launch instance**.
2. Name: `27markets-api`. AMI: **Amazon Linux 2023**. Type: **t3.small** (2 GB RAM;
   `t2.micro` free-tier works but is tight — Prisma + Postgres want ~2 GB).
3. Create/download a key pair (`.pem`) — you SSH in with it.
4. **Security group** — allow inbound:
   - SSH `22` from **your IP only**
   - HTTP `80` from anywhere
   - HTTPS `443` from anywhere
5. Storage: 20 GB gp3. Launch. Note the **public IPv4 address**.

### A2. Install Docker + nginx
SSH in: `ssh -i your-key.pem ec2-user@<PUBLIC_IP>`, then:
```bash
sudo dnf update -y
sudo dnf install -y docker nginx git
sudo systemctl enable --now docker
sudo systemctl enable --now nginx
sudo usermod -aG docker ec2-user          # log out/in so `docker` works without sudo
# Docker Compose v2 plugin:
sudo mkdir -p /usr/local/lib/docker/cli-plugins
sudo curl -SL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64 \
  -o /usr/local/lib/docker/cli-plugins/docker-compose
sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
```
Log out and back in so group membership applies.

### A3. Get the code + configure secrets
```bash
git clone <your-repo-url> 27markets && cd 27markets/server
cp .env.production.example .env.production
# Generate secrets:
echo "JWT_ACCESS_SECRET=$(openssl rand -hex 48)"
echo "JWT_REFRESH_SECRET=$(openssl rand -hex 48)"
echo "ENCRYPTION_KEY=$(openssl rand -hex 24)"
echo "POSTGRES_PASSWORD=$(openssl rand -hex 24)"
nano .env.production   # paste the above; confirm CLIENT_ORIGIN + SIMULATION rail
```

### A4. Build and start
```bash
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml logs -f api   # watch it boot; Ctrl-C to exit
```
`prisma migrate deploy` runs automatically on start (see `Dockerfile`).
Health check: `curl http://localhost:4000/api/health` → expect `200`.

### A5. Create the first admin
```bash
docker compose -f docker-compose.prod.yml exec \
  -e ADMIN_EMAIL=you@27markets.com \
  -e ADMIN_PASSWORD='a-strong-password-here' \
  -e ADMIN_FIRST_NAME=Platform -e ADMIN_LAST_NAME=Admin \
  api npx ts-node prisma/create-admin.ts
# The script reads these env vars (ts-node ships in the image via npm ci).
```

### A6. nginx + HTTPS
```bash
sudo cp deploy/nginx/api.27markets.com.conf /etc/nginx/conf.d/
sudo nginx -t && sudo systemctl reload nginx
# DNS for api.27markets.com must already point here (Part C) before this:
sudo dnf install -y certbot python3-certbot-nginx
sudo certbot --nginx -d api.27markets.com     # issues + auto-renews the cert
```
Verify: `https://api.27markets.com/api/health` returns `200` over HTTPS.

---

## Part B — Frontend on S3 + CloudFront

### B1. S3 bucket
1. **S3 → Create bucket** named e.g. `27markets-frontend`, your region.
2. Keep **Block all public access = ON** (CloudFront reaches it privately via OAC).
   Do *not* enable S3 static website hosting — CloudFront serves it.

### B2. CloudFront distribution
1. **CloudFront → Create distribution**. Origin = your S3 bucket; when prompted,
   **create an Origin Access Control (OAC)** and let CloudFront update the bucket policy.
2. Viewer protocol policy: **Redirect HTTP to HTTPS**.
3. Default root object: `index.html`.
4. **SPA routing** — add a Custom Error Response: HTTP `403` **and** `404` →
   response page `/index.html`, HTTP response code `200`. (React Router needs this.)
5. Alternate domain names (CNAMEs): `27markets.com`, `www.27markets.com`.
6. Custom SSL certificate: request one in **ACM (us-east-1 — required for CloudFront)**
   for both names, validate via DNS (Part C), then attach it.

### B3. First deploy
From your dev machine (Git Bash / WSL / macOS, AWS CLI configured):
```bash
S3_BUCKET=27markets-frontend \
CF_DISTRIBUTION_ID=<your-distribution-id> \
VITE_API_URL=https://api.27markets.com/api \
./scripts/deploy-frontend.sh
```
Re-run this script for every future frontend release.

---

## Part C — Namecheap DNS

Namecheap dashboard → **Domain List → Manage → Advanced DNS**. Remove the default
parking records, then add:

| Type  | Host  | Value                                   | Purpose |
|-------|-------|-----------------------------------------|---------|
| CNAME | `www` | `<dxxxx>.cloudfront.net`                | frontend |
| ALIAS/CNAME | `@` | `<dxxxx>.cloudfront.net`            | apex → frontend* |
| A     | `api` | `<EC2 public IPv4>`                      | backend |
| CNAME | (ACM validation record shown by ACM)    | | validates SSL cert |

\* Namecheap supports **ALIAS** on the root (`@`) via "CNAME (ALIAS) Record".
If it won't accept CloudFront on the apex, use a **URL Redirect** `27markets.com → https://www.27markets.com` and serve the app from `www`.

DNS can take 5–60 min to propagate. Validate certs (ACM + certbot) only after the
relevant records resolve.

---

## Going live later (real money) — NOT NOW
Only when licensed with custody/PSP/KYC partners integrated:
- Move Postgres to **AWS RDS** (managed backups, HA) and point `DATABASE_URL` at it.
- Set `ALLOW_LIVE_MODE=true` + `TRADING_MODE=LIVE`, `PSP_PROVIDER=stripe`, real keys.
- Add Stripe webhook → `https://api.27markets.com/api/.../webhook`.
- Put the EC2 behind an ALB + auto-scaling; store secrets in AWS Secrets Manager.

## Routine ops
- **Redeploy backend:** `git pull && docker compose -f docker-compose.prod.yml up -d --build`
- **Redeploy frontend:** re-run `scripts/deploy-frontend.sh`
- **Logs:** `docker compose -f docker-compose.prod.yml logs -f api`
- **DB backup:** `docker compose -f docker-compose.prod.yml exec postgres pg_dump -U apex apex_markets > backup-$(date +%F).sql`
