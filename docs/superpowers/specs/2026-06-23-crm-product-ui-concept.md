# 27 Markets — CRM Back-Office: Product & UI Concept (v1)

Date: 2026-06-23
Status: Concept — binds to the approved spec (`2026-06-22-crm-back-office-design.md`) and the
Phase 1 (merged) + Phase 2 (in progress) plans.

> This is the **staff counterpart to the client portal**, built *inside* the existing 27 Markets
> React SPA + NestJS app — not a separate SaaS dashboard, not mock data. It reuses the live backend
> (auth/JWT/2FA, double-entry ledger, KYC, accounts, audit) and the existing black/red design system
> so the back-office feels native to 27 Markets.

---

## 0. Build status alignment (concept ↔ reality)

| Requirement area | State today |
|---|---|
| `AGENT` role on `UserRole` (CLIENT, PARTNER, ADMIN, AGENT) | ✅ shipped (Phase 1) |
| `Lead`, `LeadNote`, `ClientNote`, `Ticket`, `TicketMessage` models + migration | ✅ shipped (Phase 1) |
| Guarded `admin/` NestJS module + `RolesGuard` two-tier | ✅ shipped (Phase 1) |
| `GET /admin/dashboard` KPIs, AdminLayout, sidebar, RequireStaff, adminApi, Dashboard | 🔄 in progress (Phase 2) |
| Clients/Leads/KYC/Finance/Accounts/Support/Partners/Reports/Staff modules | ⏭ Phases 3–6 |

This concept describes the **whole v1 surface**; the phase plan delivers it in independently-demoable slices.

---

## 1. Information architecture

All staff screens live under a single guarded route group inside the existing SPA:

```
/admin                         RequireStaff (ADMIN|AGENT) → AdminLayout
  /dashboard                   KPIs + recent activity feed
  /clients                     searchable list  → Client 360 drawer
  /leads                       Kanban pipeline (New→Contacted→Qualified→Converted→Lost)
  /kyc                         pending review queue → document viewer → approve/reject
  /finance                     deposits log + withdrawal approval queue + manual adjustment (Admin)
  /accounts                    all trading accounts → suspend/activate/leverage (Admin)
  /support                     staff ticket inbox → conversation + internal notes
  /partners                    partner list + referred clients (commission = read-only stub)
  /reports                     deposits / withdrawals / net flow / funnel / agent performance
  /staff                       staff users + role assignment + audit log (Admin)
```

Routing binds into `src/App.tsx` as a sibling of the existing `/portal` group:
`<Route path="/admin" element={<RequireStaff><AdminLayout/></RequireStaff>}>`. The marketing site
(`MarketingLayout`) and client portal (`PortalLayout`) are untouched and visually distinct.

**Sidebar nav** (`src/components/admin/adminNav.ts`) lists every module; items the current role can't
use are hidden (see §3). Each module = one page under `src/pages/admin/*`.

---

## 2. Frontend architecture (bound to the existing SPA)

- `src/layouts/AdminLayout.tsx` — admin shell: fixed left **AdminSidebar**, sticky **AdminTopbar**
  (page title, global search, staff identity, notifications), scrollable content region, right-hand
  **drawer** mount for Client 360 / detail panels. Distinct from `PortalLayout` (different sidebar,
  ops-dense top bar, no "Open New Account" CTA).
- `src/components/admin/*` — `AdminSidebar`, `RequireStaff`, `ClientDrawer`, `LeadKanban`,
  `ApprovalQueue`, `KycReviewPanel`, `TicketThread`, `StatusChip`, `AdminDataTable`, `FilterBar`,
  `AuditTrail`, `ConfirmActionModal`, `RoleBadge`.
- `src/pages/admin/*` — one page per module.
- `src/lib/adminApi.ts` — typed admin client that **mirrors `src/lib/api.ts`** and reuses the same
  `api` fetch core (httpOnly cookies, silent 401→refresh→retry). Adds typed methods per module
  (`adminApi.clients.list()`, `adminApi.finance.approveWithdrawal()`, …). No new fetch stack, no mock data.
