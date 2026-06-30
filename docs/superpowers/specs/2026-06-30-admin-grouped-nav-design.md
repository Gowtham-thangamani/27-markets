# Centroid-style Grouped Admin Navigation — Design

**Date:** 2026-06-30
**Status:** Approved (pending spec review)
**Branch:** `feat/admin-grouped-nav`

## Context

Benchmarking against Centroid FXCRM, the broker wants the back-office sidebar to
match Centroid's **two-level navigation**: top-level groups (with icons) that
expand to reveal sub-sections. Our admin sidebar today is a flat one-level list
of ~12 links ([adminNav.ts](../../../src/components/admin/adminNav.ts)),
rendered by [AdminSidebar.tsx](../../../src/components/admin/AdminSidebar.tsx)
inside [AdminLayout.tsx](../../../src/layouts/AdminLayout.tsx) (desktop aside +
mobile drawer), with flat routes under `/admin` in
[App.tsx](../../../src/App.tsx).

Centroid exposes ~50 sub-sections across 22 groups. We have pages for only a
handful. Decisions taken during brainstorming:

- **Group breadth:** mirror the CRM-relevant groups only (General, User
  Management, KYC & Compliance, Finance, Trading, Introducing Brokers, Requests,
  Referrals, Notifications, Templates, Contents, Settings) plus a top-level
  Support link. Drop pure platform-infra groups (Liquidity Providers, Telephony,
  Webhooks, Workflows, Marketplace, Bonus, Aggregations) for now.
- **Unbuilt sub-sections:** show the full tree; unbuilt sub-sections link to a
  generic "Coming soon" placeholder page.

This is **frontend-only**: no backend, no API, no money-flow or SIMULATION/LIVE
changes. All 12 existing admin pages keep working, relocated into groups.

## Goals

1. Grouped, collapsible admin sidebar with sub-sections (Centroid-style).
2. Placeholder routes/page for every sub-section we have not built.
3. Preserve all existing admin pages and their routes/behavior.

## Non-goals

- No backend or API changes. No new real feature pages — placeholders only.
- Not restructuring the partner or client-portal sidebars (admin only).
- Not adding the dropped infra groups (can come later).

## Architecture

### Nav data model — `src/components/admin/adminNav.ts` (rewrite)

A tree of groups and single links. A link's `placeholder` flag is the single
source of truth for both the sidebar "soon" badge and the auto-generated
placeholder routes.

```ts
import type { LucideIcon } from 'lucide-react'

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

export const adminNav: AdminNavEntry[] = [ /* see group tree below */ ]

/** All placeholder links flattened — used to generate placeholder routes. */
export function placeholderLinks(): AdminNavLink[]

/** Look up a link's label by its `to` path (for the placeholder page title). */
export function navLabelFor(pathname: string): string | undefined
```

### Group tree

Existing pages keep their current `to` paths; placeholders get new `/admin/...`
paths. ✅ = existing page, ➕ = placeholder.

| Group (icon) | Children |
|---|---|
| **General** (`LayoutDashboard`) | Dashboard ✅ `/admin/dashboard` · Reports ✅ `/admin/reports` |
| **User Management** (`Users`) | Staff & Permissions ✅ `/admin/staff` · Clients ✅ `/admin/clients` · Leads ✅ `/admin/leads` · Blocked Users ➕ `/admin/blocked-users` |
| **KYC & Compliance** (`ShieldCheck`) | Pending Documents ✅ `/admin/kyc` · KYC Forms ➕ `/admin/kyc-forms` · KYC Questions ➕ `/admin/kyc-questions` · Extended Fields ➕ `/admin/extended-fields` · Users KYC Forms ➕ `/admin/users-kyc-forms` · Document Tracker ➕ `/admin/document-tracker` · Dormant Accounts ➕ `/admin/dormant-accounts` · Staff Forms Assignments ➕ `/admin/staff-forms-assignments` · Consents ➕ `/admin/consents` |
| **Finance** (`Banknote`) | Transactions ✅ `/admin/finance` · Payment Intents ➕ `/admin/payment-intents` · All Wallets ➕ `/admin/wallets` · Payment Gateways ➕ `/admin/payment-gateways` · Exchange Rates ➕ `/admin/exchange-rates` · Credit Card Types ➕ `/admin/credit-card-types` · E-Wallet Types ➕ `/admin/ewallet-types` |
| **Trading** (`CandlestickChart`) | Accounts ✅ `/admin/accounts` · Account Types ➕ `/admin/account-types` · Economic Calendar ➕ `/admin/economic-calendar` · Servers ➕ `/admin/servers` |
| **Introducing Brokers** (`Handshake`) | IBs List ✅ `/admin/partners` · Partner Applications ✅ `/admin/partner-applications` · IB Campaigns ➕ `/admin/ib-campaigns` |
| **Requests** (`MessageCircleQuestion`) | Account Requests ➕ `/admin/account-requests` · Data Change Requests ➕ `/admin/data-change-requests` · Withdrawal Requests ➕ `/admin/withdrawal-requests` |
| **Referrals** (`Share2`) | Referrals ➕ `/admin/referrals` · User Referrals ➕ `/admin/user-referrals` |
| **Notifications** (`Bell`) | Templates ➕ `/admin/notification-templates` · Campaigns ➕ `/admin/campaigns` · Logs ➕ `/admin/notification-logs` |
| **Templates** (`LayoutTemplate`) | PDF Templates ➕ `/admin/pdf-templates` · Comment Templates ➕ `/admin/comment-templates` |
| **Contents** (`Newspaper`) | Blog ✅ `/admin/blog` |
| **Settings** (`Settings`) | General Settings ➕ `/admin/settings` |
| **Support** (`LifeBuoy`) | *single top-level link* ✅ `/admin/support` |

