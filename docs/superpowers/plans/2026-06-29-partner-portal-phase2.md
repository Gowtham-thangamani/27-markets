# Partner/IB Portal — Phase 2 (Partner Portal + Dashboard) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An authenticated `/partner/*` portal for PARTNER users — a charted dashboard, a referred-clients list, and referral tools (link + copy + QR) — all scoped to the logged-in partner's own data, plus role-based login redirect.

**Architecture:** New `PartnerPortalController`/`PartnerPortalService` in the existing `partners` module expose PARTNER-scoped read endpoints keyed to `@CurrentUser('id')`, reusing the Phase-A aggregation helpers (`admin-dashboard.util`). Frontend mirrors the `/admin` shell (`RequirePartner` guard + `PartnerLayout`/sidebar) with three pages that reuse the existing Recharts components. Demo-partner seed + a `landingPathForRole` redirect helper.

**Tech Stack:** NestJS + Prisma + Jest (backend); React 18 + TS + Vite + Recharts + `qrcode.react` + Vitest/Testing-Library (frontend).

## Global Constraints

- All `/partner/*` endpoints gated to `@Roles(UserRole.PARTNER)`; every query filtered by the caller's id (`referredByPartnerId = currentUserId`) — a partner sees ONLY their own data.
- Reuse `admin-dashboard.util` helpers (`emptySeries`, `dayKey`, `computeDelta`, `sparkFromSeries`, `kycStatusOf`) — do not duplicate aggregation logic.
- Referral link format: `${CLIENT_ORIGIN}/register?ref=<referralCode>`.
- No commission anything (Phase 3) — the dashboard shows a static greyed "Commission — available soon" card only.
- Test convention: backend Jest `*.spec.ts` (`cd server && npm test -- <name>`); frontend Vitest `*.spec.tsx` (`npx vitest run <file>`); frontend specs use `globals:false` (explicit `import { it, expect, vi } from 'vitest'`) and wrap pages needing toasts in `ToastProvider`. Typecheck: backend `cd server && npx tsc --noEmit`; frontend `npx tsc --noEmit`.
- Demo partner: `partner@27markets.io` / `Partner123!`, referral code `DEMO27IB`.

---

### Task 1: `landingPathForRole` + `isPartnerRole` (frontend roles helper)

**Files:**
- Modify: `src/lib/roles.ts`
- Test: `src/lib/roles.spec.ts` (create)

**Interfaces:**
- Produces: `isPartnerRole(role: AppRole): boolean`; `landingPathForRole(role: AppRole): string`.

- [ ] **Step 1: Write the failing test**

```ts
import { it, expect } from 'vitest'
import { isPartnerRole, landingPathForRole } from './roles'

it('isPartnerRole is true only for PARTNER', () => {
  expect(isPartnerRole('PARTNER')).toBe(true)
  expect(isPartnerRole('CLIENT')).toBe(false)
  expect(isPartnerRole('ADMIN')).toBe(false)
})

it('landingPathForRole maps each role to its home', () => {
  expect(landingPathForRole('CLIENT')).toBe('/portal/dashboard')
  expect(landingPathForRole('PARTNER')).toBe('/partner/dashboard')
  expect(landingPathForRole('ADMIN')).toBe('/admin/dashboard')
  expect(landingPathForRole('AGENT')).toBe('/admin/dashboard')
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/roles.spec.ts`
Expected: FAIL — `isPartnerRole`/`landingPathForRole` not exported.

- [ ] **Step 3: Implement** (append to `src/lib/roles.ts`)

```ts
export const isPartnerRole = (role: AppRole): boolean => role === 'PARTNER'

/** Where each role lands after login. */
export const landingPathForRole = (role: AppRole): string => {
  if (isStaffRole(role)) return '/admin/dashboard'
  if (isPartnerRole(role)) return '/partner/dashboard'
  return '/portal/dashboard'
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/lib/roles.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/roles.ts src/lib/roles.spec.ts
git commit -m "feat(web): role landing-path + isPartnerRole helpers"
```

---

### Task 2: Partner portal backend (dashboard / clients / profile)

**Files:**
- Create: `server/src/partners/partner-portal.service.ts`, `server/src/partners/partner-portal.controller.ts`
- Modify: `server/src/partners/partners.module.ts` (register controller + service)
- Test: `server/src/partners/partner-portal.service.spec.ts`

**Interfaces:**
- Consumes: `admin-dashboard.util` helpers; `ConfigService` for `CLIENT_ORIGIN`.
- Produces:
  - `PartnerPortalService.dashboard(partnerId): Promise<PartnerDashboard>`
  - `PartnerPortalService.clients(partnerId): Promise<PartnerClient[]>`
  - `PartnerPortalService.profile(partnerId): Promise<{ referralCode: string; referralLink: string }>`
  - Routes `GET /partner/dashboard|clients|profile` (PARTNER only).
  - Types:
    ```ts
    type Kyc = 'NOT_SUBMITTED'|'PENDING'|'APPROVED'|'REJECTED'
    interface PartnerClient { id:string; name:string; email:string; country:string|null; kyc:Kyc; createdAt:string }
    interface PartnerDashboard {
      referralCode: string
      kpis: {
        totalReferred: { value:number; delta:number|null; spark:number[] }
        kycVerified:   { value:number; spark:number[] }
        signups30d:    { value:number; delta:number|null; spark:number[] }
      }
      series: { date:string; signups:number }[]
      kycDistribution: Record<Kyc, number>
      recentReferrals: PartnerClient[]
    }
    ```

- [ ] **Step 1: Write the failing test**