- **Reused primitives** from `@/components/ui`: Button, Card, Badge, Tabs, Modal, Dropdown, Toast,
  Accordion, Input, Select, FileUpload, Skeleton, EmptyState, ErrorState, ProgressBar, DataTable,
  plus `KpiWidget`, `statusTone`. The admin area introduces no parallel design system.

---

## 3. Access control & role-aware behavior (two-tier, v1)

Exactly two staff tiers. No granular per-permission RBAC in v1.

| Module / action | Admin | Agent |
|---|---|---|
| Dashboard, Clients, Leads, Support, KYC review | ✅ | ✅ |
| Finance approvals (withdrawals, **manual adjustments**) | ✅ | ❌ |
| Accounts admin (suspend / activate / leverage) | ✅ | ❌ |
| Staff & role management, Settings, Audit log | ✅ | ❌ |
| Reports | ✅ full | ✅ read |

**Enforced in three layers:**
1. **Route** — `RequireStaff` gates `/admin/*`: shows a loader while the session restores; redirects
   CLIENT/PARTNER to `/portal/dashboard`; redirects unauthenticated visitors to `/login`.
2. **Nav + UI** — Agent-restricted modules are hidden from the sidebar; Admin-only *actions* inside a
   shared page (e.g. "Manual adjustment" in Finance) render disabled/absent for Agents. Driven by a
   frontend `isStaffRole` / `isAdminRole` helper reading the user's `role` (now surfaced through
   `mapUser`).
3. **Backend (authoritative)** — every `/admin` route sits behind global `JwtAuthGuard` + per-controller
   `@UseGuards(RolesGuard)`. Shared routes: `@Roles(ADMIN, AGENT)`. Finance/accounts/staff/settings:
   `@Roles(ADMIN)`. The UI gating is convenience; the server is the source of truth.

---

## 4. Backend architecture (extend existing NestJS app)

- New `admin/` module namespace with **one controller per area**: `admin/dashboard`, `admin/clients`,
  `admin/leads`, `admin/kyc`, `admin/finance`, `admin/accounts`, `admin/support`, `admin/reports`,
  `admin/staff`.
- DTOs validated with **zod** (via the existing `nestjs-zod` convention); list endpoints take
  pagination/search/filter query DTOs; action endpoints take typed bodies.
- **Finance reuses `LedgerService`** — approve/reject post **balanced** journal entries through the
  existing double-entry engine; balances stay ledger-derived (never stored on accounts). The
  **SIMULATION rail stays on**: withdrawals remain `simulated: true` in v1; nothing flips to LIVE.
- **`AuditLog`** — every state-changing admin action (KYC decision, withdrawal approve/reject, account
  suspend, leverage change, role assignment, ticket status change) writes `{ userId(actor), action,
  entity, entityId, metadata, ip, userAgent }` via the existing `AuditService`.

---

## 5. Data model (shipped in Phase 1)

Additions already in `server/prisma/schema.prisma` + migrations:

- `UserRole` += `AGENT`.
- `Lead` — id, name, email, phone?, country?, `source` (DEMO|REGISTER|MANUAL, default MANUAL),
  `status` (NEW|CONTACTED|QUALIFIED|CONVERTED|LOST, default NEW), `assignedToId`→`assignedTo`
  (`@relation("LeadAssignee")`, SetNull), `convertedUserId`→`convertedUser` (`LeadConverted`, SetNull),
  `notes` LeadNote[], createdAt, updatedAt, `@@index([status])`, `@@index([assignedToId])`.
- `LeadNote` — id, leadId→lead (Cascade), authorId→author, body, createdAt, `@@index([leadId])`.
- `ClientNote` — id, clientId→client (Cascade), authorId→author, body, `pinned` (default false),
  createdAt, `@@index([clientId])`.
