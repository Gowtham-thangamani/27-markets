# Apex Markets / 27 Markets — CRM Back-Office (Design Spec)

Date: 2026-06-22

## Summary
An internal, staff-facing **CRM / back-office** for the existing brokerage platform. It is the
counterpart to the client portal: where clients self-serve (register, fund, KYC, support), staff
use the CRM to **manage leads, clients, identity verification, deposits/withdrawals, support,
partners, and reporting** — under role-based access with a full audit trail.

This v1 is an **all-in-one admin shell** (breadth over depth): every module exists, each scoped to
its highest-value slice. It is wired to the **real NestJS backend** (extending it where needed),
not mock data.

## Decisions (from brainstorming)
- **v1 focus:** all-in-one admin shell — touch every module, depth comes later.
- **Backend:** real — extend the existing NestJS app; add endpoints/models as required.
- **Access model:** two-tier — **Admin** (full) and **Agent** (limited). No granular per-permission
  RBAC in v1.

## Architecture

### Frontend
- New `/admin` route group **inside the existing React SPA**.
- New `AdminLayout` (own sidebar, distinct from client `PortalLayout`), reusing existing `ui/`
  primitives and the black/red token system for visual consistency.
- New `RequireStaff` guard wrapping `/admin/*`: only `ADMIN` or `AGENT` pass; `CLIENT`/`PARTNER`
  are redirected to their portal.
- New `adminApi` client layer mirroring `src/lib/api.ts`.

Structure:
```
src/layouts/AdminLayout.tsx
src/components/admin/*        (AdminSidebar, ClientDrawer, LeadKanban, ApprovalQueue, …)
src/pages/admin/*            (one page per module)
src/lib/adminApi.ts
```

### Backend (extend existing NestJS app)
- New `admin/` module namespace: controllers per area, all guarded with
  `@Roles(ADMIN, AGENT)` (shared) or `@Roles(ADMIN)` (finance approvals, role/staff management,
  settings).
- Finance approve/reject **reuses the existing `LedgerService`** to POST balanced journal entries,
  respecting the SIMULATION rail (withdrawals stay `simulated: true`).
- Every state-changing admin action writes to the existing `AuditLog`.

## Access control (two-tier)
| Capability | Admin | Agent |
|---|---|---|
| Dashboard, Clients, Leads, Support, KYC review | ✅ | ✅ |
| Finance approvals (withdrawals, adjustments) | ✅ | ❌ |
| Accounts admin (suspend/leverage) | ✅ | ❌ |
| Staff & role management, Settings, Audit log | ✅ | ❌ |
| Reports | ✅ | ✅ (read) |

Implemented by adding **`AGENT`** to the existing `UserRole` enum (`CLIENT | PARTNER | ADMIN`).

## Modules & v1 scope (breadth over depth)
| Module | v1 scope | Backend |
|---|---|---|
| **Dashboard** | KPI tiles (clients, pending KYC, pending withdrawals, deposits today, open tickets) + recent activity feed | reads existing |
| **Clients** | Searchable list → Client 360 drawer: profile, accounts, balances, KYC status, transactions, notes, activity | existing + **Note** |
| **Leads** | Kanban pipeline (New→Contacted→Qualified→Converted→Lost), assign to agent, add note/follow-up; demo/register submissions land here | **Lead** |
| **KYC review** | Queue of pending submissions → view docs → Approve/Reject (writes back, notifies client) | existing |
| **Finance** | Deposits log + Withdrawal approval queue (approve→POST ledger / reject); manual adjustment (Admin) | existing ledger |
| **Accounts** | All trading accounts; suspend/activate, change leverage | existing |
| **Support** | Staff ticket inbox, assign, reply, change status; internal notes | **Ticket** |
| **Partners (IB)** | List partners + referred clients; commission setup is read-only stub | reads existing |
| **Reports** | Deposits/withdrawals/net flow, conversion funnel, agent performance — simple charts | reads existing |
| **Staff & Settings** (Admin) | Manage staff users, assign Admin/Agent role, view audit log | role mgmt |

### Deferred (NOT v1)
Email/SMS campaign builder, automated drip comms, full IB commission engine + payouts, granular
per-permission RBAC, SLA timers, bulk import/export.

