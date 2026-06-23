# CRM Phase 2 — Admin Shell + Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the staff-facing admin shell — a guarded `/admin` route group with its own layout/sidebar, a `RequireStaff` gate, and a Dashboard that shows live KPI counts from a new backend endpoint.

**Architecture:** Extend the existing React SPA with an `/admin` route group behind a new `RequireStaff` guard (Admin+Agent only), rendering an `AdminLayout` that reuses the existing `ui/` primitives and black/red tokens. KPIs come from a new guarded `GET /admin/dashboard` endpoint on the existing NestJS app, consumed through a thin typed `adminApi` that reuses the existing `api` fetch client. The frontend has no test runner yet, so this phase adds Vitest + React Testing Library first.

**Tech Stack:** React 18 + Vite 5 + TypeScript, React Router v6, Tailwind, lucide-react, framer-motion; Vitest + @testing-library/react (new). Backend: NestJS 10 + Prisma 5, Jest (already set up in Phase 1).

## Global Constraints

- Frontend work is under the repo root (`src/`); backend work is under `server/`.
- Reuse the existing `api` client (`src/lib/api.ts`) for all HTTP — do NOT duplicate the fetch/refresh logic. The admin API surface is a thin typed wrapper over it.
- API base URL is `import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api'` (already handled by `api`).
- Staff = `ADMIN` + `AGENT`. The admin area is gated on the frontend by `RequireStaff` and on the backend by the existing class-level `@UseGuards(RolesGuard)` + `@Roles(...STAFF_ROLES)` on `AdminController` (added in Phase 1).
- Reuse existing design tokens/utilities: `glass-panel`, `card-lift`, `bg-ink-900`/`ink-850`, `brand-500`, and the existing `KpiWidget`, `Skeleton`, `EmptyState`/`ErrorState` (`@/components/ui`).
- No money movement; SIMULATION rail untouched. This phase only READS aggregate counts.
- `npm run typecheck`-equivalent must stay clean: frontend `npx tsc -b` (or `npm run build`) and backend `npm run typecheck` both pass. Frontend tests run with `npm test` (Vitest); backend with `npm test` (Jest) from `server/`.
- Backend KPI endpoint path: `GET /api/admin/dashboard` (the global prefix `api` + controller `admin`).

## File Structure

Backend:
- Create `server/src/admin/admin-dashboard.service.ts` — computes the 5 KPI counts via Prisma. One responsibility: dashboard aggregation.
- Modify `server/src/admin/admin.controller.ts` — add `GET dashboard` route.
- Modify `server/src/admin/admin.module.ts` — register the service.
- Create `server/src/admin/admin-dashboard.service.spec.ts` — unit test with mocked Prisma.

Frontend:
- Create `vitest.config.ts`, `src/test/setup.ts` — test harness.
- Modify `package.json` — test deps + scripts.
- Modify `src/lib/types.ts` — add `AppRole` + `role` on `UserProfile`.
- Modify `src/lib/apiMappers.ts` — carry `role` through `mapUser`.
- Create `src/lib/roles.ts` (+ `.spec.ts`) — `isStaffRole` helper.
- Create `src/lib/adminApi.ts` — typed admin API (dashboard).
- Create `src/components/admin/RequireStaff.tsx` (+ `.spec.tsx`) — role gate.
- Create `src/components/admin/adminNav.ts` — sidebar items.
- Create `src/components/admin/AdminSidebar.tsx` (+ `.spec.tsx`) — sidebar content.
- Create `src/layouts/AdminLayout.tsx` — shell (sidebar + topbar + outlet).
- Create `src/pages/admin/AdminDashboardPage.tsx` (+ `.spec.tsx`) — KPI dashboard.
- Modify `src/App.tsx` — wire `/admin` routes.

---

### Task 1: Backend — `GET /admin/dashboard` KPI endpoint

**Files:**
- Create: `server/src/admin/admin-dashboard.service.ts`
- Create: `server/src/admin/admin-dashboard.service.spec.ts`
- Modify: `server/src/admin/admin.controller.ts`
- Modify: `server/src/admin/admin.module.ts`

