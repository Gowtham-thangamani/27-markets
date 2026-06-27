# CRM Dashboard Upgrade — Design Spec

- **Date:** 2026-06-26
- **Status:** Approved (pending spec review)
- **Project:** A of 2 (B = Full IB/Partner portal, separate spec)
- **Area:** Staff back-office dashboard at `/admin/dashboard` (CLIENT portal and marketing site unchanged)

## 1. Problem

The CRM dashboard ([src/pages/admin/AdminDashboardPage.tsx](../../../src/pages/admin/AdminDashboardPage.tsx)) currently renders 5 plain KPI numbers plus a placeholder note. Staff want a richer, chart-driven overview comparable to modern finance/admin dashboards — KPI cards with sparklines and trend deltas, a fund-flow trend chart, a lead-funnel donut, an activity feed, and actionable tables.

## 2. Goals

- Replace the bare KPI grid with a multi-section, chart-driven dashboard.
- Drive every widget from **real backend data** (no hardcoded chart values).
- Add a backend **time-series** aggregation so charts/sparklines have daily history.
- Expand the seed with ~90 days of backdated demo activity so charts look full in client demos.
- Keep the black/red theme, existing skeleton/error states, and ADMIN+AGENT RBAC.

## 3. Non-Goals (out of scope)

- Client portal dashboard (already upgraded) and the marketing site.
- The Reports page (`/admin/reports`) — untouched.
- The Partner/IB portal — that is **Project B**, its own spec/plan.
- Any change to money movement, the ledger, or the SIMULATION safety rail.

## 4. Layout

```
Welcome, {staffName}                                  [search] [bell] [avatar]
────────────────────────────────────────────────────────────────────────────
[Total Clients ▲%] [Net Flow ▲%] [Pending KYC] [Pending W/D] [Open Tickets]
  each card: value + mini sparkline (last 14d) + trend % vs previous period
────────────────────────────────────────────────────────────────────────────
Fund Flow (area chart, 30/90d toggle)            │  Lead Funnel (donut)
 deposits vs withdrawals over time               │   NEW→CONTACTED→QUALIFIED
                                                 │   →CONVERTED→LOST
────────────────────────────────────────────────┴───────────────────────────
Recent Activity (audit feed)                     │  Pending Withdrawals (table)
 "Avery approved a withdrawal · 2h ago"          │   client · amount · age · action
────────────────────────────────────────────────┴───────────────────────────
Recent Signups (table)
 newest clients · name · email · country · joined
```

Responsive: 5 KPI cards collapse to 2-up on small screens; the two-column rows stack to one column on `lg` breakpoint down, matching existing `glass-panel`/grid patterns.

## 5. Backend

### 5.1 Enriched endpoint
Extend `GET /api/admin/dashboard` (handled by `AdminDashboardService.summary`) to return a richer payload. RBAC unchanged (ADMIN + AGENT, read).

```ts
interface AdminDashboard {
  kpis: {
    totalClients:        { value: number; delta: number | null; spark: number[] }
    netFlow:             { value: string; delta: number | null; spark: number[] } // money string
    pendingKyc:          { value: number; spark: number[] }
    pendingWithdrawals:  { value: number; spark: number[] }
    openTickets:         { value: number; spark: number[] }
  }
  series: Array<{ date: string; deposits: number; withdrawals: number; signups: number }> // default 90d
  distributions: {
    funnel: Record<'NEW'|'CONTACTED'|'QUALIFIED'|'CONVERTED'|'LOST', number>
    kyc:    Record<'NOT_SUBMITTED'|'PENDING'|'APPROVED'|'REJECTED', number>
  }
  recentSignups: Array<{ id: string; name: string; email: string; country: string | null; createdAt: string }>
  recentActivity: Array<{ id: string; action: string; entity: string | null; createdAt: string; actor: string | null }>
  recentWithdrawals: Array<{ id: string; reference: string; client: string | null; amount: string; createdAt: string }>
}
```

