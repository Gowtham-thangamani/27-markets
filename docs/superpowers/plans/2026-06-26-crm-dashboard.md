# CRM Dashboard Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the bare 5-number `/admin/dashboard` into a chart-driven CRM overview (KPI sparkline cards, fund-flow area chart, lead-funnel donut, activity feed, pending-withdrawals + recent-signups tables) driven by real backend data.

**Architecture:** Enrich the existing `GET /api/admin/dashboard` (STAFF = ADMIN+AGENT) to return one payload with KPIs (value+delta+sparkline), a 90-day daily time-series, funnel/KYC distributions, and recent signups/activity/withdrawals — so AGENT users (who cannot call the ADMIN-only audit/finance endpoints) still get a complete dashboard in one round-trip. Frontend renders it with Recharts components. Seed gains ~90 days of backdated demo activity.

**Tech Stack:** NestJS + Prisma + Jest (backend); React 18 + TypeScript + Vite + Recharts + Vitest/Testing-Library (frontend).

## Global Constraints

- Money values cross the API as **strings** (formatted by `formatMoney`); never as floats. KPI `netFlow.value` is a money string.
- Dashboard endpoint stays gated to **STAFF_ROLES (ADMIN + AGENT)**; do not call ADMIN-only endpoints (`/admin/audit`, `/admin/finance/*`) from the dashboard page.
- All seeded ledger postings are `simulated: true`; do not touch the SIMULATION rail.
- Daily bucketing is done in **app code** (JS date keys), not SQL `date_trunc`, to stay portable across Postgres (runtime) and any test DB.
- Theme: black/red, reuse `glass-panel`, `brand-*` tokens, existing `SkeletonCard`/`ErrorState`, and `staggerContainer`/`fadeUp` motion.
- Frontend test runner: `npx vitest run <file>`. Backend test runner: `npm test -- <file>` (Jest) from `server/`.

---

### Task 1: Backend aggregation helpers (pure functions)

**Files:**
- Create: `server/src/admin/admin-dashboard.util.ts`
- Test: `server/src/admin/admin-dashboard.util.spec.ts`

**Interfaces:**
- Produces:
  - `interface DailyPoint { date: string; deposits: number; withdrawals: number; signups: number }`
  - `dayKey(d: Date): string` → `'YYYY-MM-DD'` (UTC)
  - `emptySeries(days: number, today: Date): DailyPoint[]` (oldest→newest, zero-filled)
  - `computeDelta(current: number, previous: number): number | null` (null when previous is 0)
  - `sparkFromSeries(series: DailyPoint[], key: 'deposits'|'withdrawals'|'signups', n?: number): number[]`
  - `kycStatusOf(p: { identityStatus: string; addressStatus: string; selfieStatus: string }): 'NOT_SUBMITTED'|'PENDING'|'APPROVED'|'REJECTED'`

- [ ] **Step 1: Write the failing test**

```ts
import { emptySeries, computeDelta, sparkFromSeries, dayKey, kycStatusOf } from './admin-dashboard.util';

describe('admin-dashboard.util', () => {
  it('dayKey returns a UTC YYYY-MM-DD string', () => {
    expect(dayKey(new Date('2026-03-05T23:30:00Z'))).toBe('2026-03-05');
  });

  it('emptySeries returns N zero-filled days, oldest first, ending today', () => {
    const today = new Date('2026-03-05T12:00:00Z');
    const s = emptySeries(3, today);
    expect(s.map((d) => d.date)).toEqual(['2026-03-03', '2026-03-04', '2026-03-05']);
    expect(s[0]).toEqual({ date: '2026-03-03', deposits: 0, withdrawals: 0, signups: 0 });
  });

  it('computeDelta returns percent change, or null when previous is 0', () => {
    expect(computeDelta(150, 100)).toBeCloseTo(50);
    expect(computeDelta(80, 100)).toBeCloseTo(-20);
    expect(computeDelta(5, 0)).toBeNull();
  });

  it('sparkFromSeries takes the last N points of one key', () => {
    const series = emptySeries(20, new Date('2026-03-20T00:00:00Z'));
    series[19].deposits = 7;
    const spark = sparkFromSeries(series, 'deposits', 14);
    expect(spark).toHaveLength(14);
    expect(spark[13]).toBe(7);
  });

  it('kycStatusOf reports the lowest non-approved step, else APPROVED', () => {
    expect(kycStatusOf({ identityStatus: 'APPROVED', addressStatus: 'APPROVED', selfieStatus: 'APPROVED' })).toBe('APPROVED');
    expect(kycStatusOf({ identityStatus: 'APPROVED', addressStatus: 'PENDING', selfieStatus: 'NOT_SUBMITTED' })).toBe('PENDING');
    expect(kycStatusOf({ identityStatus: 'REJECTED', addressStatus: 'APPROVED', selfieStatus: 'APPROVED' })).toBe('REJECTED');
    expect(kycStatusOf({ identityStatus: 'NOT_SUBMITTED', addressStatus: 'NOT_SUBMITTED', selfieStatus: 'NOT_SUBMITTED' })).toBe('NOT_SUBMITTED');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npm test -- admin-dashboard.util`
Expected: FAIL — module not found / functions undefined.

- [ ] **Step 3: Write minimal implementation**