**Interfaces:**
- Consumes: `PrismaService` (global), the existing class guard on `AdminController`.
- Produces: `GET /api/admin/dashboard` → `AdminDashboardSummary`:
  ```ts
  interface AdminDashboardSummary {
    totalClients: number;       // users with role CLIENT
    pendingKyc: number;         // KYC profiles with any step PENDING
    pendingWithdrawals: number; // WITHDRAWAL journal entries with status PENDING
    depositsToday: number;      // DEPOSIT journal entries created since local midnight (count)
    openTickets: number;        // tickets with status OPEN
  }
  ```

- [ ] **Step 1: Write the failing service test**

Create `server/src/admin/admin-dashboard.service.spec.ts`:
```ts
import { AdminDashboardService } from './admin-dashboard.service';

describe('AdminDashboardService', () => {
  it('summary aggregates the five KPI counts', async () => {
    const prisma = {
      user: { count: jest.fn().mockResolvedValue(12) },
      kycProfile: { count: jest.fn().mockResolvedValue(3) },
      journalEntry: { count: jest.fn().mockResolvedValueOnce(2).mockResolvedValueOnce(5) },
      ticket: { count: jest.fn().mockResolvedValue(4) },
    } as any;
    const service = new AdminDashboardService(prisma);

    const result = await service.summary();

    expect(result).toEqual({
      totalClients: 12,
      pendingKyc: 3,
      pendingWithdrawals: 2,
      depositsToday: 5,
      openTickets: 4,
    });
    expect(prisma.user.count).toHaveBeenCalledWith({ where: { role: 'CLIENT' } });
    expect(prisma.ticket.count).toHaveBeenCalledWith({ where: { status: 'OPEN' } });
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run (from `server/`): `npm test -- admin-dashboard.service.spec`
Expected: FAIL — cannot find module `./admin-dashboard.service`.

- [ ] **Step 3: Implement the service**

Create `server/src/admin/admin-dashboard.service.ts`:
```ts
import { Injectable } from '@nestjs/common';
import {
  JournalKind,
  JournalStatus,
  KycStepStatus,
  TicketStatus,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface AdminDashboardSummary {
  totalClients: number;
  pendingKyc: number;
  pendingWithdrawals: number;
  depositsToday: number;
  openTickets: number;
}

@Injectable()
export class AdminDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(): Promise<AdminDashboardSummary> {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [totalClients, pendingKyc, pendingWithdrawals, depositsToday, openTickets] =
      await Promise.all([
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
      ]);

    return { totalClients, pendingKyc, pendingWithdrawals, depositsToday, openTickets };
  }
}
```
NOTE: the test asserts the WITHDRAWAL count resolves before the DEPOSIT count (`mockResolvedValueOnce(2)` then `(5)`). The `Promise.all` order above calls `journalEntry.count` for withdrawals first, then deposits — keep that order.

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- admin-dashboard.service.spec`
Expected: PASS — 1 test.

- [ ] **Step 5: Add the controller route**

Modify `server/src/admin/admin.controller.ts`. Add the import and the constructor + route (keep the existing class decorators and `ping`):
```ts
import { Controller, Get, UseGuards } from '@nestjs/common';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser, Roles, type AuthUser } from '../common/decorators';
import { STAFF_ROLES } from '../common/roles';
import { AdminDashboardService } from './admin-dashboard.service';

@UseGuards(RolesGuard)
@Roles(...STAFF_ROLES)
@Controller('admin')
export class AdminController {
  constructor(private readonly dashboard: AdminDashboardService) {}

  @Get('ping')
  ping(@CurrentUser() user: AuthUser) {
    return { ok: true, staff: { id: user.id, email: user.email, role: user.role } };
  }

  @Get('dashboard')
  summary() {
    return this.dashboard.summary();
  }
}
```

- [ ] **Step 6: Register the service in the module**