- **series**: daily group of posted DEPOSIT credits, posted WITHDRAWAL debits, and CLIENT signups, for the last 90 days, zero-filled for empty days. Implemented with Prisma aggregation by day (group in JS over a single ranged query per metric to stay DB-portable).
- **spark**: last 14 daily points derived from `series` (deposits/withdrawals) or daily counts (clients/kyc/tickets snapshots — for queue metrics, spark = daily count of new items where a creation date exists; if a metric has no meaningful history, spark may be a flat single-value array).
- **delta**: percent change of the metric for the current period vs the immediately preceding equal-length period. `null` when the previous period is zero (avoid divide-by-zero; UI shows "—").
- **distributions.funnel**: reuse the lead group-by already in `AdminReportsService`. **distributions.kyc**: count `KycProfile` rows by each step status (aggregate the three steps into one status tally; exact rule: count a profile under the "lowest" non-approved status it has, else APPROVED — documented in code).

### 5.2 Reused endpoints (no change)
- **Activity feed** → existing `GET /api/admin/audit` (newest ~8).
- **Pending Withdrawals** → existing `AdminFinanceService.pendingWithdrawals` route under `/api/admin/finance` (newest ~8).

### 5.3 Seed
Extend [server/prisma/seed.ts](../../../server/prisma/seed.ts):
- ~40–60 extra demo CLIENT users with `createdAt` spread across the last 90 days.
- A spread of POSTED deposits and withdrawals (and a few PENDING withdrawals) with backdated `createdAt`, all `simulated: true`.
- Leads across every funnel stage; a handful of tickets (open/closed).
- Idempotent (guard by a marker email/range so re-running does not duplicate).

## 6. Frontend

- Add `recharts` dependency.
- New components in `src/components/admin/charts/`:
  - `KpiSparkCard` — value, label, icon, sparkline (Recharts `<Sparklines>`-style mini area), trend % chip.
  - `FundFlowChart` — Recharts `AreaChart`, deposits vs withdrawals, 30/90-day toggle.
  - `FunnelDonut` — Recharts `PieChart` donut for the lead funnel (and reusable for the KYC donut if desired later).
  - `ActivityFeed` — list rendering audit entries with relative time.
  - `PendingWithdrawalsTable` and `RecentSignupsTable` — compact tables using existing UI table styles.
- Rebuild `AdminDashboardPage` to the Section 4 layout; keep `SkeletonCard`/`ErrorState`, `staggerContainer`/`fadeUp` motion, and theme tokens.
- Extend `src/lib/adminApi.ts` types with `AdminDashboard` and add `getDashboard()` return typing; add a helper for the audit + pending-withdrawals fetches if not already present.
- Charts themed to brand red gradients on dark glass panels; respect `prefers-reduced-motion`.

## 7. Data Flow

`AdminDashboardPage` mounts → parallel fetch: `adminApi.getDashboard()`, `adminApi.getAuditLog()` (recent), pending-withdrawals fetch → render sections. Loading shows skeletons per section; any failure shows `ErrorState` with retry (existing pattern).

## 8. Testing

- Backend: unit-test the new aggregation (daily zero-fill, delta divide-by-zero → null, kyc tally rule) in `admin-dashboard.service.spec.ts`.
- Frontend: smoke-render `AdminDashboardPage` with a mocked payload (charts present, no crash); a small test for `KpiSparkCard` trend formatting.
- Manual: seed, log in as admin, confirm all widgets populate with non-empty demo data.

## 9. Risks / Notes

- Recharts adds bundle weight; acceptable for an authenticated back-office area (not the marketing critical path). Lazy-load the dashboard route if bundle size regresses.
- Daily grouping done in app code (not raw SQL date_trunc) to stay portable across Postgres/SQLite test DBs.
- Spark/delta for pure queue metrics (pending KYC/withdrawals) are best-effort; if not meaningful, render the card without a trend chip rather than faking a trend.