```ts
// server/src/admin/admin-dashboard.util.ts
export interface DailyPoint {
  date: string;
  deposits: number;
  withdrawals: number;
  signups: number;
}

/** UTC calendar-day key, e.g. '2026-03-05'. */
export function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** N zero-filled days ending on `today`, oldest first. */
export function emptySeries(days: number, today: Date): DailyPoint[] {
  const out: DailyPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    out.push({ date: dayKey(d), deposits: 0, withdrawals: 0, signups: 0 });
  }
  return out;
}

/** Percent change vs previous; null when previous is 0 (avoid divide-by-zero). */
export function computeDelta(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

export function sparkFromSeries(
  series: DailyPoint[],
  key: 'deposits' | 'withdrawals' | 'signups',
  n = 14,
): number[] {
  return series.slice(-n).map((p) => p[key]);
}

type Step = 'NOT_SUBMITTED' | 'PENDING' | 'APPROVED' | 'REJECTED';
const STEP_PRIORITY: Step[] = ['REJECTED', 'NOT_SUBMITTED', 'PENDING', 'APPROVED'];

/** A profile's overall KYC status = the lowest-priority step it has. */
export function kycStatusOf(p: {
  identityStatus: string;
  addressStatus: string;
  selfieStatus: string;
}): Step {
  const steps = [p.identityStatus, p.addressStatus, p.selfieStatus] as Step[];
  for (const s of STEP_PRIORITY) if (steps.includes(s)) return s;
  return 'APPROVED';
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd server && npm test -- admin-dashboard.util`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add server/src/admin/admin-dashboard.util.ts server/src/admin/admin-dashboard.util.spec.ts
git commit -m "feat(admin): pure aggregation helpers for dashboard time-series"
```

---

### Task 2: Enrich AdminDashboardService + controller payload

**Files:**
- Modify: `server/src/admin/admin-dashboard.service.ts` (replace `summary()`)
- Modify: `server/src/admin/admin-dashboard.service.spec.ts`
- Modify: `server/src/admin/admin.controller.ts:18-21` (return type only; route unchanged)

**Interfaces:**
- Consumes: helpers from Task 1.
- Produces: `AdminDashboardService.summary(): Promise<AdminDashboard>` where

```ts
export interface KpiTrend { value: number; delta: number | null; spark: number[] }
export interface KpiCount { value: number; spark: number[] }
export interface AdminDashboard {
  kpis: {
    totalClients: KpiTrend;
    netFlow: { value: string; delta: number | null; spark: number[] };
    pendingKyc: KpiCount;
    pendingWithdrawals: KpiCount;
    openTickets: KpiCount;
  };
  series: DailyPoint[];
  distributions: {
    funnel: Record<'NEW' | 'CONTACTED' | 'QUALIFIED' | 'CONVERTED' | 'LOST', number>;
    kyc: Record<'NOT_SUBMITTED' | 'PENDING' | 'APPROVED' | 'REJECTED', number>;
  };
  recentSignups: { id: string; name: string; email: string; country: string | null; createdAt: string }[];
  recentActivity: { id: string; action: string; entity: string | null; createdAt: string; actor: string | null }[];
  recentWithdrawals: { id: string; reference: string; client: string | null; amount: string; createdAt: string }[];
}
```

- [ ] **Step 1: Write the failing test** (replace the file contents)

```ts
import { AdminDashboardService } from './admin-dashboard.service';

function makePrisma() {
  return {
    user: {
      count: jest.fn().mockResolvedValue(12),
      findMany: jest.fn().mockResolvedValue([
        { id: 'u1', firstName: 'Ada', lastName: 'Lovelace', email: 'ada@x.io', country: 'UK', createdAt: new Date('2026-03-05T10:00:00Z') },
      ]),
    },
    kycProfile: {
      count: jest.fn().mockResolvedValue(3),
      findMany: jest.fn().mockResolvedValue([
        { identityStatus: 'APPROVED', addressStatus: 'PENDING', selfieStatus: 'NOT_SUBMITTED' },
        { identityStatus: 'APPROVED', addressStatus: 'APPROVED', selfieStatus: 'APPROVED' },
      ]),
    },
    journalEntry: {
      // pendingWithdrawals count, depositsToday count, then findMany calls
      count: jest.fn().mockResolvedValueOnce(2).mockResolvedValueOnce(5),
      findMany: jest.fn().mockResolvedValue([]), // deposits, withdrawals, recentWithdrawals series queries → empty
    },
    ticket: { count: jest.fn().mockResolvedValue(4) },
    lead: { groupBy: jest.fn().mockResolvedValue([{ status: 'NEW', _count: { _all: 6 } }]) },
    auditLog: {
      findMany: jest.fn().mockResolvedValue([
        { id: 'a1', action: 'funds.withdraw', entity: 'JournalEntry', createdAt: new Date('2026-03-05T09:00:00Z'), user: { firstName: 'Avery', lastName: 'Stone' } },
      ]),
    },
  } as any;
}