Modify `server/src/admin/admin.module.ts`:
```ts
import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminDashboardService } from './admin-dashboard.service';

@Module({
  controllers: [AdminController],
  providers: [AdminDashboardService],
})
export class AdminModule {}
```

- [ ] **Step 7: Run full backend suite + typecheck**

Run: `npm test`
Expected: all suites PASS (Phase 1 tests + the new one).
Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add server/src/admin
git commit -m "feat(server): add GET /admin/dashboard KPI summary endpoint"
```

---

### Task 2: Frontend — add Vitest + React Testing Library harness

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `src/test/setup.ts`
- Create: `src/lib/cn.spec.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `npm test` runs Vitest over `**/*.spec.{ts,tsx}` in a jsdom environment with `@testing-library/jest-dom` matchers; the `@` alias resolves in tests.

- [ ] **Step 1: Add dev dependencies and scripts**

In `package.json`, add to `scripts`:
```json
"test": "vitest run",
"test:watch": "vitest"
```
Add to `devDependencies`:
```json
"@testing-library/jest-dom": "^6.5.0",
"@testing-library/react": "^16.0.1",
"jsdom": "^25.0.1",
"vitest": "^2.1.8"
```

- [ ] **Step 2: Install**

Run: `npm install`
Expected: completes; `node_modules/.bin/vitest` exists.

- [ ] **Step 3: Create the Vitest config**

Create `vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  test: {
    environment: 'jsdom',
    globals: false,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
});
```

- [ ] **Step 4: Create the test setup file**

Create `src/test/setup.ts`:
```ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 5: Write a smoke test for the `cn` util**

Create `src/lib/cn.spec.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { cn } from './cn';

describe('cn', () => {
  it('merges class names and drops falsy values', () => {
    expect(cn('a', false && 'b', 'c')).toBe('a c');
  });
});
```
NOTE: open `src/lib/cn.ts` first; if `cn`'s merge behavior differs (it uses tailwind-merge/clsx), adjust the expectation to a true statement about the real function while still asserting something meaningful.

- [ ] **Step 6: Run the test**

Run: `npm test`
Expected: PASS — at least 1 file, 1 test.

- [ ] **Step 7: Verify the build still typechecks**

Run: `npx tsc -b`
Expected: no errors (test files compile with explicit vitest imports).

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json vitest.config.ts src/test/setup.ts src/lib/cn.spec.ts
git commit -m "test(web): add Vitest + Testing Library harness"
```

---

### Task 3: Frontend — surface the user's role

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/lib/apiMappers.ts`
- Create: `src/lib/roles.ts`
- Create: `src/lib/roles.spec.ts`
- Create: `src/lib/apiMappers.spec.ts`

**Interfaces:**
- Consumes: `ApiUser` (already has `role: string`), `UserProfile`.
- Produces:
  - `AppRole = 'CLIENT' | 'PARTNER' | 'ADMIN' | 'AGENT'` and `role: AppRole` on `UserProfile`.
  - `isStaffRole(role: AppRole): boolean` (true for ADMIN/AGENT).

- [ ] **Step 1: Write the failing roles test**

Create `src/lib/roles.spec.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { isStaffRole } from './roles';

describe('isStaffRole', () => {
  it('is true for ADMIN and AGENT', () => {
    expect(isStaffRole('ADMIN')).toBe(true);
    expect(isStaffRole('AGENT')).toBe(true);
  });
  it('is false for CLIENT and PARTNER', () => {
    expect(isStaffRole('CLIENT')).toBe(false);
    expect(isStaffRole('PARTNER')).toBe(false);
  });
});
```

- [ ] **Step 2: Write the failing mapUser test**

Create `src/lib/apiMappers.spec.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { mapUser, type ApiUser } from './apiMappers';