```ts
import { NotFoundException } from '@nestjs/common'
import { PartnerPortalService } from './partner-portal.service'

function clientRow(i: number, kyc: Partial<Record<'identityStatus'|'addressStatus'|'selfieStatus', string>> | null, daysAgo: number) {
  const d = new Date(); d.setUTCDate(d.getUTCDate() - daysAgo)
  return { id: `c${i}`, firstName: 'Cli', lastName: `Ent${i}`, email: `c${i}@x.io`, country: 'UK', createdAt: d,
    kycProfile: kyc ? { identityStatus: kyc.identityStatus ?? 'NOT_SUBMITTED', addressStatus: kyc.addressStatus ?? 'NOT_SUBMITTED', selfieStatus: kyc.selfieStatus ?? 'NOT_SUBMITTED' } : null }
}

function makeService(rows: any[], profile: any = { referralCode: 'ABC12345' }) {
  const prisma = {
    user: { findMany: jest.fn().mockResolvedValue(rows) },
    partnerProfile: { findUnique: jest.fn().mockResolvedValue(profile) },
  } as any
  const config = { get: jest.fn().mockReturnValue('https://app.example') } as any
  return new PartnerPortalService(prisma, config)
}

describe('PartnerPortalService.dashboard', () => {
  it('aggregates only the caller’s referred clients', async () => {
    const rows = [
      clientRow(1, { identityStatus:'APPROVED', addressStatus:'APPROVED', selfieStatus:'APPROVED' }, 2),
      clientRow(2, { identityStatus:'PENDING' }, 5),
      clientRow(3, null, 40),
    ]
    const svc = makeService(rows)
    const r = await svc.dashboard('p1')
    expect(r.referralCode).toBe('ABC12345')
    expect(r.kpis.totalReferred.value).toBe(3)
    expect(r.kpis.kycVerified.value).toBe(1)
    expect(r.series).toHaveLength(90)
    expect(r.kycDistribution.APPROVED).toBe(1)
    expect(r.kycDistribution.PENDING).toBe(1)
    expect(r.kycDistribution.NOT_SUBMITTED).toBe(1)
    expect(r.recentReferrals[0].id).toBe('c1') // newest first
    // queried scoped to the partner:
    expect((svc as any).prisma.user.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { referredByPartnerId: 'p1' } }))
  })

  it('throws 404 when the partner has no profile', async () => {
    const svc = makeService([], null)
    await expect(svc.dashboard('p1')).rejects.toBeInstanceOf(NotFoundException)
  })
})

describe('PartnerPortalService.profile', () => {
  it('returns the referral link from CLIENT_ORIGIN + code', async () => {
    const svc = makeService([], { referralCode: 'CODE9999' })
    const p = await svc.profile('p1')
    expect(p).toEqual({ referralCode: 'CODE9999', referralLink: 'https://app.example/register?ref=CODE9999' })
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd server && npm test -- partner-portal.service`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the service**

```ts
// server/src/partners/partner-portal.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { computeDelta, dayKey, emptySeries, kycStatusOf, sparkFromSeries } from '../admin/admin-dashboard.util';
import type { Env } from '../config/env.validation';

type Kyc = 'NOT_SUBMITTED' | 'PENDING' | 'APPROVED' | 'REJECTED';
export interface PartnerClient { id: string; name: string; email: string; country: string | null; kyc: Kyc; createdAt: string }
export interface PartnerDashboard {
  referralCode: string;
  kpis: {
    totalReferred: { value: number; delta: number | null; spark: number[] };
    kycVerified: { value: number; spark: number[] };
    signups30d: { value: number; delta: number | null; spark: number[] };
  };
  series: { date: string; signups: number }[];
  kycDistribution: Record<Kyc, number>;
  recentReferrals: PartnerClient[];
}

const DAYS = 90;
const CLIENT_SELECT = {
  id: true, firstName: true, lastName: true, email: true, country: true, createdAt: true,
  kycProfile: { select: { identityStatus: true, addressStatus: true, selfieStatus: true } },
} as const;

@Injectable()
export class PartnerPortalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  private kycOf(row: { kycProfile: { identityStatus: string; addressStatus: string; selfieStatus: string } | null }): Kyc {
    return row.kycProfile ? kycStatusOf(row.kycProfile) : 'NOT_SUBMITTED';
  }

  private toClient(row: any): PartnerClient {
    return { id: row.id, name: `${row.firstName} ${row.lastName}`, email: row.email, country: row.country, kyc: this.kycOf(row), createdAt: row.createdAt.toISOString() };
  }

  async dashboard(partnerId: string): Promise<PartnerDashboard> {
    const profile = await this.prisma.partnerProfile.findUnique({ where: { userId: partnerId } });
    if (!profile) throw new NotFoundException('Partner profile not found');

    const rows = await this.prisma.user.findMany({
      where: { referredByPartnerId: partnerId },
      orderBy: { createdAt: 'desc' },
      select: CLIENT_SELECT,
    });

    const now = new Date();
    const series = emptySeries(DAYS, now);
    const byDate = new Map(series.map((p) => [p.date, p]));
    for (const r of rows) {
      const point = byDate.get(dayKey(r.createdAt));
      if (point) point.signups += 1;
    }

    const half = Math.floor(DAYS / 2);
    const sum = (arr: typeof series) => arr.reduce((s, p) => s + p.signups, 0);
    const totalSpark = sparkFromSeries(series, 'signups');

    const thirty = new Date(now); thirty.setUTCDate(thirty.getUTCDate() - 30);
    const sixty = new Date(now); sixty.setUTCDate(sixty.getUTCDate() - 60);
    const signupsCurr = rows.filter((r) => r.createdAt >= thirty).length;
    const signupsPrev = rows.filter((r) => r.createdAt >= sixty && r.createdAt < thirty).length;

    const kycDistribution: Record<Kyc, number> = { NOT_SUBMITTED: 0, PENDING: 0, APPROVED: 0, REJECTED: 0 };
    for (const r of rows) kycDistribution[this.kycOf(r)] += 1;

    return {
      referralCode: profile.referralCode,
      kpis: {
        totalReferred: { value: rows.length, delta: computeDelta(sum(series.slice(half)), sum(series.slice(0, half))), spark: totalSpark },
        kycVerified: { value: kycDistribution.APPROVED, spark: totalSpark },
        signups30d: { value: signupsCurr, delta: computeDelta(signupsCurr, signupsPrev), spark: series.slice(-30).map((p) => p.signups) },
      },
      series: series.map((p) => ({ date: p.date, signups: p.signups })),
      kycDistribution,
      recentReferrals: rows.slice(0, 8).map((r) => this.toClient(r)),
    };
  }

  async clients(partnerId: string): Promise<PartnerClient[]> {
    const rows = await this.prisma.user.findMany({
      where: { referredByPartnerId: partnerId },
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: CLIENT_SELECT,
    });
    return rows.map((r) => this.toClient(r));
  }

  async profile(partnerId: string): Promise<{ referralCode: string; referralLink: string }> {
    const profile = await this.prisma.partnerProfile.findUnique({ where: { userId: partnerId } });
    if (!profile) throw new NotFoundException('Partner profile not found');
    const origin = this.config.get('CLIENT_ORIGIN', { infer: true });
    return { referralCode: profile.referralCode, referralLink: `${origin}/register?ref=${profile.referralCode}` };
  }
}
```

