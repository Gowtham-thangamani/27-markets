# 27 Markets / Apex Markets — Go‑Live Runbook

Date: 2026-06-26 · Audience: ops + compliance + eng

The platform is **code‑complete and ships in SIMULATION**. Every real‑money path is
behind a config‑swap seam, so going live is **env + external partners**, not new code.
This runbook lists every variable, the exact flip order, how to verify each step, and
the non‑code (legal/infra) gates.

> **Hard safety rail.** The app refuses to boot with `TRADING_MODE=LIVE` unless
> `ALLOW_LIVE_MODE=true`. Do **not** set that flag until you are licensed and your
> custody/LP/PSP/KYC partners are integrated and you accept regulatory responsibility.
> (Enforced in `env.validation.ts`.)

---

## 0. Pre‑flight — external gates (NOT code)
None of these can be replaced by configuration. Secure them first.

- [ ] **Brokerage licence/registration** in each operating jurisdiction; client‑money
      segregation, regulatory reporting, risk disclosures, retail protections.
- [ ] **MetaTrader 5 white‑label** server + gateway credentials (execution backbone).
- [ ] **PSP contract** (Stripe live account; for client payouts, **Stripe Connect**).
- [ ] **Licensed real‑time market‑data** feed (the free Finnhub/Binance feed is not
      licensed for production).
- [ ] **Automated KYC/AML** vendor (Sumsub/Onfido) + sanctions/PEP screening.

## 0b. Infra checklist (ops)
- [ ] Managed **PostgreSQL** (`DATABASE_URL`) with automated backups + PITR.
- [ ] Managed **Redis** (`REDIS_URL`).
- [ ] **Secrets manager** for all keys below (never in the repo or plain env files).
- [ ] Error tracking + metrics + log aggregation; alerts on `/api/health`.
- [ ] TLS, WAF/DDoS in front of the API; `CLIENT_ORIGIN` locked to real domains.

---

## 1. Core required env (production)
| Var | Required | Notes |
|---|---|---|
| `NODE_ENV` | yes | `production` |
| `PORT` | no | default `4000` |
| `CLIENT_ORIGIN` | yes | comma‑separated allow‑list of web origins (CORS) |
| `DATABASE_URL` | yes | managed Postgres |
| `REDIS_URL` | yes | managed Redis |
| `JWT_ACCESS_SECRET` | yes | ≥32 chars; **must differ** from refresh in prod |
| `JWT_REFRESH_SECRET` | yes | ≥32 chars |
| `ENCRYPTION_KEY` | **set in prod** | ≥16 chars; encrypts 2FA secrets at rest (without it they're plaintext) |
| `TOTP_ISSUER` | no | shown in authenticator apps |

## 2. Seam flips (each is independent)

### A. Execution → MetaTrader 5
| Var | Value |
|---|---|
| `EXECUTION_PROVIDER` | `mt5` |
| `MT5_GATEWAY_URL` | `https://<gateway>` |
| `MT5_API_KEY` | gateway token |
| `MT5_ACCOUNT_ID` | MT5 login |
Verify: `GET /api/trading/venue` → `{"name":"mt5","simulated":false}`. Place a tiny
test order on a test account; confirm the deal on the MT5 terminal. Map any new
instruments in `toMt5Symbol` (`mt5-symbols.ts`). Phase 4: position/balance
reconciliation + close‑by‑ticket for hedging accounts.

### B. Payments → Stripe (deposits + payouts)
| Var | Value |
|---|---|
| `PSP_PROVIDER` | `stripe` |
| `STRIPE_SECRET_KEY` | live secret key |
| `STRIPE_WEBHOOK_SECRET` | from the live webhook endpoint |
Point a Stripe **webhook** at `POST /api/payments/stripe/webhook` (event
`checkout.session.completed`). Deposits: client → `/funds/deposit/checkout` → Stripe
Checkout → webhook credits the ledger. Payouts: approving a withdrawal calls
`payments.payout()` first (failure leaves it pending). **Direct client payouts need
Stripe Connect transfers** — wire the destination in `StripePaymentProvider.payout`.

### C. Document storage → S3
| Var | Value |
|---|---|
| `STORAGE_PROVIDER` | `s3` |
| `S3_BUCKET` | bucket name |
| `S3_REGION` | region |
| `S3_ENDPOINT` | optional (R2/MinIO) |
| `S3_PREFIX` | optional (default `kyc`) |
AWS creds via the default chain (`AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` or role).
Objects are written with server‑side AES‑256. Verify: upload a KYC doc, confirm the
object in the bucket, and that staff streaming (`/kyc/documents/:id/file`) works.

### D. Market data → licensed feed
Set `FINNHUB_API_KEY` (or replace the provider) and confirm `MARKET_SYMBOLS`. Verify
`GET /api/market/quotes` returns fresh (non‑stale) ticks.

---

## 3. The flip sequence (order matters)
1. **Infra up**: Postgres + Redis provisioned; run `prisma migrate deploy`; seed system
   ledger accounts. Confirm `GET /api/health` → `{status:"ok",db:"up"}`.
2. **Secrets**: load core env (§1) incl. `ENCRYPTION_KEY` and distinct JWT secrets.
3. **Storage** (B/C are safe to enable before LIVE): `STORAGE_PROVIDER=s3`, verify.
4. **Market data**: real feed key, verify quotes.
5. **Execution**: `EXECUTION_PROVIDER=mt5` + creds, verify `/trading/venue` + test deal.
6. **Payments**: `PSP_PROVIDER=stripe` + keys + webhook, verify a test deposit.
7. **Only when 1–6 are green and licensing is in place** — flip the money rail:
   `TRADING_MODE=LIVE` **and** `ALLOW_LIVE_MODE=true`. The app will refuse to boot if
   `LIVE` is set without the explicit override.
8. **Smoke test** end‑to‑end on a real (small) account: deposit → trade → close →
   withdraw → finance approval → payout. Then announce.

## 4. Rollback
Set `TRADING_MODE=SIMULATION` (or `ALLOW_LIVE_MODE=false`) and redeploy — all seams
fall back to simulation providers; no real money moves. Each seam can also be reverted
independently (`EXECUTION_PROVIDER=simulation`, `PSP_PROVIDER=simulation`,
`STORAGE_PROVIDER=local`).

## 5. Verification quick‑reference
| Check | Command |
|---|---|
| Health/DB | `GET /api/health` |
| Execution venue | `GET /api/trading/venue` |
| Deposit (PSP) | client `POST /api/funds/deposit/checkout` → expect `checkoutUrl` |
| Payout | approve a withdrawal in Admin → Finance; audit log shows `payoutId` |
| Storage | upload KYC doc → object appears in bucket |
| Market data | `GET /api/market/quotes` → `stale:false` |