describe('mapUser', () => {
  it('carries the role through to the profile', () => {
    const api: ApiUser = {
      id: 'u1',
      email: 'a@b.com',
      firstName: 'Ada',
      lastName: 'Lovelace',
      phone: null,
      country: null,
      role: 'AGENT',
      twoFactorEnabled: false,
      joinedAt: '2026-01-01',
    };
    const profile = mapUser(api);
    expect(profile.role).toBe('AGENT');
    expect(profile.name).toBe('Ada Lovelace');
  });
});
```

- [ ] **Step 3: Run both to verify they fail**

Run: `npm test -- roles apiMappers`
Expected: FAIL — `./roles` not found; `profile.role` is undefined / type error.

- [ ] **Step 4: Add the AppRole type and role field**

In `src/lib/types.ts`, add near the top (after the existing account types):
```ts
export type AppRole = 'CLIENT' | 'PARTNER' | 'ADMIN' | 'AGENT'
```
And add `role` to the `UserProfile` interface (after `email`):
```ts
  role: AppRole
```

- [ ] **Step 5: Carry role through mapUser**

In `src/lib/apiMappers.ts`, update the import to include `AppRole`:
```ts
import type {
  AccountMode,
  AccountStatus,
  AccountType,
  AppRole,
  KycStatus,
  KycStep,
  TradingAccount,
  Transaction,
  TxKind,
  TxStatus,
  UserProfile,
} from './types'
```
In `mapUser`, add the `role` field to the returned object:
```ts
export function mapUser(u: ApiUser): UserProfile {
  return {
    id: u.id,
    name: `${u.firstName} ${u.lastName}`.trim(),
    email: u.email,
    role: u.role as AppRole,
    phone: u.phone ?? '',
    country: u.country ?? '',
    joinedAt: u.joinedAt,
    avatarColor: '#e11d2e',
  }
}
```

- [ ] **Step 6: Implement the roles helper**

Create `src/lib/roles.ts`:
```ts
import type { AppRole } from './types'

/** Roles that may access the CRM admin area. Mirrors the backend STAFF_ROLES. */
export const isStaffRole = (role: AppRole): boolean => role === 'ADMIN' || role === 'AGENT'
```

- [ ] **Step 7: Run tests + typecheck**

Run: `npm test -- roles apiMappers`
Expected: PASS.
Run: `npx tsc -b`
Expected: no errors. (If any code constructs a `UserProfile` literal without `role`, that's now a type error — fix by adding `role`. Search `src` for object literals assigned to `UserProfile`; mock data in `src/mock/` may need a `role: 'CLIENT'` added.)

- [ ] **Step 8: Commit**

```bash
git add src/lib/types.ts src/lib/apiMappers.ts src/lib/roles.ts src/lib/roles.spec.ts src/lib/apiMappers.spec.ts src/mock
git commit -m "feat(web): surface user role + isStaffRole helper"
```

---

### Task 4: Frontend — RequireStaff gate + adminApi

**Files:**
- Create: `src/lib/adminApi.ts`
- Create: `src/components/admin/RequireStaff.tsx`
- Create: `src/components/admin/RequireStaff.spec.tsx`

**Interfaces:**
- Consumes: `useAuth()` (`{ user, isAuthenticated, loading }`), `isStaffRole` (Task 3), `api` (`src/lib/api.ts`).
- Produces:
  - `adminApi.getDashboard(): Promise<AdminDashboardSummary>` and the `AdminDashboardSummary` type.
  - `<RequireStaff>` component: shows a loader while `loading`; redirects to `/login` if unauthenticated; redirects to `/portal/dashboard` if authenticated but not staff; otherwise renders children.

- [ ] **Step 1: Write the failing RequireStaff test**

Create `src/components/admin/RequireStaff.spec.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

let authState: { user: { role: string } | null; isAuthenticated: boolean; loading: boolean };
vi.mock('@/context/AuthContext', () => ({ useAuth: () => authState }));

import { RequireStaff } from './RequireStaff';