- [ ] **Step 4: Implement the controller**

```ts
// server/src/partners/partner-portal.controller.ts
import { Controller, Get, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser, Roles } from '../common/decorators';
import { PartnerPortalService } from './partner-portal.service';

@UseGuards(RolesGuard)
@Roles(UserRole.PARTNER)
@Controller('partner')
export class PartnerPortalController {
  constructor(private readonly portal: PartnerPortalService) {}

  @Get('dashboard')
  dashboard(@CurrentUser('id') userId: string) { return this.portal.dashboard(userId); }

  @Get('clients')
  clients(@CurrentUser('id') userId: string) { return this.portal.clients(userId); }

  @Get('profile')
  profile(@CurrentUser('id') userId: string) { return this.portal.profile(userId); }
}
```

Register both in `partners.module.ts`: add `PartnerPortalController` to `controllers` and `PartnerPortalService` to `providers`.

- [ ] **Step 5: Run tests + typecheck**

Run: `cd server && npm test -- partner-portal.service && npx tsc --noEmit`
Expected: PASS, zero type errors.

- [ ] **Step 6: Commit**

```bash
git add server/src/partners/partner-portal.service.ts server/src/partners/partner-portal.controller.ts server/src/partners/partner-portal.service.spec.ts server/src/partners/partners.module.ts
git commit -m "feat(partner): partner-scoped portal endpoints (dashboard, clients, profile)"
```

---

### Task 3: Seed demo partner + linked referred clients

**Files:**
- Modify: `server/prisma/seed.ts`

**Interfaces:**
- Produces: `partner@27markets.io` (PARTNER) + `PartnerProfile { referralCode: 'DEMO27IB' }`; ~18 existing `demo.client+` users get `referredByPartnerId` set to this partner.

- [ ] **Step 1: Add a guarded block** (inside `main()`, after the demo-clients block from Phase 1)

```ts
  // ── Demo partner (IB) with referred clients (idempotent) ──
  const demoPartner = await prisma.user.findUnique({ where: { email: 'partner@27markets.io' } });
  if (!demoPartner) {
    const partner = await prisma.user.create({
      data: {
        email: 'partner@27markets.io',
        passwordHash: await argon2.hash('Partner123!', { type: argon2.argon2id }),
        firstName: 'Sasha', lastName: 'Ibragimov',
        role: UserRole.PARTNER,
        country: 'United Arab Emirates',
        emailVerified: true,
        acceptedTermsAt: new Date(),
        partnerProfile: { create: { referralCode: 'DEMO27IB' } },
      },
    });
    // Attribute ~18 existing demo clients to this partner (spread across signups).
    const demoClients = await prisma.user.findMany({
      where: { email: { startsWith: 'demo.client+' } },
      orderBy: { createdAt: 'asc' },
      take: 18,
      select: { id: true },
    });
    for (const c of demoClients) {
      await prisma.user.update({ where: { id: c.id }, data: { referredByPartnerId: partner.id } });
    }
  }
```

> Implementation note: `UserRole` is already imported in `seed.ts`. The `demo.client+` users exist from Phase 1's seed block; this links a subset to the partner. Re-running is a no-op (guarded by the partner-exists check).

- [ ] **Step 2: Run the seed (twice for idempotency)**

Run: `cd server && npm run db:seed && npm run db:seed`
Expected: both complete; second run does not duplicate or error; prints the existing summary.

- [ ] **Step 3: Verify**

Run a quick count (psql or a temporary log): `partner@27markets.io` exists with `role=PARTNER`, has a `PartnerProfile` with code `DEMO27IB`, and ~18 users have `referredByPartnerId` set to it.

- [ ] **Step 4: Commit**

```bash
git add server/prisma/seed.ts
git commit -m "feat(seed): demo partner + referred clients for the partner portal"
```

---

### Task 4: `partnerApi` client + types

**Files:**
- Create: `src/lib/partnerApi.ts`

**Interfaces:**
- Produces: `partnerApi.getDashboard()`, `getClients()`, `getProfile()`; exported types `PartnerDashboard`, `PartnerClient`, `PartnerProfile`.

- [ ] **Step 1: Implement** (mirror `src/lib/adminApi.ts` `api` usage)

```ts
import { api } from './api'

export type Kyc = 'NOT_SUBMITTED' | 'PENDING' | 'APPROVED' | 'REJECTED'
export interface PartnerClient { id: string; name: string; email: string; country: string | null; kyc: Kyc; createdAt: string }
export interface PartnerDashboard {
  referralCode: string
  kpis: {
    totalReferred: { value: number; delta: number | null; spark: number[] }
    kycVerified: { value: number; spark: number[] }
    signups30d: { value: number; delta: number | null; spark: number[] }
  }
  series: { date: string; signups: number }[]
  kycDistribution: Record<Kyc, number>
  recentReferrals: PartnerClient[]
}
export interface PartnerProfile { referralCode: string; referralLink: string }

export const partnerApi = {
  getDashboard: () => api.get<PartnerDashboard>('/partner/dashboard'),
  getClients: () => api.get<PartnerClient[]>('/partner/clients'),
  getProfile: () => api.get<PartnerProfile>('/partner/profile'),
}
```

- [ ] **Step 2: Typecheck + commit**