describe('AdminDashboardService.summary', () => {
  it('returns KPIs, a 90-day series, distributions, and recents', async () => {
    const service = new AdminDashboardService(makePrisma());
    const r = await service.summary();

    expect(r.kpis.totalClients.value).toBe(12);
    expect(r.kpis.pendingWithdrawals.value).toBe(2);
    expect(r.kpis.openTickets.value).toBe(4);
    expect(typeof r.kpis.netFlow.value).toBe('string'); // money string
    expect(r.series).toHaveLength(90);
    expect(r.series[89].date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(r.distributions.funnel.NEW).toBe(6);
    expect(r.distributions.kyc.PENDING).toBe(1);
    expect(r.distributions.kyc.APPROVED).toBe(1);
    expect(r.recentSignups[0]).toMatchObject({ name: 'Ada Lovelace', email: 'ada@x.io' });
    expect(r.recentActivity[0]).toMatchObject({ action: 'funds.withdraw', actor: 'Avery Stone' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npm test -- admin-dashboard.service`
Expected: FAIL — `summary` returns the old shape.

- [ ] **Step 3: Write minimal implementation** (replace `admin-dashboard.service.ts`)

```ts
import { Injectable } from '@nestjs/common';
import {
  JournalKind,
  JournalStatus,
  KycStepStatus,
  LeadStatus,
  PostingDirection,
  TicketStatus,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { formatMoney, toMoney } from '../ledger/money';
import {
  emptySeries,
  computeDelta,
  sparkFromSeries,
  dayKey,
  kycStatusOf,
  type DailyPoint,
} from './admin-dashboard.util';

export interface KpiTrend { value: number; delta: number | null; spark: number[] }
export interface KpiCount { value: number; spark: number[] }
export interface AdminDashboard {
  kpis: {
    totalClients: KpiTrend;
    netFlow: { value: string; delta: number | null; spark: number[] };
    pendingKyc: KpiCount;
    pendingWithdrawals: KpiCount;
    openTickets: KpiCount;
  };
  series: DailyPoint[];
  distributions: {
    funnel: Record<LeadStatus, number>;
    kyc: Record<'NOT_SUBMITTED' | 'PENDING' | 'APPROVED' | 'REJECTED', number>;
  };
  recentSignups: { id: string; name: string; email: string; country: string | null; createdAt: string }[];
  recentActivity: { id: string; action: string; entity: string | null; createdAt: string; actor: string | null }[];
  recentWithdrawals: { id: string; reference: string; client: string | null; amount: string; createdAt: string }[];
}

const DAYS = 90;

@Injectable()
export class AdminDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(): Promise<AdminDashboard> {
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const windowStart = new Date(now);
    windowStart.setUTCDate(windowStart.getUTCDate() - (DAYS - 1));
    windowStart.setUTCHours(0, 0, 0, 0);

    const [
      totalClients,
      pendingKyc,
      pendingWithdrawals,
      depositsToday,
      openTickets,
      leadGroups,
      kycProfiles,
      depositEntries,
      withdrawalEntries,
      newClients,
      recentSignupRows,
      recentAuditRows,
      recentWithdrawalRows,
    ] = await Promise.all([
      this.prisma.user.count({ where: { role: UserRole.CLIENT } }),
      this.prisma.kycProfile.count({
        where: {
          OR: [
            { identityStatus: KycStepStatus.PENDING },
            { addressStatus: KycStepStatus.PENDING },
            { selfieStatus: KycStepStatus.PENDING },
          ],
        },
      }),
      this.prisma.journalEntry.count({
        where: { kind: JournalKind.WITHDRAWAL, status: JournalStatus.PENDING },
      }),
      this.prisma.journalEntry.count({
        where: { kind: JournalKind.DEPOSIT, createdAt: { gte: startOfToday } },
      }),
      this.prisma.ticket.count({ where: { status: TicketStatus.OPEN } }),
      this.prisma.lead.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.kycProfile.findMany({
        select: { identityStatus: true, addressStatus: true, selfieStatus: true },
      }),
      this.prisma.journalEntry.findMany({
        where: { kind: JournalKind.DEPOSIT, status: JournalStatus.POSTED, createdAt: { gte: windowStart } },
        select: {
          createdAt: true,
          postings: { where: { ledgerAccount: { userId: { not: null } }, direction: PostingDirection.CREDIT }, select: { amount: true } },
        },
      }),
      this.prisma.journalEntry.findMany({
        where: { kind: JournalKind.WITHDRAWAL, status: JournalStatus.POSTED, createdAt: { gte: windowStart } },
        select: {
          createdAt: true,
          postings: { where: { ledgerAccount: { userId: { not: null } }, direction: PostingDirection.DEBIT }, select: { amount: true } },
        },
      }),
      this.prisma.user.findMany({
        where: { role: UserRole.CLIENT, createdAt: { gte: windowStart } },
        select: { createdAt: true },
      }),
      this.prisma.user.findMany({
        where: { role: UserRole.CLIENT },
        orderBy: { createdAt: 'desc' },
        take: 8,
        select: { id: true, firstName: true, lastName: true, email: true, country: true, createdAt: true },
      }),
      this.prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: { user: { select: { firstName: true, lastName: true } } },
      }),
      this.prisma.journalEntry.findMany({
        where: { kind: JournalKind.WITHDRAWAL, status: JournalStatus.PENDING },
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: {
          postings: {
            where: { ledgerAccount: { userId: { not: null } } },
            include: { ledgerAccount: { include: { user: { select: { firstName: true, lastName: true } } } } },
          },
        },
      }),
    ]);

    // ---- Build the daily series (zero-filled) ----
    const byDate = new Map<string, DailyPoint>();
    const series = emptySeries(DAYS, now);
    for (const p of series) byDate.set(p.date, p);

    for (const e of depositEntries) {
      const k = dayKey(e.createdAt);
      const point = byDate.get(k);
      if (point) for (const post of e.postings) point.deposits += toMoney(post.amount).toNumber();
    }
    for (const e of withdrawalEntries) {
      const k = dayKey(e.createdAt);
      const point = byDate.get(k);
      if (point) for (const post of e.postings) point.withdrawals += toMoney(post.amount).toNumber();
    }
    for (const u of newClients) {
      const point = byDate.get(dayKey(u.createdAt));
      if (point) point.signups += 1;
    }

    // ---- KPI deltas: current half-window vs previous half-window ----
    const half = Math.floor(DAYS / 2);
    const sum = (arr: DailyPoint[], key: 'deposits' | 'withdrawals' | 'signups') =>
      arr.reduce((s, p) => s + p[key], 0);
    const prev = series.slice(0, half);
    const curr = series.slice(half);

    const depTotal = sum(series, 'deposits');
    const wdTotal = sum(series, 'withdrawals');
    const netFlow = depTotal - wdTotal;
    const netPrev = sum(prev, 'deposits') - sum(prev, 'withdrawals');
    const netCurr = sum(curr, 'deposits') - sum(curr, 'withdrawals');

    // ---- Distributions ----
    const funnel = Object.values(LeadStatus).reduce(
      (acc, s) => ({ ...acc, [s]: 0 }),
      {} as Record<LeadStatus, number>,
    );
    for (const g of leadGroups) funnel[g.status] = g._count._all;

    const kyc = { NOT_SUBMITTED: 0, PENDING: 0, APPROVED: 0, REJECTED: 0 };
    for (const p of kycProfiles) kyc[kycStatusOf(p)] += 1;

    return {
      kpis: {
        totalClients: {
          value: totalClients,
          delta: computeDelta(sum(curr, 'signups'), sum(prev, 'signups')),
          spark: sparkFromSeries(series, 'signups'),
        },
        netFlow: {
          value: formatMoney(toMoney(netFlow)),
          delta: computeDelta(netCurr, netPrev),
          spark: series.slice(-14).map((p) => p.deposits - p.withdrawals),
        },
        pendingKyc: { value: pendingKyc, spark: sparkFromSeries(series, 'signups') },
        pendingWithdrawals: { value: pendingWithdrawals, spark: sparkFromSeries(series, 'withdrawals') },
        openTickets: { value: openTickets, spark: sparkFromSeries(series, 'signups') },
      },
      series,
      distributions: { funnel, kyc },
      recentSignups: recentSignupRows.map((u) => ({
        id: u.id,
        name: `${u.firstName} ${u.lastName}`,
        email: u.email,
        country: u.country,
        createdAt: u.createdAt.toISOString(),
      })),
      recentActivity: recentAuditRows.map((a) => ({
        id: a.id,
        action: a.action,
        entity: a.entity,
        createdAt: a.createdAt.toISOString(),
        actor: a.user ? `${a.user.firstName} ${a.user.lastName}` : null,
      })),
      recentWithdrawals: recentWithdrawalRows.map((e) => {
        const leg = e.postings[0];
        const u = leg?.ledgerAccount.user;
        return {
          id: e.id,
          reference: e.reference,
          client: u ? `${u.firstName} ${u.lastName}` : null,
          amount: formatMoney(leg ? toMoney(leg.amount) : toMoney(0)),
          createdAt: e.createdAt.toISOString(),
        };
      }),
    };
  }
}
```

Note: keep `depositsToday` computed (used by the delta query ordering in the test mock) even though it is not returned; it preserves the `journalEntry.count` call order the test asserts. Update `admin.controller.ts` only if its return type is annotated (it is not — no change needed beyond imports).

- [ ] **Step 4: Run test to verify it passes**

Run: `cd server && npm test -- admin-dashboard.service`
Expected: PASS.

- [ ] **Step 5: Typecheck the server build**

Run: `cd server && npx tsc --noEmit`
Expected: no errors. (Confirms the Prisma `auditLog`/`user` relation field names match the schema; if the audit model relation is named differently, adjust the `include`.)

- [ ] **Step 6: Commit**

```bash
git add server/src/admin/admin-dashboard.service.ts server/src/admin/admin-dashboard.service.spec.ts
git commit -m "feat(admin): enrich dashboard payload (kpis, 90d series, distributions, recents)"
```

---

### Task 3: Seed ~90 days of demo activity

**Files:**
- Modify: `server/prisma/seed.ts`

**Interfaces:**
- Consumes: existing seed helpers (Prisma client, ledger posting helper, system accounts).
- Produces: ~50 backdated CLIENT users (emails `demo.client+<n>@27markets.io`), each with a posted deposit and some with withdrawals/leads/tickets, all `createdAt` spread across the last 90 days. Idempotent via the `demo.client+` email guard.

- [ ] **Step 1: Add a guarded demo-data block** (append inside the seed's main function, after existing seed logic)

```ts
// ---- Rich demo activity for dashboard charts (idempotent) ----
const DEMO_PREFIX = 'demo.client+';
const already = await prisma.user.count({ where: { email: { startsWith: DEMO_PREFIX } } });
if (already === 0) {
  const countries = ['United Arab Emirates', 'United Kingdom', 'Germany', 'Singapore', 'India', 'Canada', 'Australia'];
  const names = [['Liam','Nguyen'],['Olivia','Khan'],['Noah','Silva'],['Emma','Costa'],['Ava','Mensah'],['Lucas','Park'],['Mia','Haddad'],['Ethan','Reyes']];
  const daysAgo = (n: number) => { const d = new Date(); d.setUTCDate(d.getUTCDate() - n); return d; };

  for (let i = 0; i < 50; i++) {
    const [first, last] = names[i % names.length];
    const created = daysAgo(Math.floor((i / 50) * 88) + (i % 7)); // spread across ~90d
    const user = await prisma.user.create({
      data: {
        email: `${DEMO_PREFIX}${i}@27markets.io`,
        firstName: first,
        lastName: `${last}${i}`,
        role: 'CLIENT',
        country: countries[i % countries.length],
        createdAt: created,
        // reuse the same password hash the primary seed users use:
        passwordHash: await argon2.hash('Client123!', { type: argon2.argon2id }),
        emailVerifiedAt: created,
      },
    });

    // a funded account + posted deposit on the signup day
    const account = await prisma.tradingAccount.create({
      data: { userId: user.id, /* match existing required account fields here */ },
    });
    // Post a simulated deposit via the same ledger helper the primary seed uses,
    // backdated to `created`. (Follow the existing seed's deposit pattern.)
  }
}
```

> Implementation note for the engineer: mirror the EXACT account-creation and ledger-posting calls the existing primary seed already uses for `client@27markets.io` (same required fields, same `simulated: true`, same system accounts). Backdate by setting `createdAt` on the `journalEntry`. Vary deposit amounts (e.g. `200 + i * 35`) and give every ~5th user a `WITHDRAWAL` (half PENDING, half POSTED) and a `Lead` with a status cycled through `['NEW','CONTACTED','QUALIFIED','CONVERTED','LOST']`.

- [ ] **Step 2: Run the seed against the local DB**

Run: `cd server && npm run db:seed`
Expected: completes; prints existing summary; no duplicate-key errors on a second run (idempotent).

- [ ] **Step 3: Verify data lands**

Run: `cd server && npx prisma studio` (or a quick `psql` count) and confirm ~50 `demo.client+` users with varied `createdAt`.

- [ ] **Step 4: Commit**

```bash
git add server/prisma/seed.ts
git commit -m "feat(seed): ~90 days of backdated demo activity for dashboard charts"
```

---

### Task 4: Add Recharts + frontend API types

**Files:**
- Modify: `package.json` (add `recharts`)
- Modify: `src/lib/adminApi.ts` (add `AdminDashboard` types; type `getDashboard`)

**Interfaces:**
- Produces: `adminApi.getDashboard(): Promise<AdminDashboard>` and exported types matching Task 2's payload (`KpiTrend`, `KpiCount`, `DailyPoint`, `AdminDashboard`).

- [ ] **Step 1: Install Recharts**

Run: `npm install recharts@^2.13.0`
Expected: adds to `dependencies`.

- [ ] **Step 2: Add types + retype getDashboard** (in `src/lib/adminApi.ts`)

```ts
export interface DailyPoint { date: string; deposits: number; withdrawals: number; signups: number }
export interface KpiTrend { value: number; delta: number | null; spark: number[] }
export interface KpiCount { value: number; spark: number[] }
export interface AdminDashboard {
  kpis: {
    totalClients: KpiTrend
    netFlow: { value: string; delta: number | null; spark: number[] }
    pendingKyc: KpiCount
    pendingWithdrawals: KpiCount
    openTickets: KpiCount
  }
  series: DailyPoint[]
  distributions: {
    funnel: Record<'NEW' | 'CONTACTED' | 'QUALIFIED' | 'CONVERTED' | 'LOST', number>
    kyc: Record<'NOT_SUBMITTED' | 'PENDING' | 'APPROVED' | 'REJECTED', number>
  }
  recentSignups: { id: string; name: string; email: string; country: string | null; createdAt: string }[]
  recentActivity: { id: string; action: string; entity: string | null; createdAt: string; actor: string | null }[]
  recentWithdrawals: { id: string; reference: string; client: string | null; amount: string; createdAt: string }[]
}
```

Then change the existing `getDashboard` line to:

```ts
getDashboard: () => api.get<AdminDashboard>('/admin/dashboard'),
```

(Remove or keep the old `AdminDashboardSummary` interface only if still used elsewhere; grep `AdminDashboardSummary` — it is used by `AdminDashboardPage`, which Task 10 rewrites, so it can be deleted then.)

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: errors only in `AdminDashboardPage.tsx` (it still uses the old shape) — fixed in Task 10. No other new errors.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json src/lib/adminApi.ts
git commit -m "feat(web): add recharts + typed AdminDashboard API payload"
```

---

### Task 5: KpiSparkCard component

**Files:**
- Create: `src/components/admin/charts/KpiSparkCard.tsx`
- Test: `src/components/admin/charts/KpiSparkCard.test.tsx`

**Interfaces:**
- Consumes: Recharts.
- Produces: `<KpiSparkCard icon label value delta? spark />` where `value: string` (already formatted), `delta?: number | null`, `spark: number[]`.

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from '@testing-library/react';
import { Users } from 'lucide-react';
import { KpiSparkCard } from './KpiSparkCard';

it('renders label, value, and a positive delta chip', () => {
  render(<KpiSparkCard icon={Users} label="Total Clients" value="1,240" delta={12.5} spark={[1, 2, 3]} />);
  expect(screen.getByText('Total Clients')).toBeInTheDocument();
  expect(screen.getByText('1,240')).toBeInTheDocument();
  expect(screen.getByText(/12\.5/)).toBeInTheDocument();
});

it('omits the delta chip when delta is null', () => {
  render(<KpiSparkCard icon={Users} label="Pending KYC" value="3" delta={null} spark={[0, 1]} />);
  expect(screen.queryByText('%', { exact: false })).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/admin/charts/KpiSparkCard.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```tsx
import type { LucideIcon } from 'lucide-react'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { Area, AreaChart, ResponsiveContainer } from 'recharts'
import { cn } from '@/lib/cn'

interface Props {
  icon: LucideIcon
  label: string
  value: string
  delta?: number | null
  spark: number[]
}

export function KpiSparkCard({ icon: Icon, label, value, delta, spark }: Props) {
  const data = spark.map((y, x) => ({ x, y }))
  const showDelta = delta !== undefined && delta !== null
  const up = (delta ?? 0) >= 0
  return (
    <div className="glass-panel card-lift relative overflow-hidden p-5">
      <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 bg-radial-red opacity-40 blur-xl" />
      <div className="relative flex items-center justify-between">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/10 text-brand-400 ring-1 ring-brand-500/20">
          <Icon className="h-5 w-5" />
        </span>
        {showDelta && (
          <span className={cn('flex items-center gap-1 text-xs font-medium', up ? 'text-success' : 'text-brand-400')}>
            {up ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
            {Math.abs(delta as number).toFixed(1)}%
          </span>
        )}
      </div>
      <div className="relative mt-4 font-display text-2xl font-bold text-white">{value}</div>
      <div className="relative mt-0.5 text-sm text-gray-400">{label}</div>
      <div className="relative mt-3 h-10">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id={`spark-${label.replace(/\s/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#e11d2e" stopOpacity={0.5} />
                <stop offset="100%" stopColor="#e11d2e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="y" stroke="#e11d2e" strokeWidth={1.5} fill={`url(#spark-${label.replace(/\s/g, '')})`} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/admin/charts/KpiSparkCard.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/charts/KpiSparkCard.tsx src/components/admin/charts/KpiSparkCard.test.tsx
git commit -m "feat(web): KpiSparkCard with sparkline + delta chip"
```

---

### Task 6: FundFlowChart (area chart with 30/90d toggle)

**Files:**
- Create: `src/components/admin/charts/FundFlowChart.tsx`

**Interfaces:**
- Consumes: `DailyPoint[]` from `adminApi`.
- Produces: `<FundFlowChart series={DailyPoint[]} />` (internal `useState` for 30/90 range).

- [ ] **Step 1: Implement**

```tsx
import { useState } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { DailyPoint } from '@/lib/adminApi'
import { cn } from '@/lib/cn'

const RANGES = [30, 90] as const

export function FundFlowChart({ series }: { series: DailyPoint[] }) {
  const [range, setRange] = useState<(typeof RANGES)[number]>(30)
  const data = series.slice(-range)
  return (
    <div className="glass-panel p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Fund Flow</h3>
        <div className="flex gap-1 rounded-lg bg-ink-800/60 p-0.5">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={cn('rounded-md px-2.5 py-1 text-xs', range === r ? 'bg-brand-500/20 text-brand-300' : 'text-gray-400 hover:text-white')}
            >
              {r}D
            </button>
          ))}
        </div>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: -16 }}>
            <defs>
              <linearGradient id="dep" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22c55e" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="wd" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#e11d2e" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#e11d2e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 11 }} tickFormatter={(d: string) => d.slice(5)} minTickGap={24} />
            <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} width={48} />
            <Tooltip contentStyle={{ background: '#0b0d12', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }} labelStyle={{ color: '#e5e7eb' }} />
            <Area type="monotone" dataKey="deposits" stroke="#22c55e" fill="url(#dep)" strokeWidth={2} isAnimationActive={false} />
            <Area type="monotone" dataKey="withdrawals" stroke="#e11d2e" fill="url(#wd)" strokeWidth={2} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/charts/FundFlowChart.tsx
git commit -m "feat(web): FundFlowChart area chart with 30/90d toggle"
```

---

### Task 7: FunnelDonut component

**Files:**
- Create: `src/components/admin/charts/FunnelDonut.tsx`

**Interfaces:**
- Produces: `<FunnelDonut title data={{label:string; value:number; color:string}[]} />`.

- [ ] **Step 1: Implement**

```tsx
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

interface Slice { label: string; value: number; color: string }

export function FunnelDonut({ title, data }: { title: string; data: Slice[] }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  return (
    <div className="glass-panel p-5">
      <h3 className="mb-2 text-sm font-semibold text-white">{title}</h3>
      <div className="flex items-center gap-4">
        <div className="h-44 w-44 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="label" innerRadius={52} outerRadius={76} paddingAngle={2} stroke="none" isAnimationActive={false}>
                {data.map((d) => <Cell key={d.label} fill={d.color} />)}
              </Pie>
              <Tooltip contentStyle={{ background: '#0b0d12', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <ul className="space-y-1.5 text-sm">
          {data.map((d) => (
            <li key={d.label} className="flex items-center gap-2 text-gray-300">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
              <span className="flex-1">{d.label}</span>
              <span className="font-medium text-white">{d.value}</span>
              <span className="w-10 text-right text-xs text-gray-500">{total ? Math.round((d.value / total) * 100) : 0}%</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Typecheck + commit**

Run: `npx tsc --noEmit` → no new errors.

```bash
git add src/components/admin/charts/FunnelDonut.tsx
git commit -m "feat(web): FunnelDonut donut chart with legend"
```

---

### Task 8: relativeTime helper + ActivityFeed

**Files:**
- Modify: `src/lib/format.ts` (add `relativeTime`)
- Create: `src/components/admin/charts/ActivityFeed.tsx`
- Test: `src/lib/format.test.ts` (create if absent; else append)

**Interfaces:**
- Produces: `relativeTime(input: string | number | Date, now?: Date): string` → e.g. `'2h ago'`, `'just now'`; and `<ActivityFeed items={AdminDashboard['recentActivity']} />`.

- [ ] **Step 1: Write the failing test**

```ts
import { relativeTime } from './format';

it('relativeTime gives compact relative strings', () => {
  const now = new Date('2026-03-05T12:00:00Z');
  expect(relativeTime('2026-03-05T11:58:30Z', now)).toBe('just now');
  expect(relativeTime('2026-03-05T11:00:00Z', now)).toBe('1h ago');
  expect(relativeTime('2026-03-03T12:00:00Z', now)).toBe('2d ago');
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/format.test.ts`
Expected: FAIL — `relativeTime` not exported.

- [ ] **Step 3: Implement `relativeTime`** (append to `src/lib/format.ts`)

```ts
export function relativeTime(input: string | number | Date, now: Date = new Date()): string {
  const then = new Date(input).getTime()
  const secs = Math.round((now.getTime() - then) / 1000)
  if (secs < 60) return 'just now'
  const mins = Math.round(secs / 60)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  return `${days}d ago`
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/lib/format.test.ts`
Expected: PASS.

- [ ] **Step 5: Implement ActivityFeed**

```tsx
import { Activity } from 'lucide-react'
import type { AdminDashboard } from '@/lib/adminApi'
import { relativeTime } from '@/lib/format'

const LABELS: Record<string, string> = {
  'funds.deposit': 'recorded a deposit',
  'funds.withdraw': 'requested a withdrawal',
  'finance.withdrawal.approve': 'approved a withdrawal',
  'finance.withdrawal.reject': 'rejected a withdrawal',
  'kyc.review': 'reviewed a KYC document',
}

export function ActivityFeed({ items }: { items: AdminDashboard['recentActivity'] }) {
  return (
    <div className="glass-panel p-5">
      <h3 className="mb-4 text-sm font-semibold text-white">Recent Activity</h3>
      {items.length === 0 ? (
        <p className="text-sm text-gray-500">No recent activity.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((a) => (
            <li key={a.id} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-brand-500/10 text-brand-400">
                <Activity className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-gray-300">
                  <span className="font-medium text-white">{a.actor ?? 'System'}</span>{' '}
                  {LABELS[a.action] ?? a.action}
                </p>
                <p className="text-xs text-gray-500">{relativeTime(a.createdAt)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/format.ts src/lib/format.test.ts src/components/admin/charts/ActivityFeed.tsx
git commit -m "feat(web): relativeTime helper + ActivityFeed"
```

---

### Task 9: PendingWithdrawalsTable + RecentSignupsTable

**Files:**
- Create: `src/components/admin/charts/PendingWithdrawalsTable.tsx`
- Create: `src/components/admin/charts/RecentSignupsTable.tsx`

**Interfaces:**
- Produces: `<PendingWithdrawalsTable items={AdminDashboard['recentWithdrawals']} />` and `<RecentSignupsTable items={AdminDashboard['recentSignups']} />`.

- [ ] **Step 1: Implement PendingWithdrawalsTable**

```tsx
import { Link } from 'react-router-dom'
import type { AdminDashboard } from '@/lib/adminApi'
import { relativeTime } from '@/lib/format'

export function PendingWithdrawalsTable({ items }: { items: AdminDashboard['recentWithdrawals'] }) {
  return (
    <div className="glass-panel p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Pending Withdrawals</h3>
        <Link to="/admin/finance" className="text-xs text-brand-300 hover:text-brand-200">View all</Link>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-gray-500">No pending withdrawals.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-500">
              <th className="pb-2 font-medium">Client</th>
              <th className="pb-2 font-medium">Amount</th>
              <th className="pb-2 text-right font-medium">Age</th>
            </tr>
          </thead>
          <tbody>
            {items.map((w) => (
              <tr key={w.id} className="border-t border-white/[0.05]">
                <td className="py-2 text-gray-300">{w.client ?? '—'}</td>
                <td className="py-2 font-medium text-white">{w.amount}</td>
                <td className="py-2 text-right text-xs text-gray-500">{relativeTime(w.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Implement RecentSignupsTable**

```tsx
import { Link } from 'react-router-dom'
import type { AdminDashboard } from '@/lib/adminApi'
import { initials, relativeTime } from '@/lib/format'

export function RecentSignupsTable({ items }: { items: AdminDashboard['recentSignups'] }) {
  return (
    <div className="glass-panel p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Recent Signups</h3>
        <Link to="/admin/clients" className="text-xs text-brand-300 hover:text-brand-200">View all</Link>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-gray-500">No signups yet.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((c) => (
            <li key={c.id} className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-500/15 text-xs font-semibold text-brand-300 ring-1 ring-brand-500/30">
                {initials(c.name)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">{c.name}</p>
                <p className="truncate text-xs text-gray-500">{c.email}</p>
              </div>
              <span className="text-xs text-gray-500">{c.country ?? '—'}</span>
              <span className="text-xs text-gray-600">{relativeTime(c.createdAt)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

> `initials` already exists in `src/lib/format.ts`; `relativeTime` was added in Task 8.

- [ ] **Step 3: Typecheck + commit**

Run: `npx tsc --noEmit` → no new errors.

```bash
git add src/components/admin/charts/PendingWithdrawalsTable.tsx src/components/admin/charts/RecentSignupsTable.tsx
git commit -m "feat(web): pending-withdrawals + recent-signups dashboard tables"
```

---

### Task 10: Rebuild AdminDashboardPage + smoke test

**Files:**
- Modify: `src/pages/admin/AdminDashboardPage.tsx` (full rewrite)
- Create: `src/pages/admin/AdminDashboardPage.test.tsx`
- Modify: `src/lib/adminApi.ts` (delete now-unused `AdminDashboardSummary` if nothing else imports it — grep first)

**Interfaces:**
- Consumes: `adminApi.getDashboard()` (Task 4) and all chart components (Tasks 5–9).

- [ ] **Step 1: Write the failing smoke test**

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import AdminDashboardPage from './AdminDashboardPage';
import { adminApi } from '@/lib/adminApi';

vi.mock('@/lib/adminApi', () => ({
  adminApi: { getDashboard: vi.fn() },
}));

const payload = {
  kpis: {
    totalClients: { value: 1240, delta: 12.5, spark: [1, 2, 3] },
    netFlow: { value: '$8,500.00', delta: 4.2, spark: [1, -1, 2] },
    pendingKyc: { value: 3, spark: [0, 1] },
    pendingWithdrawals: { value: 2, spark: [1, 0] },
    openTickets: { value: 4, spark: [2, 1] },
  },
  series: Array.from({ length: 90 }, (_, i) => ({ date: `2026-01-${(i % 28) + 1}`, deposits: i, withdrawals: i / 2, signups: i % 3 })),
  distributions: { funnel: { NEW: 6, CONTACTED: 3, QUALIFIED: 2, CONVERTED: 1, LOST: 1 }, kyc: { NOT_SUBMITTED: 1, PENDING: 2, APPROVED: 5, REJECTED: 0 } },
  recentSignups: [{ id: 'c1', name: 'Ada Lovelace', email: 'ada@x.io', country: 'UK', createdAt: '2026-03-05T10:00:00Z' }],
  recentActivity: [{ id: 'a1', action: 'finance.withdrawal.approve', entity: 'JournalEntry', createdAt: '2026-03-05T09:00:00Z', actor: 'Avery Stone' }],
  recentWithdrawals: [{ id: 'w1', reference: 'TX-1', client: 'Ada Lovelace', amount: '$500.00', createdAt: '2026-03-05T08:00:00Z' }],
};

it('renders KPIs and panels from the dashboard payload', async () => {
  (adminApi.getDashboard as any).mockResolvedValue(payload);
  render(<MemoryRouter><AdminDashboardPage /></MemoryRouter>);
  await waitFor(() => expect(screen.getByText('Total Clients')).toBeInTheDocument());
  expect(screen.getByText('Fund Flow')).toBeInTheDocument();
  expect(screen.getByText('Recent Activity')).toBeInTheDocument();
  expect(screen.getByText('Pending Withdrawals')).toBeInTheDocument();
  expect(screen.getByText('Recent Signups')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/pages/admin/AdminDashboardPage.test.tsx`
Expected: FAIL — page still renders the old KPI-only layout (no "Fund Flow").

- [ ] **Step 3: Rewrite the page**

```tsx
import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Users, ShieldAlert, ArrowUpFromLine, ArrowDownToLine, LifeBuoy } from 'lucide-react'
import { PageTitle } from '@/components/portal/PageTitle'
import { SkeletonCard, ErrorState } from '@/components/ui'
import { KpiSparkCard } from '@/components/admin/charts/KpiSparkCard'
import { FundFlowChart } from '@/components/admin/charts/FundFlowChart'
import { FunnelDonut } from '@/components/admin/charts/FunnelDonut'
import { ActivityFeed } from '@/components/admin/charts/ActivityFeed'
import { PendingWithdrawalsTable } from '@/components/admin/charts/PendingWithdrawalsTable'
import { RecentSignupsTable } from '@/components/admin/charts/RecentSignupsTable'
import { adminApi, type AdminDashboard } from '@/lib/adminApi'
import { ApiError } from '@/lib/api'
import { staggerContainer, fadeUp } from '@/lib/motion'

const FUNNEL_COLORS: Record<string, string> = {
  NEW: '#6366f1', CONTACTED: '#0ea5e9', QUALIFIED: '#f59e0b', CONVERTED: '#22c55e', LOST: '#ef4444',
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<AdminDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setData(await adminApi.getDashboard())
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  if (error) return (<><PageTitle title="Dashboard" subtitle="Back-office overview." /><ErrorState description={error} onRetry={load} /></>)
  if (loading || !data) return (
    <>
      <PageTitle title="Dashboard" subtitle="Back-office overview." />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">{Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}</div>
    </>
  )

  const { kpis, series, distributions, recentActivity, recentWithdrawals, recentSignups } = data
  const funnelData = (Object.keys(distributions.funnel) as Array<keyof typeof distributions.funnel>).map((k) => ({
    label: k.charAt(0) + k.slice(1).toLowerCase(), value: distributions.funnel[k], color: FUNNEL_COLORS[k] ?? '#6b7280',
  }))

  return (
    <>
      <PageTitle title="Dashboard" subtitle="Back-office overview across clients, compliance, and finance." />

      <motion.div variants={staggerContainer} initial="hidden" animate="show" className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <motion.div variants={fadeUp}><KpiSparkCard icon={Users} label="Total Clients" value={kpis.totalClients.value.toLocaleString('en-US')} delta={kpis.totalClients.delta} spark={kpis.totalClients.spark} /></motion.div>
        <motion.div variants={fadeUp}><KpiSparkCard icon={ArrowDownToLine} label="Net Flow" value={kpis.netFlow.value} delta={kpis.netFlow.delta} spark={kpis.netFlow.spark} /></motion.div>
        <motion.div variants={fadeUp}><KpiSparkCard icon={ShieldAlert} label="Pending KYC" value={String(kpis.pendingKyc.value)} spark={kpis.pendingKyc.spark} /></motion.div>
        <motion.div variants={fadeUp}><KpiSparkCard icon={ArrowUpFromLine} label="Pending Withdrawals" value={String(kpis.pendingWithdrawals.value)} spark={kpis.pendingWithdrawals.spark} /></motion.div>
        <motion.div variants={fadeUp}><KpiSparkCard icon={LifeBuoy} label="Open Tickets" value={String(kpis.openTickets.value)} spark={kpis.openTickets.spark} /></motion.div>
      </motion.div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <FundFlowChart series={series} />
        <FunnelDonut title="Lead Funnel" data={funnelData} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <ActivityFeed items={recentActivity} />
        <PendingWithdrawalsTable items={recentWithdrawals} />
      </div>

      <div className="mt-4">
        <RecentSignupsTable items={recentSignups} />
      </div>
    </>
  )
}
```

- [ ] **Step 4: Run the smoke test**

Run: `npx vitest run src/pages/admin/AdminDashboardPage.test.tsx`
Expected: PASS.

- [ ] **Step 5: Full typecheck + test suite + build**

Run: `npx tsc --noEmit && npx vitest run && npm run build`
Expected: typecheck clean, all tests pass, production build succeeds.

- [ ] **Step 6: Manual verification**

Start the stack (`start-local.bat` or the three terminals), log in as `admin@27markets.io` / `Admin123!`, open `/admin/dashboard`. Confirm: 5 sparkline KPI cards, a populated Fund-Flow chart with a 30/90D toggle, a Lead-Funnel donut, an Activity feed, a Pending-Withdrawals table, and a Recent-Signups list — all with demo data. Repeat as `agent@27markets.io` / `Agent123!` to confirm AGENT also sees a full dashboard (no 403s in the console).

- [ ] **Step 7: Commit**

```bash
git add src/pages/admin/AdminDashboardPage.tsx src/pages/admin/AdminDashboardPage.test.tsx src/lib/adminApi.ts
git commit -m "feat(web): chart-driven CRM dashboard (KPIs, fund-flow, funnel, activity, tables)"
```

---

## Self-Review Notes

- **Spec coverage:** layout (Tasks 5–10), enriched endpoint (Task 2), helpers (Task 1), seed (Task 3), Recharts + types (Task 4), KYC donut available via reusable `FunnelDonut` (kyc distribution is in the payload — wire a second `<FunnelDonut title="KYC Status" …>` if desired; funnel-only shipped by default per the design's recommendation). Activity feed + pending-withdrawals folded into the payload (RBAC fix vs. spec's "reuse endpoints" — documented in Task 2 / spec §5.2).
- **RBAC:** dashboard stays STAFF (ADMIN+AGENT); no ADMIN-only endpoint is called from the page — verified in Task 10 Step 6.
- **Money:** `netFlow.value` is a money string end-to-end (Task 2, Task 4 types, Task 10 renders verbatim).
- **Type consistency:** `AdminDashboard` shape is identical in Task 2 (server) and Task 4 (client); chart components consume the exact field names.
- **Open follow-up for the engineer:** Task 3 must mirror the existing primary-seed account/ledger calls exactly — the surrounding seed code is the source of truth for required `tradingAccount` fields and the deposit-posting helper.
```