- `Ticket` — id, userId→user (Cascade), subject, category, `priority` (LOW|MEDIUM|HIGH, default
  MEDIUM), `status` (OPEN|IN_PROGRESS|RESOLVED, default OPEN), assignedToId→assignedTo (SetNull),
  `messages` TicketMessage[], createdAt, updatedAt, `@@index([status])`, `@@index([userId])`.
- `TicketMessage` — id, ticketId→ticket (Cascade), authorId→author, body, `internal` (default false,
  staff-only note vs client-visible reply), createdAt, `@@index([ticketId])`.
- `User` gains back-relations: assignedLeads, convertedFromLeads, leadNotes, clientNotesAbout,
  clientNotesAuthored, tickets, assignedTickets, ticketMessages.

The client-facing `/portal/support` is **re-wired to the `Ticket` model** (Phase 5), replacing the
current frontend-only mock.

---

## 6. API surface (per module)

REST list/detail/action, zod-validated, guarded per §3. Representative endpoints:

- `admin/dashboard` — `GET /` summary KPIs; `GET /activity` recent feed.
- `admin/clients` — `GET /` (search/paginate), `GET /:id` (360 bundle: profile+accounts+balances+kyc+
  tx+notes+activity), `POST /:id/notes`, `PATCH /:id/notes/:noteId` (pin).
- `admin/leads` — `GET /` (by status), `POST /`, `PATCH /:id` (status/assignee), `POST /:id/notes`,
  `POST /:id/convert`.
- `admin/kyc` — `GET /queue`, `GET /:userId`, `POST /:userId/approve`, `POST /:userId/reject` (+ notify).
- `admin/finance` — `GET /deposits`, `GET /withdrawals?status=PENDING`, `POST /withdrawals/:id/approve`
  (→ LedgerService), `POST /withdrawals/:id/reject`, `POST /adjustments` (**Admin**).
- `admin/accounts` — `GET /`, `PATCH /:id/status`, `PATCH /:id/leverage` (**Admin**).
- `admin/support` — `GET /tickets`, `GET /tickets/:id`, `PATCH /tickets/:id` (status/assignee),
  `POST /tickets/:id/messages` (`internal` flag).
- `admin/reports` — `GET /summary`, `GET /funnel`, `GET /agents` (Agent: read).
- `admin/staff` — `GET /` (Admin), `PATCH /:id/role` (Admin), `GET /audit` (Admin).

---

## 7. Module-by-module product & UI concept

Each module: **purpose · layout · components · interactions · data · role behavior**.

### 7.1 Dashboard
- **Layout:** 5 `KpiWidget` tiles (Total Clients, Pending KYC, Pending Withdrawals, Deposits Today,
  Open Tickets) in a responsive grid; below, a **Recent Activity feed** (audit-derived, newest first).
- **Interactions:** each KPI is a shortcut (Pending Withdrawals → Finance queue filtered to PENDING;
  Pending KYC → KYC queue). Feed rows link to the relevant client/ticket.
- **Data:** `GET /admin/dashboard` (live counts from users/kyc/ledger/tickets); activity from `AuditLog`.
- **Role:** identical for Admin/Agent.

### 7.2 Clients
- **Layout:** dense `AdminDataTable` (name, email, country, accounts #, balance, KYC chip, status,
  joined) with a `FilterBar` (search, KYC status, account status). Row click opens the **ClientDrawer**
  (right-hand slide-over).
- **ClientDrawer tabs:** Overview (profile + balances), Accounts, Transactions, KYC, **Notes**
  (pinned first; add note), Activity (audit timeline).
- **Interactions:** add/pin internal notes; jump to the client's KYC/Finance items.
- **Data:** `GET /admin/clients`, `GET /admin/clients/:id`; notes via `ClientNote`.
- **Role:** both tiers read; both can add notes. (Money/account actions live in their own modules.)

### 7.3 Leads
- **Layout:** **LeadKanban** with 5 columns (New, Contacted, Qualified, Converted, Lost). Cards show
  name, source chip (DEMO/REGISTER/MANUAL), assignee avatar, last-activity.