## Data model additions (Prisma)
Add `AGENT` to `UserRole`. Three new models:

```prisma
model Lead {
  id              String     @id @default(cuid())
  name            String
  email           String
  phone           String?
  country         String?
  source          LeadSource @default(MANUAL)   // DEMO | REGISTER | MANUAL
  status          LeadStatus @default(NEW)       // NEW | CONTACTED | QUALIFIED | CONVERTED | LOST
  assignedToId    String?                        // staff User
  assignedTo      User?      @relation("LeadAssignee", fields: [assignedToId], references: [id])
  convertedUserId String?                        // client User after conversion
  notes           LeadNote[]
  createdAt       DateTime   @default(now())
  updatedAt       DateTime   @updatedAt
  @@index([status]); @@index([assignedToId])
}

model LeadNote {
  id        String   @id @default(cuid())
  leadId    String
  lead      Lead     @relation(fields: [leadId], references: [id], onDelete: Cascade)
  authorId  String                              // staff User
  body      String
  createdAt DateTime @default(now())
  @@index([leadId])
}

model ClientNote {
  id        String   @id @default(cuid())
  clientId  String                              // client User
  authorId  String                              // staff User
  body      String
  pinned    Boolean  @default(false)
  createdAt DateTime @default(now())
  @@index([clientId])
}

model Ticket {
  id           String         @id @default(cuid())
  userId       String                            // client User
  subject      String
  category     String
  priority     TicketPriority @default(MEDIUM)   // LOW | MEDIUM | HIGH
  status       TicketStatus   @default(OPEN)     // OPEN | IN_PROGRESS | RESOLVED
  assignedToId String?                           // staff User
  messages     TicketMessage[]
  createdAt    DateTime       @default(now())
  updatedAt    DateTime       @updatedAt
  @@index([status]); @@index([userId])
}

model TicketMessage {
  id        String   @id @default(cuid())
  ticketId  String
  ticket    Ticket   @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  authorId  String
  body      String
  internal  Boolean  @default(false)            // staff-only note vs client-visible reply
  createdAt DateTime @default(now())
  @@index([ticketId])
}
```
Relations back to `User` are added on the `User` model as needed. The existing client-facing
`/portal/support` is re-wired to the new `Ticket` model, replacing its current frontend-only mock.

## API surface (new controllers under `admin/`)
`admin/dashboard`, `admin/clients`, `admin/leads`, `admin/kyc`, `admin/finance`, `admin/accounts`,
`admin/support`, `admin/reports`, `admin/staff`. Standard REST list/detail/action endpoints,
DTO-validated with zod (matching existing module conventions), guarded per the access table.

## Status reference
- Lead: New, Contacted, Qualified, Converted, Lost
- Ticket: Open, In Progress, Resolved
- (Existing) Account: Active, Pending, Suspended, Archived; KYC step: Not Submitted, Pending,
  Approved, Rejected; Journal: Pending, Posted, Failed, Reversed.

## Build phases (each independently demoable)
1. **Backend foundation** — add `AGENT` role; Lead/LeadNote/ClientNote/Ticket/TicketMessage models
   + migration; `admin/` module scaffold with guards.
2. **Admin shell** — `AdminLayout`, sidebar, `RequireStaff`, Dashboard with live KPIs.
3. **Clients** (list + 360 drawer + notes) and **KYC review** queue.
4. **Finance** (withdrawal approvals via LedgerService) + **Accounts** admin.
5. **Leads** pipeline + **Support** desk (and wire client portal support to real tickets).
6. **Partners** stub + **Reports** + **Staff & Settings** + audit-log viewer + polish.

## Non-goals (v1)
- No marketing/campaign automation.
- No full IB commission/payout engine.
- No granular per-permission RBAC (two-tier only).
- No real money movement — SIMULATION rail stays on; nothing flips to LIVE.

## Security notes
- All `/admin` API routes behind JWT + RolesGuard; finance/role/settings routes Admin-only.
- No client-side authority over money — approvals POST server-side ledger entries only.
- Every state-changing action recorded in `AuditLog` (who/what/when).
