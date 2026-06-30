# Centroid-style Grouped Admin Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the flat admin sidebar with a Centroid-style grouped, collapsible navigation whose unbuilt sub-sections route to a generic "Coming soon" placeholder page.

**Architecture:** A static nav tree (`adminNav.ts`) of groups + single links, where a `placeholder` flag is the single source of truth for both the sidebar "soon" badge and the auto-generated placeholder routes. The sidebar renders groups as collapsible panels (auto-expanding the active group, persisting toggles to localStorage). One generic placeholder page titles itself from the nav tree.

**Tech Stack:** React 18 + TypeScript, Vite, Tailwind, react-router-dom v6, lucide-react, Vitest + @testing-library/react (jsdom).

## Global Constraints

- Frontend only. NO backend, API, money-flow, or SIMULATION/LIVE changes.
- Preserve every existing admin route/path unchanged: `/admin/dashboard`, `/admin/reports`, `/admin/staff`, `/admin/clients`, `/admin/leads`, `/admin/kyc`, `/admin/finance`, `/admin/accounts`, `/admin/partners`, `/admin/partner-applications`, `/admin/blog` (+ `blog/new`, `blog/:id`), `/admin/support`.
- Reuse existing patterns/primitives: `cn` from `@/lib/cn`, `PageTitle` from `@/components/portal/PageTitle`, `Logo`, `useAuth`. No `any`.
- Use only lucide-react icons that exist in v0.451 (all icons named in this plan are verified present).
- localStorage access must be wrapped in try/catch.
- Test runner: `npx vitest run <path>` for one file; `npm test` for all. TypeScript: `npm run build` (`tsc -b`).
- Commit after every task. Branch: `feat/admin-grouped-nav`.

---

### Task 1: Nav tree data model (`adminNav.ts` rewrite)

**Files:**
- Modify (full rewrite): `src/components/admin/adminNav.ts`
- Test: `src/components/admin/adminNav.spec.ts`

**Interfaces:**
- Consumes: lucide-react icons, nothing from earlier tasks.
- Produces:
  - `interface AdminNavLink { label: string; to: string; placeholder?: boolean }`
  - `interface AdminNavGroup { label: string; icon: LucideIcon; children: AdminNavLink[] }`
  - `interface AdminNavSingle extends AdminNavLink { icon: LucideIcon }`
  - `type AdminNavEntry = AdminNavGroup | AdminNavSingle`
  - `function isGroup(e: AdminNavEntry): e is AdminNavGroup`
  - `const adminNav: AdminNavEntry[]`
  - `function placeholderLinks(): AdminNavLink[]`
  - `function navLabelFor(pathname: string): string | undefined`

- [ ] **Step 1: Write the failing test**

```ts
// src/components/admin/adminNav.spec.ts
import { describe, it, expect } from 'vitest'
import { adminNav, isGroup, placeholderLinks, navLabelFor } from './adminNav'

describe('adminNav', () => {
  it('has unique `to` paths across all links', () => {
    const tos = adminNav.flatMap((e) => (isGroup(e) ? e.children.map((c) => c.to) : [e.to]))
    expect(new Set(tos).size).toBe(tos.length)
  })

  it('every group has at least one child', () => {
    adminNav.filter(isGroup).forEach((g) => expect(g.children.length).toBeGreaterThan(0))
  })

  it('preserves the existing real paths', () => {
    const tos = new Set(adminNav.flatMap((e) => (isGroup(e) ? e.children.map((c) => c.to) : [e.to])))
    for (const p of ['/admin/dashboard', '/admin/reports', '/admin/staff', '/admin/clients',
      '/admin/leads', '/admin/kyc', '/admin/finance', '/admin/accounts', '/admin/partners',
      '/admin/partner-applications', '/admin/blog', '/admin/support']) {
      expect(tos.has(p)).toBe(true)
    }
  })

  it('placeholderLinks returns only placeholder links and is non-empty', () => {
    const links = placeholderLinks()
    expect(links.length).toBeGreaterThan(0)
    expect(links.every((l) => l.placeholder === true)).toBe(true)
  })

  it('navLabelFor resolves a known path and returns undefined for unknown', () => {
    expect(navLabelFor('/admin/clients')).toBe('Clients')
    expect(navLabelFor('/admin/payment-gateways')).toBe('Payment Gateways')
    expect(navLabelFor('/admin/nope')).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/admin/adminNav.spec.ts`