- **Interactions:** drag a card to change `status`; assign to an agent; add note / follow-up; "Convert"
  links the lead to a client User. **Demo + registration submissions auto-create leads** (source
  DEMO/REGISTER).
- **Data:** `Lead` + `LeadNote`; `PATCH /admin/leads/:id`, `POST /admin/leads/:id/convert`.
- **Role:** both tiers; Agents typically see their assigned leads, Admins see all.

### 7.4 KYC review
- **Layout:** **ApprovalQueue** of pending submissions; selecting one opens a **document viewer**
  (identity / address / selfie via existing `KycDocument` storage references) beside applicant details.
- **Interactions:** Approve or Reject (reject requires a reason). Action writes back to `KycProfile`
  step statuses, **notifies the client**, and audit-logs the decision. Approving unlocks withdrawals
  downstream.
- **Data:** existing KYC models; `POST /admin/kyc/:userId/approve|reject`.
- **Role:** both tiers (it's a review queue, not a money action).

### 7.5 Finance
- **Layout:** Tabs — **Deposits log** (read) and **Withdrawal approval queue** (PENDING first).
  Withdrawal rows: client, account, amount, requested-at, KYC chip, status.
- **Interactions:** **Approve** posts a balanced journal entry via `LedgerService` (stays
  `simulated: true`); **Reject** releases the hold. **Manual adjustment** (credit/debit with memo) is a
  guarded action. Every action → `ConfirmActionModal` → audit log.
- **Role:** **Admin only** for approve/reject/adjustment; Agents do not see Finance actions.
- **Safety:** no client-side authority over money — the UI only calls server endpoints that post ledger
  entries; SIMULATION rail enforced server-side.

### 7.6 Accounts
- **Layout:** `AdminDataTable` of all trading accounts (number, owner, type, mode, leverage, status
  chip, balance).
- **Interactions:** Suspend / Activate; Change leverage (select) — each via `ConfirmActionModal` + audit.
- **Data:** existing account + ledger services; `PATCH /admin/accounts/:id/*`.
- **Role:** **Admin only**.

### 7.7 Support
- **Layout:** **Ticket inbox** (status filter, assignee, priority chip) → **TicketThread** conversation
  view with a composer that toggles **internal note** vs **client-visible reply**.
- **Interactions:** assign ticket, change status (Open/In Progress/Resolved), reply, add internal note.
- **Data:** `Ticket` + `TicketMessage`. **Replaces the frontend-only mock**; the client portal's
  `/portal/support` is wired to the same `Ticket` model so client and staff see one thread.
- **Role:** both tiers.

### 7.8 Partners / IB
- **Layout:** partner list with referred-clients count; partner detail shows referred clients table.
  **Commission setup = read-only stub** (visible, clearly "coming in a later phase").
- **Data:** existing partner/user data where available.
- **Role:** both tiers read; no payout/commission engine in v1.

### 7.9 Reports
- **Layout:** simple chart cards — Deposits, Withdrawals, Net Flow, Conversion Funnel (lead→funded),
  Agent Performance. Date-range `FilterBar`.
- **Data:** aggregates over ledger / leads / users; `GET /admin/reports/*`.
- **Role:** **Admin full; Agent read**.

### 7.10 Staff & Settings
- **Layout:** staff users table with `RoleBadge`; role selector (Admin/Agent); **Audit log viewer**
  (filter by actor/action/date) using `AuditTrail`.
- **Interactions:** assign/curb staff roles; inspect the immutable audit trail.
- **Role:** **Admin only**.

---

## 8. Layout structure (AdminLayout anatomy)

```
┌───────────────────────────────────────────────────────────────────────┐
│ AdminSidebar │  AdminTopbar: page title · global search · 🔔 · staff ▾  │
│  (w-64,      ├──────────────────────────────────────────────────────────┤
│   ink-850)   │  Content region (max-w-6xl, p-6, scrollable)             │
│  Logo+Admin  │   • tables / cards / queues / kanban per module          │
│  nav items   │   • FilterBar at top of list views                       │
│  (role-      │                                            ┌───────────┐  │
│   filtered)  │                                            │ Drawer    │  │
│  Logout      │                                            │ (Client   │  │
│              │                                            │  360 /    │  │
│              │                                            │  detail)  │  │
└──────────────┴────────────────────────────────────────────┴───────────┘
```
- Mobile: sidebar collapses to an animated drawer (framer-motion), same pattern as `PortalLayout`.
- Right-hand **slide-over drawer** is the primary detail surface (Client 360, ticket, lead) so the
  list context stays visible — an operations-desk pattern.

---

## 9. Visual language (native to 27 Markets)

- **Dark black/charcoal with red accents** — reuse tokens: `bg-ink-900`/`ink-850`, panels
  `glass-panel`, primary `brand-500` (#e11d2e), `card-lift`, `red-glow`. Same fonts/spacing as the site.
- **Brokerage-grade, dense-but-readable** ops layout: compact tables, tabular numerals for money,
  sticky table headers, zebra rows, right-aligned amounts.
- **Status chips** via the existing `statusTone` map (success/warning/danger/brand/neutral) for KYC,
  account, journal, ticket, and lead statuses — consistent color semantics across modules.
- **Audit-friendly patterns:** `ConfirmActionModal` for every state change, inline "last action by X at
  Y" stamps, and an immutable `AuditTrail` timeline component.
- Reduced-motion fallbacks (matching the site) and full keyboard/focus support on tables, drawers, modals.

---

## 10. Shared component inventory

`AdminSidebar`, `AdminTopbar`, `RequireStaff`, `AdminDataTable` (sortable, paginated, sticky header),
`FilterBar` (search + status selects), `StatusChip` (statusTone-driven), `RoleBadge`, `ClientDrawer`
(tabbed slide-over), `LeadKanban` + `LeadCard`, `ApprovalQueue`, `KycReviewPanel` (doc viewer),
`TicketThread` + `MessageComposer` (internal toggle), `AuditTrail`, `ConfirmActionModal`, and reused
`KpiWidget` / `ui/*` primitives.

---

## 11. Status references (single source of truth)

- **Lead:** New, Contacted, Qualified, Converted, Lost
- **Ticket:** Open, In Progress, Resolved
- **Account (existing):** Active, Pending, Suspended, Archived
- **KYC (existing):** Not Submitted, Pending, Approved, Rejected
- **Journal (existing):** Pending, Posted, Failed, Reversed

---

## 12. Build phases (each independently demoable)

1. **Backend foundation** — AGENT role, CRM models, migration, admin module + guards. ✅ done.
2. **Admin shell** — AdminLayout, sidebar, RequireStaff, Dashboard with live KPIs. 🔄 in progress.
3. **Clients** (list + 360 drawer + notes) + **KYC review** queue.
4. **Finance** (withdrawal approvals via LedgerService) + **Accounts** admin.
5. **Leads** pipeline + **Support** desk (wire client portal support to `Ticket`).
6. **Partners** stub + **Reports** + **Staff & Settings** + **Audit-log viewer** + polish.

---

## 13. Deferred / non-goals (v1)

Email/SMS campaign builders, automated drip comms, full IB commission engine, partner payouts,
granular per-permission RBAC, SLA timers, bulk import/export. And: **no real money movement** — the
SIMULATION rail stays on; nothing flips to LIVE.

---

## 14. Security requirements

- All `/admin` API routes behind **JWT + RolesGuard**; finance/accounts/role/settings routes **Admin-only**.
- **No client-side authority over money** — money changes happen only through server endpoints that post
  balanced ledger entries.
- Every state-changing action recorded in **`AuditLog`** (who / what / when, with entity + metadata).

---

## 15. How it binds to the existing platform

Same SPA, same router, same `ui/` primitives and tokens, same `api` fetch core (extended by
`adminApi`), same NestJS app and Prisma schema (extended by the `admin/` module and CRM models), same
auth/session/2FA, same double-entry ledger and audit. The CRM is an additional, role-gated surface on
the **one** 27 Markets product — not a separate dashboard.