Run: `npx tsc --noEmit` (errors only where pages don't exist yet — none here).

```bash
git add src/lib/partnerApi.ts
git commit -m "feat(web): partner portal API client + types"
```

---

### Task 5: `RequirePartner` route guard

**Files:**
- Create: `src/components/partner/RequirePartner.tsx`
- Test: `src/components/partner/RequirePartner.spec.tsx`

**Interfaces:**
- Consumes: `useAuth`, `isPartnerRole`/`isStaffRole` (Task 1).
- Produces: `<RequirePartner>{children}</RequirePartner>`.

- [ ] **Step 1: Write the failing test**

```tsx
import { it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { RequirePartner } from './RequirePartner'

function mockAuth(value: any) {
  vi.doMock('@/context/AuthContext', () => ({ useAuth: () => value }))
}

it('redirects a CLIENT away from partner routes', async () => {
  vi.resetModules()
  mockAuth({ user: { role: 'CLIENT' }, isAuthenticated: true, loading: false })
  const { RequirePartner: Guard } = await import('./RequirePartner')
  render(
    <MemoryRouter initialEntries={['/partner/dashboard']}>
      <Routes>
        <Route path="/partner/dashboard" element={<Guard><div>PARTNER AREA</div></Guard>} />
        <Route path="/portal/dashboard" element={<div>PORTAL</div>} />
      </Routes>
    </MemoryRouter>,
  )
  expect(screen.getByText('PORTAL')).toBeInTheDocument()
})

it('renders children for a PARTNER', () => {
  render(
    <MemoryRouter initialEntries={['/partner/dashboard']}>
      <Routes>
        <Route path="/partner/dashboard" element={
          <RequirePartnerWith role="PARTNER"><div>PARTNER AREA</div></RequirePartnerWith>
        } />
      </Routes>
    </MemoryRouter>,
  )
  expect(screen.getByText('PARTNER AREA')).toBeInTheDocument()
})
```

> Note for the implementer: the second test needs a PARTNER auth context. Use the same `vi.doMock` + dynamic-import pattern as the first test (mock `useAuth` to return `{ user: { role: 'PARTNER' }, isAuthenticated: true, loading: false }` and assert "PARTNER AREA" renders). Replace the `RequirePartnerWith` placeholder with that approach — keep ONE consistent mocking style across both cases. The behavioral assertions that matter: CLIENT → redirected to `/portal/dashboard`; PARTNER → children render; unauthenticated → redirected to `/login`.

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/components/partner/RequirePartner.spec.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement** (mirror `src/components/admin/RequireStaff.tsx`)

```tsx
import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { isPartnerRole, isStaffRole } from '@/lib/roles'
import { Logo } from '@/components/Logo'

/** Gate /partner routes behind an authenticated PARTNER session. */
export function RequirePartner({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <Logo withWordmark={false} size={40} />
        <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        <p className="text-sm text-gray-500">Checking access…</p>
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  const role = user.role as Parameters<typeof isPartnerRole>[0]
  if (!isPartnerRole(role)) {
    return <Navigate to={isStaffRole(role) ? '/admin/dashboard' : '/portal/dashboard'} replace />
  }

  return <>{children}</>
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/components/partner/RequirePartner.spec.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/partner/RequirePartner.tsx src/components/partner/RequirePartner.spec.tsx
git commit -m "feat(web): RequirePartner route guard"
```

---

### Task 6: Partner nav + sidebar + layout

**Files:**
- Create: `src/components/partner/partnerNav.ts`, `src/components/partner/PartnerSidebar.tsx`, `src/layouts/PartnerLayout.tsx`

**Interfaces:**
- Consumes: `useAuth`, `Logo`, `ThemeToggle`, `useBodyScrollLock`, `initials`.
- Produces: `partnerNav`, `PartnerSidebarContent`, `PartnerLayout` (renders `<Outlet/>`).

- [ ] **Step 1: Implement `partnerNav`**

```ts
// src/components/partner/partnerNav.ts
import { LayoutDashboard, Users, Share2, type LucideIcon } from 'lucide-react'

export interface PartnerNavItem { label: string; to: string; icon: LucideIcon }

export const partnerNav: PartnerNavItem[] = [
  { label: 'Dashboard', to: '/partner/dashboard', icon: LayoutDashboard },
  { label: 'Referred Clients', to: '/partner/clients', icon: Users },
  { label: 'Referral Tools', to: '/partner/tools', icon: Share2 },
]
```

- [ ] **Step 2: Implement `PartnerSidebar`** (mirror `AdminSidebar.tsx`, swap nav + badge text "Partner")

```tsx
// src/components/partner/PartnerSidebar.tsx
import { LogOut } from 'lucide-react'
import { NavLink, useNavigate } from 'react-router-dom'
import { Logo } from '@/components/Logo'
import { useAuth } from '@/context/AuthContext'
import { partnerNav } from './partnerNav'
import { cn } from '@/lib/cn'

export function PartnerSidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const handleLogout = async () => { await logout(); navigate('/login') }

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-2 border-b border-white/[0.06] px-5">
        <Logo size={26} />
        <span className="rounded-md bg-brand-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-300 ring-1 ring-brand-500/30">
          Partner
        </span>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {partnerNav.map((item) => (
          <NavLink key={item.to} to={item.to} onClick={onNavigate}
            className={({ isActive }) => cn(
              'group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors',
              isActive ? 'bg-brand-500/12 text-white ring-1 ring-brand-500/30' : 'text-gray-400 hover:bg-white/[0.04] hover:text-white',
            )}>
            <item.icon className="h-[18px] w-[18px]" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-white/[0.06] p-3">
        <button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-gray-400 transition-colors hover:bg-danger/10 hover:text-danger">
          <LogOut className="h-[18px] w-[18px]" /> Logout
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Implement `PartnerLayout`** (mirror `AdminLayout.tsx`: swap sidebar import, header label "Partner Portal", scroll id `partner-scroll`)

```tsx
// src/layouts/PartnerLayout.tsx
import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Menu } from 'lucide-react'
import { Outlet, useLocation } from 'react-router-dom'
import { PartnerSidebarContent } from '@/components/partner/PartnerSidebar'
import { ThemeToggle } from '@/components/ThemeToggle'
import { useAuth } from '@/context/AuthContext'
import { useBodyScrollLock } from '@/lib/hooks'
import { initials } from '@/lib/format'