All existing paths (`/admin/dashboard`, `/admin/reports`, `/admin/staff`,
`/admin/clients`, `/admin/leads`, `/admin/kyc`, `/admin/finance`,
`/admin/accounts`, `/admin/partners`, `/admin/partner-applications`,
`/admin/blog`, `/admin/support`) are unchanged.

### Sidebar — `src/components/admin/AdminSidebar.tsx` (rewrite)

- Single entries (`isGroup` false) render as a `NavLink` exactly as today.
- Group entries render a `<button>` header (group icon + label + chevron) that
  toggles an expanded panel of child `NavLink`s.
- **Expanded state:** held in component state as `Record<groupLabel, boolean>`.
  Initialized so the group containing the active route is expanded. Persisted to
  `localStorage` (key `admin-nav-expanded`) so it survives navigation/reload.
  Reading/writing localStorage is guarded in a try/catch (SSR/availability).
- Active child link uses the existing active styling; a group whose child is
  active shows a subtle active accent on its header.
- Placeholder child links show a small muted "soon" pill.
- Children are indented under the group header. Same visual language (glass,
  brand accents) as the current sidebar. Works unchanged in the desktop aside
  and the mobile drawer (component is shared; `onNavigate` still closes the
  drawer on link click).

### Placeholder page — `src/pages/admin/AdminPlaceholderPage.tsx` (new)

A single generic page reused by every placeholder route. Uses `useLocation()` +
`navLabelFor(pathname)` to show the section title, with a short note that the
section mirrors Centroid and is not yet built, plus a "Construction" icon. Falls
back to a generic title if the path is not found.

### Routes — `src/App.tsx` (modify the `/admin` route block)

- Keep the explicit routes for all real pages (unchanged).
- Add placeholder routes by mapping over `placeholderLinks()`:
  `{placeholderLinks().map((l) => <Route key={l.to} path={l.to.replace('/admin/', '')} element={<AdminPlaceholderPage />} />)}`.
- New real paths added to the tree that already have pages: none (Reports, Staff,
  etc. already routed). `/admin/settings` and all ➕ paths resolve to the
  placeholder.

## Data flow

The nav model is static config. The sidebar derives expanded state from the
current `pathname` and persists user toggles to `localStorage`. The placeholder
page derives its title from the nav model by pathname. No network calls, no
backend.

## Error handling

- `localStorage` access wrapped in try/catch; on failure, fall back to
  computed-from-route expansion (no persistence).
- `navLabelFor` returns `undefined` for unknown paths; the placeholder page shows
  a generic "Coming soon" title in that case.

## Testing

- `src/components/admin/adminNav.spec.ts` — all `to` values unique; every group
  has children; `placeholderLinks()` returns only `placeholder:true` links;
  `navLabelFor` resolves a known path and returns `undefined` for an unknown one.
- `src/components/admin/AdminSidebar.spec.tsx` — renders group headers and the
  top-level Support link; clicking a group header expands/collapses its children;
  the group containing the active route is expanded on mount; placeholder links
  render a "soon" pill; an existing link (e.g. Clients) is present.
- `src/pages/admin/AdminPlaceholderPage.spec.tsx` — renders the section label for
  a known placeholder path; renders a generic title for an unknown path.

## Build sequence (incremental)

1. Rewrite `adminNav.ts` (model + tree + helpers) with `adminNav.spec.ts`.
2. Add `AdminPlaceholderPage.tsx` + spec.
3. Rewrite `AdminSidebar.tsx` (collapsible groups) + spec.
4. Wire placeholder routes in `App.tsx`; run full suite + build.
