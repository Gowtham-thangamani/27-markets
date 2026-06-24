# 27 Markets — Go-Live Readiness Checklist & Integration Seams

Date: 2026-06-24
Status: Planning. **The SIMULATION rail stays ON. Nothing flips to LIVE until every
gate below is green AND licensing + PSP/custody partners are live.**

> This document is the bridge from the current SIMULATION build to real-money
> operation. It is intentionally conservative: each section is a hard gate.

---

## 0. The one switch (and why it's locked)

Real money is gated by `TRADING_MODE` (env). In `funds.service.ts`,
`assertCanMoveFunds()` throws `NotImplementedException` whenever
`TRADING_MODE !== 'SIMULATION'`, and deposits/withdrawals are written with
`simulated: true`. **Flipping to LIVE without the integrations below would make
the API refuse all funding** — by design. Do not change `TRADING_MODE` until
sections 1–6 are complete and signed off.

---

## 1. Licensing & legal (external — blocks everything)
- [ ] Brokerage license / regulatory authorization in each operating jurisdiction
- [ ] Client agreement, risk disclosures, T&Cs, privacy policy reviewed by counsel
- [ ] AML/CFT program + designated compliance officer
- [ ] Data-protection (GDPR/PDPL) controller obligations confirmed
- [ ] Segregated client-funds banking arrangement in place

## 2. Payments & custody (PSP / bank)
- [ ] Contract with a licensed PSP / acquiring bank (cards, bank transfer, e-wallet, crypto as scoped)
- [ ] Segregated client-money account (matches the ledger's `SYSTEM:PSP_CLEARING` asset)
- [ ] Deposit webhooks → post real DEPOSIT journal entries (`simulated: false`)
- [ ] Withdrawal payout API → triggered on Admin approval (the existing PENDING→approve flow)
- [ ] Reconciliation job: ledger vs PSP/bank statements
- **Seam:** introduce a `PaymentProvider` interface; today's logic is the
  `SimulationPaymentProvider`. A `<Psp>PaymentProvider` adapter plugs in behind
  the same interface so `FundsService` / `AdminFinanceService` don't change.

## 3. Identity verification (KYC/AML)
- [ ] Contract with a KYC/AML provider (document + biometric verification)
- [ ] Sanctions / PEP / watchlist screening at onboarding and ongoing
- [ ] Provider webhooks → drive `KycProfile` step statuses (today: manual staff review)
- [ ] Retain the manual review queue as fallback / edge-case handling
- **Seam:** `KycProvider` interface; the current manual `KycService.review` becomes
  the fallback path, the provider adapter the primary.

## 4. Market data & trading platform
- [ ] Licensed real-time market-data feed (replaces simulated quotes in `market/`)
- [ ] Trading platform / liquidity provider integration (order routing, execution)
- [ ] Real account balances/positions reconcile with the ledger
- Note: the current build is brokerage onboarding + back-office; live order
  execution is a separate integration track.

## 5. Security & compliance hardening (mostly in place — verify)
- [x] JWT auth + httpOnly cookies, refresh rotation, 2FA (TOTP)
- [x] Two-tier RBAC (Admin/Agent) enforced server-side; every state change audited (`AuditLog`)
- [x] Rate limiting (Throttler); input validation (class-validator/zod); helmet
- [x] No client-side authority over money — all balances ledger-derived
- [ ] Secrets management (no secrets in repo; rotate JWT/DB/provider keys; use a vault)
- [ ] KYC documents in encrypted object storage with least-privilege access (today: `storageKey` reference)
- [ ] Pen-test + dependency audit (`npm audit`) clean; security review of money paths
- [ ] PII retention/erasure policy implemented

## 6. Operations & infra
- [ ] Managed Postgres with automated backups + PITR + tested restore
- [ ] `prisma migrate deploy` in the release pipeline (not `migrate dev`)
- [ ] Monitoring/alerting (errors, latency, failed payments, withdrawal queue age)
- [ ] Structured audit log shipping + retention
- [ ] CI runs all suites (backend unit + e2e, frontend unit, Playwright) on every PR
- [ ] Staging environment mirroring prod; load test the funding paths
- [ ] Incident runbook (esp. money-movement failures and reconciliation breaks)

---

## Recommended build order (code work this implies)
1. **Provider seams first** — extract `PaymentProvider` + `KycProvider` interfaces with
   the current behavior as the `Simulation*` implementations. No behavior change;
   makes every later integration a config/adapter swap, not a rewrite.
2. **Reconciliation + webhooks scaffolding** behind the seams (still simulated).
3. Integrate the chosen PSP and KYC providers in **staging** with test credentials.
4. Full dress rehearsal in staging (deposit → trade → withdraw → reconcile).
5. Sign off sections 1–6 → flip `TRADING_MODE=LIVE` for a limited pilot cohort.

## Hard rule (restate)
Do not set `TRADING_MODE=LIVE` in production until licensing is granted, PSP/custody
and KYC partners are contracted and live, reconciliation is proven in staging, and
the security review of money paths has passed. Until then, SIMULATION stays on.