Expected: FAIL — `placeholderLinks`/`navLabelFor`/`isGroup` not exported yet.

- [ ] **Step 3: Rewrite the module**

```ts
// src/components/admin/adminNav.ts
import {
  LayoutDashboard, Users, ShieldCheck, Banknote, CandlestickChart, Handshake,
  ClipboardList, Share2, Bell, LayoutTemplate, Newspaper, Settings, LifeBuoy,
  type LucideIcon,
} from 'lucide-react'

export interface AdminNavLink {
  label: string
  to: string
  placeholder?: boolean
}

export interface AdminNavGroup {
  label: string
  icon: LucideIcon
  children: AdminNavLink[]
}

export interface AdminNavSingle extends AdminNavLink {
  icon: LucideIcon
}

export type AdminNavEntry = AdminNavGroup | AdminNavSingle

export function isGroup(e: AdminNavEntry): e is AdminNavGroup {
  return 'children' in e
}

export const adminNav: AdminNavEntry[] = [
  {
    label: 'General', icon: LayoutDashboard, children: [
      { label: 'Dashboard', to: '/admin/dashboard' },
      { label: 'Reports', to: '/admin/reports' },
    ],
  },
  {
    label: 'User Management', icon: Users, children: [
      { label: 'Staff & Permissions', to: '/admin/staff' },
      { label: 'Clients', to: '/admin/clients' },
      { label: 'Leads', to: '/admin/leads' },
      { label: 'Blocked Users', to: '/admin/blocked-users', placeholder: true },
    ],
  },
  {
    label: 'KYC & Compliance', icon: ShieldCheck, children: [
      { label: 'Pending Documents', to: '/admin/kyc' },
      { label: 'KYC Forms', to: '/admin/kyc-forms', placeholder: true },
      { label: 'KYC Questions', to: '/admin/kyc-questions', placeholder: true },
      { label: 'Extended Fields', to: '/admin/extended-fields', placeholder: true },
      { label: 'Users KYC Forms', to: '/admin/users-kyc-forms', placeholder: true },
      { label: 'Document Tracker', to: '/admin/document-tracker', placeholder: true },
      { label: 'Dormant Accounts', to: '/admin/dormant-accounts', placeholder: true },
      { label: 'Staff Forms Assignments', to: '/admin/staff-forms-assignments', placeholder: true },
      { label: 'Consents', to: '/admin/consents', placeholder: true },
    ],
  },
  {
    label: 'Finance', icon: Banknote, children: [
      { label: 'Transactions', to: '/admin/finance' },
      { label: 'Payment Intents', to: '/admin/payment-intents', placeholder: true },
      { label: 'All Wallets', to: '/admin/wallets', placeholder: true },
      { label: 'Payment Gateways', to: '/admin/payment-gateways', placeholder: true },
      { label: 'Exchange Rates', to: '/admin/exchange-rates', placeholder: true },
      { label: 'Credit Card Types', to: '/admin/credit-card-types', placeholder: true },
      { label: 'E-Wallet Types', to: '/admin/ewallet-types', placeholder: true },
    ],
  },
  {
    label: 'Trading', icon: CandlestickChart, children: [
      { label: 'Accounts', to: '/admin/accounts' },
      { label: 'Account Types', to: '/admin/account-types', placeholder: true },
      { label: 'Economic Calendar', to: '/admin/economic-calendar', placeholder: true },
      { label: 'Servers', to: '/admin/servers', placeholder: true },
    ],
  },
  {
    label: 'Introducing Brokers', icon: Handshake, children: [
      { label: 'IBs List', to: '/admin/partners' },
      { label: 'Partner Applications', to: '/admin/partner-applications' },
      { label: 'IB Campaigns', to: '/admin/ib-campaigns', placeholder: true },
    ],
  },
  {
    label: 'Requests', icon: ClipboardList, children: [
      { label: 'Account Requests', to: '/admin/account-requests', placeholder: true },
      { label: 'Data Change Requests', to: '/admin/data-change-requests', placeholder: true },
      { label: 'Withdrawal Requests', to: '/admin/withdrawal-requests', placeholder: true },
    ],
  },
  {
    label: 'Referrals', icon: Share2, children: [
      { label: 'Referrals', to: '/admin/referrals', placeholder: true },
      { label: 'User Referrals', to: '/admin/user-referrals', placeholder: true },
    ],
  },
  {
    label: 'Notifications', icon: Bell, children: [
      { label: 'Templates', to: '/admin/notification-templates', placeholder: true },
      { label: 'Campaigns', to: '/admin/campaigns', placeholder: true },
      { label: 'Logs', to: '/admin/notification-logs', placeholder: true },
    ],
  },
  {
    label: 'Templates', icon: LayoutTemplate, children: [
      { label: 'PDF Templates', to: '/admin/pdf-templates', placeholder: true },
      { label: 'Comment Templates', to: '/admin/comment-templates', placeholder: true },
    ],
  },
  {
    label: 'Contents', icon: Newspaper, children: [
      { label: 'Blog', to: '/admin/blog' },
    ],
  },
  {
    label: 'Settings', icon: Settings, children: [
      { label: 'General Settings', to: '/admin/settings', placeholder: true },
    ],
  },
  { label: 'Support', to: '/admin/support', icon: LifeBuoy },
]

/** All placeholder links flattened — used to generate placeholder routes. */
export function placeholderLinks(): AdminNavLink[] {
  return adminNav.flatMap((e) => (isGroup(e) ? e.children : [e])).filter((l) => l.placeholder)
}

/** Look up a link's label by its `to` path (for the placeholder page title). */
export function navLabelFor(pathname: string): string | undefined {
  for (const e of adminNav) {
    if (isGroup(e)) {
      const hit = e.children.find((c) => c.to === pathname)
      if (hit) return hit.label
    } else if (e.to === pathname) {
      return e.label
    }
  }
  return undefined
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/admin/adminNav.spec.ts`
Expected: PASS (5 tests). Note: `AdminSidebar.tsx` still imports the old `AdminNavItem`/flat `adminNav` shape and will not compile yet — that's fixed in Task 3. Do NOT run `npm run build` at this task; the typecheck failure in `AdminSidebar.tsx` is expected until Task 3.

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/adminNav.ts src/components/admin/adminNav.spec.ts
git commit -m "feat(admin): grouped nav tree model with placeholder helpers"
```

---

### Task 2: Generic placeholder page

**Files:**
- Create: `src/pages/admin/AdminPlaceholderPage.tsx`
- Test: `src/pages/admin/AdminPlaceholderPage.spec.tsx`

**Interfaces:**
- Consumes: `navLabelFor` from `@/components/admin/adminNav` (Task 1); `PageTitle` from `@/components/portal/PageTitle`; `useLocation` from react-router-dom.
- Produces: `default export function AdminPlaceholderPage(): JSX.Element`.

- [ ] **Step 1: Write the failing test**

```tsx
// src/pages/admin/AdminPlaceholderPage.spec.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import AdminPlaceholderPage from './AdminPlaceholderPage'

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/admin/*" element={<AdminPlaceholderPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('AdminPlaceholderPage', () => {
  it('renders the section label for a known placeholder path', () => {
    renderAt('/admin/payment-gateways')
    expect(screen.getByText('Payment Gateways is coming soon')).toBeInTheDocument()
  })

  it('renders a generic title for an unknown path', () => {
    renderAt('/admin/totally-unknown')
    expect(screen.getByText('This section is coming soon')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/admin/AdminPlaceholderPage.spec.tsx`
Expected: FAIL — cannot resolve `./AdminPlaceholderPage`.

- [ ] **Step 3: Write the component**

```tsx
// src/pages/admin/AdminPlaceholderPage.tsx
import { useLocation } from 'react-router-dom'
import { Construction } from 'lucide-react'
import { PageTitle } from '@/components/portal/PageTitle'
import { navLabelFor } from '@/components/admin/adminNav'

export default function AdminPlaceholderPage() {
  const { pathname } = useLocation()
  const label = navLabelFor(pathname) ?? 'This section'

  return (
    <>
      <PageTitle title={label} subtitle="Centroid-parity section — not built yet." />
      <div className="glass-panel flex flex-col items-center justify-center gap-3 p-12 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-gray-400 ring-1 ring-white/10">
          <Construction className="h-7 w-7" />
        </span>
        <h3 className="text-lg font-semibold text-white">{label} is coming soon</h3>
        <p className="max-w-md text-sm text-gray-400">
          This section mirrors Centroid FXCRM and is on the roadmap. The navigation is in place so the
          structure is ready; the page itself hasn’t been built yet.
        </p>
      </div>
    </>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pages/admin/AdminPlaceholderPage.spec.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/pages/admin/AdminPlaceholderPage.tsx src/pages/admin/AdminPlaceholderPage.spec.tsx
git commit -m "feat(admin): generic Coming Soon placeholder page"
```

---

### Task 3: Collapsible grouped sidebar (`AdminSidebar.tsx` rewrite)

**Files:**
- Modify (full rewrite): `src/components/admin/AdminSidebar.tsx`
- Test: `src/components/admin/AdminSidebar.spec.tsx`

**Interfaces:**
- Consumes: `adminNav`, `isGroup`, `AdminNavGroup` from `./adminNav` (Task 1); `cn`, `Logo`, `useAuth`; `NavLink`, `useNavigate`, `useLocation` from react-router-dom.
- Produces: `export function AdminSidebarContent({ onNavigate }: { onNavigate?: () => void })` (same export name + signature as today, so `AdminLayout.tsx` needs no change).

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/admin/AdminSidebar.spec.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ logout: vi.fn(), user: { name: 'Staff' } }),
}))

import { AdminSidebarContent } from './AdminSidebar'

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AdminSidebarContent />
    </MemoryRouter>,
  )
}

describe('AdminSidebarContent', () => {
  beforeEach(() => localStorage.clear())

  it('renders group headers and the top-level Support link', () => {
    renderAt('/admin/dashboard')
    expect(screen.getByRole('button', { name: /User Management/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Support/ })).toBeInTheDocument()
  })

  it('auto-expands the group containing the active route', () => {
    renderAt('/admin/clients')
    expect(screen.getByRole('link', { name: /Clients/ })).toBeInTheDocument()
  })

  it('toggles a group open and closed on header click', () => {
    renderAt('/admin/dashboard')
    expect(screen.queryByRole('link', { name: /Transactions/ })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Finance/ }))
    expect(screen.getByRole('link', { name: /Transactions/ })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Finance/ }))
    expect(screen.queryByRole('link', { name: /Transactions/ })).not.toBeInTheDocument()
  })

  it('shows a "soon" badge on placeholder links', () => {
    renderAt('/admin/dashboard')
    fireEvent.click(screen.getByRole('button', { name: /User Management/ }))
    expect(screen.getByRole('link', { name: /Blocked Users/ })).toHaveTextContent(/soon/i)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/admin/AdminSidebar.spec.tsx`
Expected: FAIL — current sidebar has no group buttons (renders flat links only).

- [ ] **Step 3: Rewrite the sidebar**

```tsx
// src/components/admin/AdminSidebar.tsx
import { useState } from 'react'
import { LogOut, ChevronDown } from 'lucide-react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { Logo } from '@/components/Logo'
import { useAuth } from '@/context/AuthContext'
import { adminNav, isGroup, type AdminNavGroup } from './adminNav'
import { cn } from '@/lib/cn'

const STORAGE_KEY = 'admin-nav-expanded'

function loadExpanded(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {}
  } catch {
    return {}
  }
}

function groupOfPath(pathname: string): string | undefined {
  const g = adminNav.find(
    (e): e is AdminNavGroup => isGroup(e) && e.children.some((c) => c.to === pathname),
  )
  return g?.label
}

export function AdminSidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const { pathname } = useLocation()
  const activeGroup = groupOfPath(pathname)

  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const stored = loadExpanded()
    return activeGroup ? { ...stored, [activeGroup]: true } : stored
  })

  const toggle = (label: string) => {
    setExpanded((prev) => {
      const next = { ...prev, [label]: !prev[label] }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {
        /* ignore persistence failures */
      }
      return next
    })
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors',
      isActive
        ? 'bg-brand-500/12 text-white ring-1 ring-brand-500/30'
        : 'text-gray-400 hover:bg-white/[0.04] hover:text-white',
    )

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-2 border-b border-white/[0.06] px-5">
        <Logo size={26} />
        <span className="rounded-md bg-brand-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-300 ring-1 ring-brand-500/30">
          Admin
        </span>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {adminNav.map((entry) => {
          if (!isGroup(entry)) {
            return (
              <NavLink key={entry.to} to={entry.to} onClick={onNavigate} className={linkClass}>
                <entry.icon className="h-[18px] w-[18px]" />
                <span>{entry.label}</span>
              </NavLink>
            )
          }
          const open = expanded[entry.label] ?? false
          const isActiveGroup = entry.label === activeGroup
          return (
            <div key={entry.label}>
              <button
                type="button"
                onClick={() => toggle(entry.label)}
                aria-expanded={open}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors',
                  isActiveGroup ? 'text-white' : 'text-gray-400 hover:bg-white/[0.04] hover:text-white',
                )}
              >
                <entry.icon className="h-[18px] w-[18px]" />
                <span className="flex-1 text-left">{entry.label}</span>
                <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
              </button>
              {open && (
                <div className="mt-1 space-y-1 pl-4">
                  {entry.children.map((child) => (
                    <NavLink
                      key={child.to}
                      to={child.to}
                      onClick={onNavigate}
                      end
                      className={({ isActive }) =>
                        cn(
                          'flex items-center justify-between gap-2 rounded-lg px-3.5 py-2 text-sm transition-colors',
                          isActive
                            ? 'bg-brand-500/12 text-white ring-1 ring-brand-500/30'
                            : 'text-gray-400 hover:bg-white/[0.04] hover:text-white',
                        )
                      }
                    >
                      <span>{child.label}</span>
                      {child.placeholder && (
                        <span className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-gray-500">
                          soon
                        </span>
                      )}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          )
        })}
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

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/admin/AdminSidebar.spec.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/AdminSidebar.tsx src/components/admin/AdminSidebar.spec.tsx
git commit -m "feat(admin): collapsible grouped sidebar with active-group expand"
```

---

### Task 4: Wire placeholder routes (`App.tsx`)

**Files:**
- Modify: `src/App.tsx` (the `/admin` route block, around lines 107-122; plus imports near the top)
- Test: none new — verified by full build + suite.

**Interfaces:**
- Consumes: `placeholderLinks` from `./components/admin/adminNav` (Task 1); `AdminPlaceholderPage` from `./pages/admin/AdminPlaceholderPage` (Task 2).

- [ ] **Step 1: Add the imports**

Near the other admin page imports at the top of `src/App.tsx` (after `AdminBlogEditorPage` import, line ~24):

```tsx
import AdminPlaceholderPage from './pages/admin/AdminPlaceholderPage'
import { placeholderLinks } from './components/admin/adminNav'
```

- [ ] **Step 2: Add placeholder routes inside the `/admin` route block**

In `src/App.tsx`, inside the `<Route path="/admin" ...>` element, after the existing `blog/:id` route (line ~121) and before the closing `</Route>` (line ~122), insert:

```tsx
        {placeholderLinks().map((l) => (
          <Route key={l.to} path={l.to.replace('/admin/', '')} element={<AdminPlaceholderPage />} />
        ))}
```

Leave all existing real routes untouched.

- [ ] **Step 3: Typecheck + full suite**

Run: `npm run build`
Expected: clean (no TS errors; pre-existing chunk-size warning is unrelated).

Run: `npm test`
Expected: all suites pass — the prior suite count (45) plus the new specs from Tasks 1-3 (5 + 2 + 4 = 11 new tests), so 56 tests across 30 files. Report the exact totals.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "feat(admin): route unbuilt nav sub-sections to placeholder page"
```

---

## Self-Review Notes

- **Spec coverage:** Nav model + helpers (Task 1), placeholder page (Task 2), collapsible grouped sidebar with auto-expand + localStorage (Task 3), placeholder routes auto-generated from the model (Task 4). Group tree matches the spec's section 2 table exactly. All 12 existing paths preserved (asserted in Task 1's test).
- **Type consistency:** `AdminNavEntry`/`isGroup`/`placeholderLinks`/`navLabelFor` defined in Task 1 are consumed with identical signatures in Tasks 2-4. `AdminSidebarContent` keeps its existing name + `{ onNavigate? }` signature, so `AdminLayout.tsx` is untouched.
- **Build ordering:** Task 1 deliberately leaves `AdminSidebar.tsx` non-compiling (it imports the old flat shape); Task 1's verify step runs only its unit test, and Task 3 restores a clean typecheck. Task 4 runs the first full `npm run build` once all pieces exist. This is called out in Task 1 Step 4.
- **Icons:** all group icons (`LayoutDashboard, Users, ShieldCheck, Banknote, CandlestickChart, Handshake, ClipboardList, Share2, Bell, LayoutTemplate, Newspaper, Settings, LifeBuoy`) and page icons (`Construction, ChevronDown, LogOut`) exist in lucide-react v0.451.