function renderAt() {
  return render(
    <MemoryRouter initialEntries={['/admin/dashboard']}>
      <Routes>
        <Route
          path="/admin/dashboard"
          element={
            <RequireStaff>
              <div>ADMIN CONTENT</div>
            </RequireStaff>
          }
        />
        <Route path="/login" element={<div>LOGIN PAGE</div>} />
        <Route path="/portal/dashboard" element={<div>PORTAL PAGE</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('RequireStaff', () => {
  beforeEach(() => {
    authState = { user: null, isAuthenticated: false, loading: false };
  });

  it('renders children for a staff user (AGENT)', () => {
    authState = { user: { role: 'AGENT' }, isAuthenticated: true, loading: false };
    renderAt();
    expect(screen.getByText('ADMIN CONTENT')).toBeInTheDocument();
  });

  it('redirects an authenticated non-staff user to the portal', () => {
    authState = { user: { role: 'CLIENT' }, isAuthenticated: true, loading: false };
    renderAt();
    expect(screen.getByText('PORTAL PAGE')).toBeInTheDocument();
    expect(screen.queryByText('ADMIN CONTENT')).not.toBeInTheDocument();
  });

  it('redirects an unauthenticated visitor to login', () => {
    authState = { user: null, isAuthenticated: false, loading: false };
    renderAt();
    expect(screen.getByText('LOGIN PAGE')).toBeInTheDocument();
  });

  it('shows a loader while the session is restoring', () => {
    authState = { user: null, isAuthenticated: false, loading: true };
    renderAt();
    expect(screen.queryByText('ADMIN CONTENT')).not.toBeInTheDocument();
    expect(screen.queryByText('LOGIN PAGE')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- RequireStaff`
Expected: FAIL — cannot find module `./RequireStaff`.

- [ ] **Step 3: Implement RequireStaff**

Create `src/components/admin/RequireStaff.tsx`:
```tsx
import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { isStaffRole } from '@/lib/roles'
import { Logo } from '@/components/Logo'

/** Gate /admin routes behind an authenticated STAFF (Admin/Agent) session. */
export function RequireStaff({ children }: { children: ReactNode }) {
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

  if (!isStaffRole(user.role)) {
    return <Navigate to="/portal/dashboard" replace />
  }

  return <>{children}</>
}
```

- [ ] **Step 4: Implement adminApi**

Create `src/lib/adminApi.ts`:
```ts
import { api } from './api'

export interface AdminDashboardSummary {
  totalClients: number
  pendingKyc: number
  pendingWithdrawals: number
  depositsToday: number
  openTickets: number
}

/** Typed CRM admin API surface. Thin wrapper over the shared `api` client. */
export const adminApi = {
  getDashboard: () => api.get<AdminDashboardSummary>('/admin/dashboard'),
}
```

- [ ] **Step 5: Run tests + typecheck**

Run: `npm test -- RequireStaff`
Expected: PASS — 4 tests.
Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/adminApi.ts src/components/admin/RequireStaff.tsx src/components/admin/RequireStaff.spec.tsx
git commit -m "feat(web): add RequireStaff gate + typed adminApi"
```

---

### Task 5: Frontend — admin shell (sidebar + layout + routes)

**Files:**
- Create: `src/components/admin/adminNav.ts`
- Create: `src/components/admin/AdminSidebar.tsx`
- Create: `src/components/admin/AdminSidebar.spec.tsx`
- Create: `src/layouts/AdminLayout.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `useAuth()` (for logout + user display), `adminNav`, existing `Logo`, `cn`.
- Produces: `AdminLayout` (renders sidebar + topbar + `<Outlet/>`); `/admin` route group gated by `RequireStaff`. `adminNav: { label, to, icon }[]`.

- [ ] **Step 1: Create the admin nav model**

Create `src/components/admin/adminNav.ts`:
```ts
import { LayoutDashboard, type LucideIcon } from 'lucide-react'

export interface AdminNavItem {
  label: string
  to: string
  icon: LucideIcon
}

// Phase 2 ships only the Dashboard. Later phases append Clients, Leads, KYC,
// Finance, Accounts, Support, Partners, Reports, and Staff here.
export const adminNav: AdminNavItem[] = [
  { label: 'Dashboard', to: '/admin/dashboard', icon: LayoutDashboard },
]
```

- [ ] **Step 2: Write the failing AdminSidebar test**

Create `src/components/admin/AdminSidebar.spec.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ logout: vi.fn() }) }));

import { AdminSidebarContent } from './AdminSidebar';

describe('AdminSidebarContent', () => {
  it('renders the admin label and a Dashboard link', () => {
    render(
      <MemoryRouter>
        <AdminSidebarContent />
      </MemoryRouter>,
    );
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText(/admin/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `npm test -- AdminSidebar`
Expected: FAIL — cannot find module `./AdminSidebar`.

- [ ] **Step 4: Implement AdminSidebar**

Create `src/components/admin/AdminSidebar.tsx`:
```tsx
import { LogOut } from 'lucide-react'
import { NavLink, useNavigate } from 'react-router-dom'
import { Logo } from '@/components/Logo'
import { useAuth } from '@/context/AuthContext'
import { adminNav } from './adminNav'
import { cn } from '@/lib/cn'

export function AdminSidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const navigate = useNavigate()
  const { logout } = useAuth()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-2 border-b border-white/[0.06] px-5">
        <Logo size={26} />
        <span className="rounded-md bg-brand-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-300 ring-1 ring-brand-500/30">
          Admin
        </span>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {adminNav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-brand-500/12 text-white ring-1 ring-brand-500/30'
                  : 'text-gray-400 hover:bg-white/[0.04] hover:text-white',
              )
            }
          >
            <item.icon className="h-[18px] w-[18px]" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-white/[0.06] p-3">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-gray-400 transition-colors hover:bg-danger/10 hover:text-danger"
        >
          <LogOut className="h-[18px] w-[18px]" />
          Logout
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Implement AdminLayout**

Create `src/layouts/AdminLayout.tsx`:
```tsx
import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Menu } from 'lucide-react'
import { Outlet, useLocation } from 'react-router-dom'
import { AdminSidebarContent } from '@/components/admin/AdminSidebar'
import { useAuth } from '@/context/AuthContext'
import { useBodyScrollLock } from '@/lib/hooks'
import { initials } from '@/lib/format'

export function AdminLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { pathname } = useLocation()
  const { user } = useAuth()
  useBodyScrollLock(mobileOpen)

  useEffect(() => {
    setMobileOpen(false)
    document.querySelector('#admin-scroll')?.scrollTo({ top: 0 })
  }, [pathname])

  return (
    <div className="flex h-dvh-safe overflow-hidden bg-ink-900">
      <a href="#admin-scroll" className="skip-link">
        Skip to content
      </a>
      <aside className="hidden w-64 shrink-0 border-r border-white/[0.06] bg-ink-850 lg:block">
        <AdminSidebarContent />
      </aside>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              className="fixed inset-y-0 left-0 z-50 w-64 border-r border-white/[0.06] bg-ink-850 lg:hidden"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 34 }}
            >
              <AdminSidebarContent onNavigate={() => setMobileOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-white/[0.06] bg-ink-900/85 px-4 backdrop-blur-xl sm:px-6">
          <button
            onClick={() => setMobileOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-300 hover:bg-white/[0.06] hover:text-white lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="hidden sm:block">
            <p className="text-xs text-gray-500">CRM Back-Office</p>
            <p className="text-sm font-semibold text-white">{user?.name ?? 'Staff'}</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-500/15 text-sm font-semibold text-brand-300 ring-1 ring-brand-500/30">
              {initials(user?.name ?? 'Staff')}
            </span>
          </div>
        </header>
        <main id="admin-scroll" tabIndex={-1} className="flex-1 overflow-y-auto outline-none">
          <div className="mx-auto w-full max-w-6xl p-4 sm:p-6 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
```
NOTE: confirm `initials` is exported from `src/lib/format.ts` (the Topbar uses it). If not, render `user?.name?.charAt(0) ?? 'S'` instead.

- [ ] **Step 6: Wire the routes in App.tsx**

In `src/App.tsx`:
- Add imports:
```tsx
import { AdminLayout } from './layouts/AdminLayout'
import { RequireStaff } from './components/admin/RequireStaff'
import AdminDashboardPage from './pages/admin/AdminDashboardPage'
```
- Add the route block AFTER the `/portal` route block and BEFORE the `<Route path="*" ...>`:
```tsx
      {/* Secure staff back-office (CRM) */}
      <Route
        path="/admin"
        element={
          <RequireStaff>
            <AdminLayout />
          </RequireStaff>
        }
      >
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboardPage />} />
      </Route>
```
NOTE: `AdminDashboardPage` is created in Task 6. If you implement Task 5 before Task 6, create a temporary stub `src/pages/admin/AdminDashboardPage.tsx` exporting `export default function AdminDashboardPage() { return null }` so the import resolves, then Task 6 replaces it. Prefer doing Task 6 first if executing out of order.

- [ ] **Step 7: Run tests + typecheck**

Run: `npm test -- AdminSidebar`
Expected: PASS.
Run: `npx tsc -b`
Expected: no errors (requires Task 6's page to exist or the stub above).

- [ ] **Step 8: Commit**

```bash
git add src/components/admin/adminNav.ts src/components/admin/AdminSidebar.tsx src/components/admin/AdminSidebar.spec.tsx src/layouts/AdminLayout.tsx src/App.tsx
git commit -m "feat(web): add admin shell (sidebar, layout, /admin routes)"
```

---

### Task 6: Frontend — admin Dashboard page with live KPIs

**Files:**
- Create: `src/pages/admin/AdminDashboardPage.tsx`
- Create: `src/pages/admin/AdminDashboardPage.spec.tsx`

**Interfaces:**
- Consumes: `adminApi.getDashboard()` (Task 4), `KpiWidget` (`@/components/portal/KpiWidget`), `Skeleton` + `ErrorState` (`@/components/ui`).
- Produces: default-exported `AdminDashboardPage` rendering 5 KPI tiles from the endpoint, with loading and error states.

- [ ] **Step 1: Write the failing page test**

Create `src/pages/admin/AdminDashboardPage.spec.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

vi.mock('@/lib/adminApi', () => ({
  adminApi: {
    getDashboard: vi.fn().mockResolvedValue({
      totalClients: 42,
      pendingKyc: 7,
      pendingWithdrawals: 3,
      depositsToday: 9,
      openTickets: 5,
    }),
  },
}));

import AdminDashboardPage from './AdminDashboardPage';

describe('AdminDashboardPage', () => {
  it('renders KPI labels and fetched values', async () => {
    render(<AdminDashboardPage />);
    await waitFor(() => expect(screen.getByText('Total Clients')).toBeInTheDocument());
    expect(screen.getByText('Pending KYC')).toBeInTheDocument();
    expect(screen.getByText('Open Tickets')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- AdminDashboardPage`
Expected: FAIL — cannot find module `./AdminDashboardPage`.

- [ ] **Step 3: Implement the page**

Create `src/pages/admin/AdminDashboardPage.tsx`:
```tsx
import { useEffect, useState } from 'react'
import { Users, ShieldCheck, ArrowDownToLine, Banknote, LifeBuoy } from 'lucide-react'
import { KpiWidget } from '@/components/portal/KpiWidget'
import { Skeleton } from '@/components/ui'
import { ErrorState } from '@/components/ui/States'
import { adminApi, type AdminDashboardSummary } from '@/lib/adminApi'

export default function AdminDashboardPage() {
  const [data, setData] = useState<AdminDashboardSummary | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let active = true
    setError(false)
    adminApi
      .getDashboard()
      .then((d) => active && setData(d))
      .catch(() => active && setError(true))
    return () => {
      active = false
    }
  }, [])

  if (error) {
    return <ErrorState title="Could not load dashboard" description="Please try again shortly." />
  }

  if (!data) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
    )
  }

  const tiles = [
    { icon: Users, label: 'Total Clients', value: data.totalClients },
    { icon: ShieldCheck, label: 'Pending KYC', value: data.pendingKyc },
    { icon: ArrowDownToLine, label: 'Pending Withdrawals', value: data.pendingWithdrawals },
    { icon: Banknote, label: 'Deposits Today', value: data.depositsToday },
    { icon: LifeBuoy, label: 'Open Tickets', value: data.openTickets },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-400">Operational overview of the platform.</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map((t) => (
          <KpiWidget key={t.label} icon={t.icon} label={t.label} value={t.value} decimals={0} />
        ))}
      </div>
    </div>
  )
}
```
NOTE: confirm the exports `Skeleton` (from `@/components/ui`) and `ErrorState` (from `@/components/ui/States`). The Phase 1 spec lists both as existing primitives. If `ErrorState` is re-exported from `@/components/ui`, import it from there instead; if `Skeleton`'s prop is not `className`, match its real API (open `src/components/ui/Skeleton.tsx` and `States.tsx` first).

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- AdminDashboardPage`
Expected: PASS.

- [ ] **Step 5: Full suite + build typecheck**

Run: `npm test`
Expected: all frontend specs PASS.
Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 6: Manual smoke (recommended)**

Start backend (`cd server && npm run start:dev`) and frontend (`npm run dev`). Log in as an ADMIN or AGENT user, visit `/admin` → should redirect to `/admin/dashboard` and show 5 KPI tiles. Log in as a CLIENT and visit `/admin` → should redirect to `/portal/dashboard`.

- [ ] **Step 7: Commit**

```bash
git add src/pages/admin/AdminDashboardPage.tsx src/pages/admin/AdminDashboardPage.spec.tsx
git commit -m "feat(web): add admin dashboard page with live KPIs"
```

---

## Self-Review

**Spec coverage (Phase 2 = "Admin shell — layout, sidebar, RequireStaff, Dashboard with live KPIs"):**
- Admin layout → Task 5 (`AdminLayout`). ✅
- Sidebar → Task 5 (`AdminSidebar` + `adminNav`). ✅
- `RequireStaff` → Task 4. ✅
- Dashboard with live KPIs → Task 6 (frontend) + Task 1 (backend endpoint). ✅
- Frontend test harness (precondition for TDD, absent in repo) → Task 2. ✅
- Role surfacing (precondition for RequireStaff; `mapUser` dropped role) → Task 3. ✅
- `/admin` route wiring → Task 5. ✅

**Placeholder scan:** No TBD/TODO. Every code step has complete code. The "open the real file and match its API" notes (cn, initials, Skeleton/ErrorState, mock data) are verifications against existing files, not placeholders — they exist because those files weren't fully read while planning and the implementer must confirm the exact exports.

**Type consistency:**
- `AdminDashboardSummary` shape is identical in backend (`admin-dashboard.service.ts`, Task 1) and frontend (`adminApi.ts`, Task 4): `totalClients, pendingKyc, pendingWithdrawals, depositsToday, openTickets` — all `number`.
- `AppRole` defined in Task 3, consumed by `isStaffRole` (Task 3) and `RequireStaff` (Task 4) and `mapUser` (Task 3).
- `adminApi.getDashboard` (Task 4) consumed by `AdminDashboardPage` (Task 6).
- `AdminSidebarContent`/`adminNav` (Task 5) names match between files.
- `RequireStaff` redirect targets (`/login`, `/portal/dashboard`) exist as routes.

**Cross-task ordering note:** Task 5 imports `AdminDashboardPage` from Task 6. If executed strictly in order, Task 5 Step 6's NOTE provides a one-line stub so `tsc -b` passes; Task 6 then replaces it. Executing Task 6 before Task 5's App.tsx wiring also works.

## Follow-on plans (not in this phase)
- Phase 3 — Clients (list + 360 + notes) and KYC review queue.
- Phase 4 — Finance (withdrawal approvals) + Accounts admin.
- Phase 5 — Leads pipeline + Support desk (wire portal support to Ticket).
- Phase 6 — Partners stub + Reports + Staff/Settings + audit-log viewer.