export function PartnerLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { pathname } = useLocation()
  const { user } = useAuth()
  useBodyScrollLock(mobileOpen)
  useEffect(() => { setMobileOpen(false); document.querySelector('#partner-scroll')?.scrollTo({ top: 0 }) }, [pathname])

  return (
    <div className="flex h-dvh-safe overflow-hidden bg-ink-900">
      <a href="#partner-scroll" className="skip-link">Skip to content</a>
      <aside className="hidden w-64 shrink-0 border-r border-white/[0.06] bg-ink-850 lg:block">
        <PartnerSidebarContent />
      </aside>
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobileOpen(false)} />
            <motion.aside className="fixed inset-y-0 left-0 z-50 w-64 border-r border-white/[0.06] bg-ink-850 lg:hidden" initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'spring', stiffness: 320, damping: 34 }}>
              <PartnerSidebarContent onNavigate={() => setMobileOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-white/[0.06] bg-ink-900/85 px-4 backdrop-blur-xl sm:px-6">
          <button onClick={() => setMobileOpen(true)} className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-300 hover:bg-white/[0.06] hover:text-white lg:hidden" aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </button>
          <div className="hidden sm:block">
            <p className="text-xs text-gray-500">Partner Portal</p>
            <p className="text-sm font-semibold text-white">{user?.name ?? 'Partner'}</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-500/15 text-sm font-semibold text-brand-300 ring-1 ring-brand-500/30">
              {initials(user?.name ?? 'Partner')}
            </span>
          </div>
        </header>
        <main id="partner-scroll" tabIndex={-1} className="flex-1 overflow-y-auto outline-none">
          <div className="mx-auto w-full max-w-6xl p-4 sm:p-6 lg:p-8"><Outlet /></div>
        </main>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Typecheck + commit**

Run: `npx tsc --noEmit` → no new errors.

```bash
git add src/components/partner/partnerNav.ts src/components/partner/PartnerSidebar.tsx src/layouts/PartnerLayout.tsx
git commit -m "feat(web): partner portal layout, sidebar, nav"
```

---

### Task 7: Role-based login redirect

**Files:**
- Modify: `src/pages/auth/LoginPage.tsx` (the post-login `dest`)
- Test: `src/pages/auth/LoginPage.spec.tsx` (create)

**Interfaces:**
- Consumes: `landingPathForRole` (Task 1).

- [ ] **Step 1: Write the failing test**

```tsx
import { it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { ToastProvider } from '@/context/ToastContext'

const loginMock = vi.fn()
vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ login: loginMock }) }))

it('redirects a PARTNER to /partner/dashboard after login', async () => {
  loginMock.mockResolvedValue({ role: 'PARTNER' })
  const LoginPage = (await import('./LoginPage')).default
  render(
    <ToastProvider>
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/partner/dashboard" element={<div>PARTNER HOME</div>} />
        </Routes>
      </MemoryRouter>
    </ToastProvider>,
  )
  await userEvent.type(screen.getByLabelText(/email/i), 'p@x.io')
  await userEvent.type(screen.getByLabelText(/password/i), 'Partner123!')
  await userEvent.click(screen.getByRole('button', { name: /sign in|log in|login/i }))
  await waitFor(() => expect(screen.getByText('PARTNER HOME')).toBeInTheDocument())
})
```

> Note: match the real submit button label and field labels in `LoginPage.tsx`; adjust the queries if they differ. The behavioral assertion that matters: a PARTNER login lands on `/partner/dashboard`.

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/pages/auth/LoginPage.spec.tsx`
Expected: FAIL — currently lands on `/portal/dashboard` for non-staff.

- [ ] **Step 3: Implement** — in `LoginPage.tsx`:
  - Add import: `import { landingPathForRole } from '@/lib/roles'` (and drop the now-unused `isStaffRole` import if it's no longer referenced; if it's still used for the toast text, keep it).
  - Replace the `dest` line:
    ```ts
    const dest = explicitFrom ?? landingPathForRole(user.role)
    ```
  - (Leave the toast text as-is or simplify; not asserted.)

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/pages/auth/LoginPage.spec.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pages/auth/LoginPage.tsx src/pages/auth/LoginPage.spec.tsx
git commit -m "feat(web): role-based login redirect (partner -> /partner)"
```

---

### Task 8: Partner dashboard page + route group

**Files:**
- Create: `src/pages/partner/PartnerDashboardPage.tsx`, `src/components/partner/SignupsChart.tsx`
- Modify: `src/App.tsx` (add the `/partner` route group: `RequirePartner` + `PartnerLayout`, index→dashboard, `dashboard` route)
- Test: `src/pages/partner/PartnerDashboardPage.spec.tsx`

**Interfaces:**
- Consumes: `partnerApi.getDashboard` (Task 4); `KpiSparkCard`, `FunnelDonut` from `src/components/admin/charts/`; `partnerApi` types.
- Produces: live `/partner/dashboard`.

- [ ] **Step 1: Implement `SignupsChart`** (single-series area chart; Recharts)

```tsx
// src/components/partner/SignupsChart.tsx
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

export function SignupsChart({ data }: { data: { date: string; signups: number }[] }) {
  return (
    <div className="glass-panel p-5">
      <h3 className="mb-4 text-sm font-semibold text-white">Referred signups (90d)</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: -16 }}>
            <defs>
              <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#e11d2e" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#e11d2e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 11 }} tickFormatter={(d: string) => d.slice(5)} minTickGap={24} />
            <YAxis allowDecimals={false} tick={{ fill: '#6b7280', fontSize: 11 }} width={28} />
            <Tooltip contentStyle={{ background: '#0b0d12', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }} labelStyle={{ color: '#e5e7eb' }} />
            <Area type="monotone" dataKey="signups" stroke="#e11d2e" fill="url(#sg)" strokeWidth={2} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Write the failing smoke test**

```tsx
import { it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import PartnerDashboardPage from './PartnerDashboardPage'
import { partnerApi } from '@/lib/partnerApi'

vi.mock('@/lib/partnerApi', () => ({ partnerApi: { getDashboard: vi.fn() } }))

const payload = {
  referralCode: 'DEMO27IB',
  kpis: {
    totalReferred: { value: 18, delta: 12, spark: [1,2,3] },
    kycVerified: { value: 7, spark: [0,1,2] },
    signups30d: { value: 5, delta: -10, spark: [1,0,2] },
  },
  series: Array.from({ length: 90 }, (_, i) => ({ date: `2026-01-${(i % 28) + 1}`, signups: i % 3 })),
  kycDistribution: { NOT_SUBMITTED: 4, PENDING: 3, APPROVED: 7, REJECTED: 4 },
  recentReferrals: [{ id: 'c1', name: 'Ada Lovelace', email: 'ada@x.io', country: 'UK', kyc: 'APPROVED', createdAt: '2026-03-05T10:00:00Z' }],
}

it('renders KPIs, the commission placeholder, and the referral code', async () => {
  ;(partnerApi.getDashboard as any).mockResolvedValue(payload)
  render(<MemoryRouter><PartnerDashboardPage /></MemoryRouter>)
  await waitFor(() => expect(screen.getByText('Total Referred')).toBeInTheDocument())
  expect(screen.getByText(/commission/i)).toBeInTheDocument()
  expect(screen.getByText('Referred signups (90d)')).toBeInTheDocument()
  expect(screen.getByText(/DEMO27IB/)).toBeInTheDocument()
})
```

- [ ] **Step 3: Run to verify it fails**

Run: `npx vitest run src/pages/partner/PartnerDashboardPage.spec.tsx`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement the page** (reuse `KpiSparkCard`/`FunnelDonut`)

```tsx
import { useCallback, useEffect, useState } from 'react'
import { Users, ShieldCheck, UserPlus, Lock, Copy } from 'lucide-react'
import { PageTitle } from '@/components/portal/PageTitle'
import { SkeletonCard, ErrorState } from '@/components/ui'
import { KpiSparkCard } from '@/components/admin/charts/KpiSparkCard'
import { FunnelDonut } from '@/components/admin/charts/FunnelDonut'
import { SignupsChart } from '@/components/partner/SignupsChart'
import { useToast } from '@/context/ToastContext'
import { relativeTime } from '@/lib/format'
import { ApiError } from '@/lib/api'
import { partnerApi, type PartnerDashboard } from '@/lib/partnerApi'

const KYC_COLORS: Record<string, string> = { APPROVED: '#22c55e', PENDING: '#f59e0b', NOT_SUBMITTED: '#6b7280', REJECTED: '#ef4444' }

export default function PartnerDashboardPage() {
  const toast = useToast()
  const [data, setData] = useState<PartnerDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try { setData(await partnerApi.getDashboard()) }
    catch (e) { setError(e instanceof ApiError ? e.message : 'Failed to load') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void load() }, [load])

  if (error) return (<><PageTitle title="Dashboard" subtitle="Your referral performance." /><ErrorState description={error} onRetry={load} /></>)
  if (loading || !data) return (<><PageTitle title="Dashboard" subtitle="Your referral performance." /><div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{Array.from({length:4}).map((_,i)=><SkeletonCard key={i} />)}</div></>)

  const link = `${window.location.origin}/register?ref=${data.referralCode}`
  const kycData = (Object.keys(data.kycDistribution) as Array<keyof typeof data.kycDistribution>).map((k) => ({
    label: k.charAt(0) + k.slice(1).toLowerCase().replace('_', ' '), value: data.kycDistribution[k], color: KYC_COLORS[k] ?? '#6b7280',
  }))

  return (
    <>
      <PageTitle title="Dashboard" subtitle="Your referral performance." />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiSparkCard icon={Users} label="Total Referred" value={String(data.kpis.totalReferred.value)} delta={data.kpis.totalReferred.delta} spark={data.kpis.totalReferred.spark} />
        <KpiSparkCard icon={ShieldCheck} label="KYC Verified" value={String(data.kpis.kycVerified.value)} spark={data.kpis.kycVerified.spark} />
        <KpiSparkCard icon={UserPlus} label="Signups (30d)" value={String(data.kpis.signups30d.value)} delta={data.kpis.signups30d.delta} spark={data.kpis.signups30d.spark} />
        <div className="glass-panel relative overflow-hidden p-5 opacity-70">
          <div className="flex items-center justify-between">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-gray-500 ring-1 ring-white/10"><Lock className="h-5 w-5" /></span>
          </div>
          <div className="mt-4 font-display text-2xl font-bold text-gray-500">—</div>
          <div className="mt-0.5 text-sm text-gray-500">Commission · available soon</div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <SignupsChart data={data.series} />
        <FunnelDonut title="Referred KYC status" data={kycData} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="glass-panel p-5">
          <h3 className="mb-4 text-sm font-semibold text-white">Your referral link</h3>
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate rounded-lg border border-white/10 bg-ink-800/60 px-3 py-2 text-xs text-brand-300">{link}</code>
            <button onClick={() => { void navigator.clipboard?.writeText(link); toast.success('Copied', 'Referral link copied.') }} className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-3 py-2 text-xs text-gray-300 hover:bg-white/10 hover:text-white"><Copy className="h-3.5 w-3.5" /> Copy</button>
          </div>
          <p className="mt-2 text-xs text-gray-500">Share this link — anyone who registers through it is attributed to you.</p>
        </div>
        <div className="glass-panel p-5">
          <h3 className="mb-4 text-sm font-semibold text-white">Recent referrals</h3>
          {data.recentReferrals.length === 0 ? <p className="text-sm text-gray-500">No referrals yet.</p> : (
            <ul className="space-y-3">
              {data.recentReferrals.map((c) => (
                <li key={c.id} className="flex items-center justify-between text-sm">
                  <div className="min-w-0"><p className="truncate font-medium text-white">{c.name}</p><p className="truncate text-xs text-gray-500">{c.email}</p></div>
                  <span className="text-xs text-gray-500">{relativeTime(c.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  )
}
```

- [ ] **Step 5: Add the `/partner` route group to `App.tsx`**

Add imports:
```tsx
import { RequirePartner } from './components/partner/RequirePartner'
import { PartnerLayout } from './layouts/PartnerLayout'
import PartnerDashboardPage from './pages/partner/PartnerDashboardPage'
```
Add the route group (mirror the `/admin` group):
```tsx
<Route path="/partner" element={<RequirePartner><PartnerLayout /></RequirePartner>}>
  <Route index element={<Navigate to="/partner/dashboard" replace />} />
  <Route path="dashboard" element={<PartnerDashboardPage />} />
</Route>
```

- [ ] **Step 6: Run test + typecheck**

Run: `npx vitest run src/pages/partner/PartnerDashboardPage.spec.tsx && npx tsc --noEmit`
Expected: PASS, zero new type errors.

- [ ] **Step 7: Commit**

```bash
git add src/pages/partner/PartnerDashboardPage.tsx src/components/partner/SignupsChart.tsx src/pages/partner/PartnerDashboardPage.spec.tsx src/App.tsx
git commit -m "feat(web): partner dashboard page + /partner route group"
```

---

### Task 9: Referred-clients page

**Files:**
- Create: `src/pages/partner/PartnerClientsPage.tsx`
- Modify: `src/App.tsx` (add `clients` child route)
- Test: `src/pages/partner/PartnerClientsPage.spec.tsx`

**Interfaces:**
- Consumes: `partnerApi.getClients` (Task 4); `Badge`, `EmptyState`, `ErrorState`, `SkeletonRows`, `PageTitle`.

- [ ] **Step 1: Write the failing test**

```tsx
import { it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import PartnerClientsPage from './PartnerClientsPage'
import { partnerApi } from '@/lib/partnerApi'

vi.mock('@/lib/partnerApi', () => ({ partnerApi: { getClients: vi.fn().mockResolvedValue([
  { id: 'c1', name: 'Ada Lovelace', email: 'ada@x.io', country: 'UK', kyc: 'APPROVED', createdAt: '2026-03-05T10:00:00Z' },
]) } }))

it('lists referred clients with their KYC status', async () => {
  render(<MemoryRouter><PartnerClientsPage /></MemoryRouter>)
  expect(await screen.findByText('ada@x.io')).toBeInTheDocument()
  expect(screen.getByText('Ada Lovelace')).toBeInTheDocument()
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/pages/partner/PartnerClientsPage.spec.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement** (mirror `AdminKycPage` load pattern; KYC `Badge` tones via the real union — `success|warning|neutral|danger`)

```tsx
import { useCallback, useEffect, useState } from 'react'
import { Users } from 'lucide-react'
import { Badge, EmptyState, ErrorState, SkeletonRows } from '@/components/ui'
import { PageTitle } from '@/components/portal/PageTitle'
import { initials, formatDate } from '@/lib/format'
import { ApiError } from '@/lib/api'
import { partnerApi, type PartnerClient } from '@/lib/partnerApi'

const KYC_TONE: Record<string, 'success' | 'warning' | 'neutral' | 'danger'> = {
  APPROVED: 'success', PENDING: 'warning', NOT_SUBMITTED: 'neutral', REJECTED: 'danger',
}

export default function PartnerClientsPage() {
  const [rows, setRows] = useState<PartnerClient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try { setRows(await partnerApi.getClients()) }
    catch (e) { setError(e instanceof ApiError ? e.message : 'Failed to load') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void load() }, [load])

  return (
    <>
      <PageTitle title="Referred Clients" subtitle="Clients who signed up through your referral link." />
      {error ? <ErrorState description={error} onRetry={load} />
        : loading ? <SkeletonRows rows={6} />
        : rows.length === 0 ? <EmptyState icon={Users} title="No referrals yet" description="Share your referral link to start referring clients." />
        : (
          <div className="glass-panel overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-white/[0.06] text-left text-xs text-gray-500">
                <th className="px-5 py-3 font-medium">Client</th><th className="px-5 py-3 font-medium">Country</th><th className="px-5 py-3 font-medium">KYC</th><th className="px-5 py-3 font-medium">Joined</th>
              </tr></thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.id} className="border-b border-white/[0.04] last:border-0">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500/15 text-xs font-semibold text-brand-300 ring-1 ring-brand-500/30">{initials(c.name)}</span>
                        <div><div className="font-medium text-white">{c.name}</div><div className="text-xs text-gray-500">{c.email}</div></div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-gray-300">{c.country ?? '—'}</td>
                    <td className="px-5 py-3"><Badge tone={KYC_TONE[c.kyc] ?? 'neutral'} dot>{c.kyc.replace('_', ' ')}</Badge></td>
                    <td className="px-5 py-3 text-xs text-gray-500">{formatDate(c.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </>
  )
}
```

> Confirm `Badge` tone names against `@/components/ui`/`adminMaps` (the partner-applications page used `success|warning|danger`; `neutral` should exist — if not, use the real "no-status" tone).

- [ ] **Step 4: Add the route** in `App.tsx` under the `/partner` group:
```tsx
<Route path="clients" element={<PartnerClientsPage />} />
```
(+ the import).

- [ ] **Step 5: Run test + typecheck**

Run: `npx vitest run src/pages/partner/PartnerClientsPage.spec.tsx && npx tsc --noEmit`
Expected: PASS, zero new errors.

- [ ] **Step 6: Commit**

```bash
git add src/pages/partner/PartnerClientsPage.tsx src/App.tsx
git commit -m "feat(web): partner referred-clients page"
```

---

### Task 10: Referral tools page (+ QR) and final build verification

**Files:**
- Create: `src/pages/partner/PartnerReferralToolsPage.tsx`
- Modify: `src/App.tsx` (add `tools` child route), `package.json` (add `qrcode.react`)
- Test: `src/pages/partner/PartnerReferralToolsPage.spec.tsx`

**Interfaces:**
- Consumes: `partnerApi.getProfile` (Task 4); `qrcode.react` `QRCodeSVG`.

- [ ] **Step 1: Install QR dependency**

Run: `npm install qrcode.react@^4.1.0`
Expected: added to `dependencies`.

- [ ] **Step 2: Write the failing test**

```tsx
import { it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ToastProvider } from '@/context/ToastContext'
import PartnerReferralToolsPage from './PartnerReferralToolsPage'
import { partnerApi } from '@/lib/partnerApi'

vi.mock('@/lib/partnerApi', () => ({ partnerApi: { getProfile: vi.fn().mockResolvedValue({ referralCode: 'DEMO27IB', referralLink: 'https://app/register?ref=DEMO27IB' }) } }))

it('shows the referral link and a QR code', async () => {
  render(<ToastProvider><PartnerReferralToolsPage /></ToastProvider>)
  expect(await screen.findByText(/register\?ref=DEMO27IB/)).toBeInTheDocument()
  // QRCodeSVG renders an <svg>
  expect(document.querySelector('svg')).toBeInTheDocument()
})
```

- [ ] **Step 3: Run to verify it fails**

Run: `npx vitest run src/pages/partner/PartnerReferralToolsPage.spec.tsx`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement**

```tsx
import { useCallback, useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Copy, Share2 } from 'lucide-react'
import { PageTitle } from '@/components/portal/PageTitle'
import { SkeletonRows, ErrorState } from '@/components/ui'
import { useToast } from '@/context/ToastContext'
import { ApiError } from '@/lib/api'
import { partnerApi, type PartnerProfile } from '@/lib/partnerApi'

export default function PartnerReferralToolsPage() {
  const toast = useToast()
  const [profile, setProfile] = useState<PartnerProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try { setProfile(await partnerApi.getProfile()) }
    catch (e) { setError(e instanceof ApiError ? e.message : 'Failed to load') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void load() }, [load])

  if (error) return (<><PageTitle title="Referral Tools" subtitle="Share your link and grow your network." /><ErrorState description={error} onRetry={load} /></>)
  if (loading || !profile) return (<><PageTitle title="Referral Tools" subtitle="Share your link and grow your network." /><SkeletonRows rows={4} /></>)

  const shareText = `Join me on 27 Markets — trade 100+ global markets. Sign up with my link: ${profile.referralLink}`
  const copy = (text: string, what: string) => { void navigator.clipboard?.writeText(text); toast.success('Copied', `${what} copied.`) }

  return (
    <>
      <PageTitle title="Referral Tools" subtitle="Share your link and grow your network." />
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-4">
          <div className="glass-panel p-5">
            <h3 className="mb-3 text-sm font-semibold text-white">Referral link</h3>
            <div className="flex items-center gap-2">
              <code className="flex-1 truncate rounded-lg border border-white/10 bg-ink-800/60 px-3 py-2 text-xs text-brand-300">{profile.referralLink}</code>
              <button onClick={() => copy(profile.referralLink, 'Link')} className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-3 py-2 text-xs text-gray-300 hover:bg-white/10 hover:text-white"><Copy className="h-3.5 w-3.5" /> Copy</button>
            </div>
            <p className="mt-2 text-xs text-gray-500">Referral code: <span className="font-mono text-brand-300">{profile.referralCode}</span></p>
          </div>
          <div className="glass-panel p-5">
            <h3 className="mb-3 text-sm font-semibold text-white">Share message</h3>
            <p className="rounded-lg border border-white/10 bg-ink-800/60 p-3 text-sm text-gray-300">{shareText}</p>
            <button onClick={() => copy(shareText, 'Message')} className="mt-3 inline-flex items-center gap-1 rounded-lg border border-white/10 px-3 py-2 text-xs text-gray-300 hover:bg-white/10 hover:text-white"><Share2 className="h-3.5 w-3.5" /> Copy message</button>
          </div>
        </div>
        <div className="glass-panel flex flex-col items-center justify-center p-5">
          <h3 className="mb-4 text-sm font-semibold text-white">Scan to refer</h3>
          <div className="rounded-xl bg-white p-3"><QRCodeSVG value={profile.referralLink} size={168} /></div>
          <p className="mt-3 text-center text-xs text-gray-500">Point a phone camera at this code to open your referral link.</p>
        </div>
      </div>
    </>
  )
}
```

- [ ] **Step 5: Add the route** in `App.tsx` under the `/partner` group:
```tsx
<Route path="tools" element={<PartnerReferralToolsPage />} />
```
(+ the import).

- [ ] **Step 6: Full verification**

Run: `npx vitest run src/pages/partner/PartnerReferralToolsPage.spec.tsx`
Then: `npx tsc --noEmit && npx vitest run && npm run build`
Expected: the tools test passes; typecheck clean; full suite passes (a pre-existing AdminAccountsPage concurrency flake may appear — note it, it's not from this work); production build succeeds.

- [ ] **Step 7: Manual verification**

Re-seed (`cd server && npm run db:seed`), start the stack, log in as `partner@27markets.io` / `Partner123!` → confirm you land on `/partner/dashboard`, see populated KPIs + signups chart + KYC donut + recent referrals + referral link, and that `/partner/clients` lists the ~18 referred clients and `/partner/tools` shows the link + copy + a QR. Confirm a CLIENT (`client@27markets.io`) hitting `/partner/dashboard` is redirected to `/portal`.

- [ ] **Step 8: Commit**

```bash
git add src/pages/partner/PartnerReferralToolsPage.tsx src/pages/partner/PartnerReferralToolsPage.spec.tsx src/App.tsx package.json package-lock.json
git commit -m "feat(web): partner referral tools page with QR code"
```

---

## Self-Review Notes

- **Spec coverage:** roles helper + login redirect (Tasks 1, 7); backend dashboard/clients/profile + RBAC (Task 2); demo seed (Task 3); partnerApi (Task 4); RequirePartner (Task 5); layout/sidebar/nav (Task 6); dashboard page + route group + "commission soon" + charts (Task 8); clients page (Task 9); tools page + QR (Task 10). All spec §4–§9 map to a task.
- **RBAC:** `/partner/*` gated `@Roles(PARTNER)` (Task 2); frontend `RequirePartner` redirects non-partners (Task 5). The PARTNER-only-200 / CLIENT-403 path is enforced server-side; a focused backend RBAC e2e is deferred to the existing role-sweep (the one ⚠️ a reviewer should note).
- **Type consistency:** `PartnerDashboard`/`PartnerClient`/`PartnerProfile` identical in backend (Task 2) and `partnerApi` (Task 4); the dashboard page consumes the exact field names; `landingPathForRole` signature consistent (Tasks 1, 5, 7).
- **Reuse:** `admin-dashboard.util` helpers (Task 2), `KpiSparkCard`/`FunnelDonut` (Task 8) reused, not duplicated. New `SignupsChart` is single-series (the admin `FundFlowChart` is two-series), justified.
- **Known soft spots flagged inline:** confirm `Badge` tone union (Task 9); the `RequirePartner` test's two-case mocking style (Task 5); LoginPage button/label queries (Task 7).
- **Out of scope (later phases):** commission config/engine, two-tier, payouts.
