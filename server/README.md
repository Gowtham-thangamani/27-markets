# Apex Markets — Backend API

Production-shaped NestJS + PostgreSQL + Prisma backend for the Apex Markets
trading platform. Built with a **double-entry ledger**, real authentication
(Argon2 + JWT + TOTP 2FA), and a hard **SIMULATION safety rail**.

> 🛑 **No real money moves.** `TRADING_MODE=SIMULATION` is enforced. The funds
> endpoints refuse real fund movement because no licensed PSP/custody/LP is
> integrated yet. This is intentional — see **Before going live** below.

## Why it's built this way

- **Balances are never stored.** A trading account's balance is *derived* from
  immutable double-entry ledger postings (`debits = credits`, enforced inside a
  DB transaction). This makes every balance provable and reconcilable, and means
  no client (or bug) can "set" a balance. The old localStorage mock could be
  edited in devtools — this cannot.
- **Money is `NUMERIC(20,8)`**, never a float.
- **Idempotency keys** on every money operation prevent double-spend on retries.
- **Auth**: Argon2id password hashing, short-lived access JWT + rotating refresh
  token (hashed at rest, httpOnly cookie), revocable sessions, optional TOTP 2FA,
  rate limiting, and an append-only **audit log** on every sensitive action.

## Prerequisites

- Node 20+ and Docker Desktop.

## Setup

```bash
cd server
cp .env.example .env          # then set strong JWT secrets: openssl rand -hex 48
docker compose up -d          # Postgres on :5432
npm install
npm run prisma:migrate        # apply migrations
npm run build && npm start    # API on http://localhost:4000/api
```

Health check: `GET http://localhost:4000/api/health`

## API surface

```
POST   /api/auth/register          create account (sets auth cookies)
POST   /api/auth/login             login (+ totp if 2FA enabled)
POST   /api/auth/refresh           rotate tokens
POST   /api/auth/logout            revoke session
GET    /api/auth/me                current user
POST   /api/auth/2fa/setup         begin TOTP enrolment (returns QR)
POST   /api/auth/2fa/enable        confirm + enable 2FA
POST   /api/auth/2fa/disable       disable 2FA

GET    /api/users/me               profile
PATCH  /api/users/me               update profile

GET    /api/accounts               list (balances derived from ledger)
POST   /api/accounts               open account (DEMO is auto-funded virtually)
GET    /api/accounts/:id           one account

POST   /api/funds/deposit          SIMULATION deposit  → ledger entry
POST   /api/funds/withdraw         SIMULATION withdraw → ledger entry (balance-checked)
POST   /api/funds/transfer         internal transfer between own accounts
GET    /api/funds/history          transaction history

GET    /api/kyc                    KYC status + progress
POST   /api/kyc/submit             submit a step (stores doc *reference* only)
POST   /api/kyc/review             (ADMIN) approve/reject a step

GET    /api/health                 liveness + db + trading mode
```

All routes require auth except those marked `@Public()` (register, login,
refresh, health). Auth is enforced globally via a guard.

## Verified behaviour (smoke tested)

- Register → open account → deposit $2500.50 → ledger-derived balance = $2500.50
- Withdraw $500 → balance = $2000.50 (double-entry math correct)
- Unauthenticated request → 401 · Over-withdraw → 400 · Weak password → 400
- Demo account auto-funded to $50,000 via a balanced ledger entry
- Audit log + balanced postings (2 legs per entry) confirmed in Postgres

## Project structure

```
src/
  config/      env validation (zod) — app refuses to boot on bad config
  prisma/      PrismaService + module
  common/      decorators, exception filter, reference generators
  auth/        register/login/refresh/2FA, tokens, guards, cookies
  users/       profile
  accounts/    trading accounts (server-authoritative)
  ledger/      double-entry engine + money (Decimal) helpers   ← the core
  funds/       deposit/withdraw/transfer (SIMULATION rail)
  kyc/         status state-machine + document references
  audit/       append-only audit trail
  health/      health probe
prisma/        schema.prisma + migrations
```

## ⚠️ Before going live (NOT done — and not just code)

Real client money is gated on items that are legal/operational, not engineering:

1. **Regulatory license** (e.g. UAE SCA / DFSA / FSRA, or CySEC/FCA/ASIC).
2. **Segregated client-fund custody** with a partner bank.
3. **Licensed payment processor** + PCI-DSS (cards) — replaces the SIMULATION deposit.
4. **Liquidity provider / prime broker** (FIX) for real order execution.
5. **Licensed KYC/AML provider** (Sumsub/Onfido) + AML monitoring/reporting —
   replaces the demo document-reference flow; real files go to encrypted object storage.
6. **Security**: pen-test, secrets manager, monitoring, backups, DR.

Only when all of the above are in place should `ALLOW_LIVE_MODE=true` and
`TRADING_MODE=LIVE` be considered — and that decision carries full regulatory
responsibility. Until then the rail stays on.
