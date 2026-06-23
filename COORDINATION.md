# 27 Markets — Multi-Agent Coordination

> **Every agent reads this FIRST, before editing anything.** Its purpose: let several agents
> build in parallel **without colliding**. We collided repeatedly because multiple agents edited
> the same files at once. The rule below makes that impossible if everyone follows it.

Last updated: 2026-06-23

---

## 1. The one rule that prevents collisions

**You may only edit files inside YOUR lane (Section 3). You may NOT edit another lane's files or any
HOTSPOT file (Section 4) directly.** Need a change in someone else's file or a hotspot? File a
request in Section 6 — the Integrator applies it. This is non-negotiable; it is the whole point.

---

## 2. Branch & integration model

- `main` — released/stable.
- `integration` — the shared trunk all lanes branch from and merge back into. (If it doesn't exist:
  Integrator creates it from `main`.)
- Each lane works on its own branch: `feat/<lane>` (e.g. `feat/crm-finance`).
- Flow per lane: branch from `integration` → work only on your files → commit small & often →
  when a slice is green, open it for the Integrator to merge into `integration` → re-branch/rebase.
- **Rebase on `integration` before you start each work session** so you have the latest hotspot wiring.
- Never `git add -A`/`git add .`. Stage your lane's exact files by path, so you never sweep another
  agent's edits into your commit.

---

## 3. Lane ownership map

Each lane owns these paths exclusively. No other agent edits them.

| Lane | Branch | Backend (server/src/…) | Frontend (src/…) | Status |
|------|--------|------------------------|------------------|--------|
| **Integrator** | `integration` | HOTSPOTS only (Section 4) + module wiring | HOTSPOTS only | active |
| **L1 · Finance & Accounts** (Phase 4) | `feat/crm-finance` | `funds/`, `ledger/`, `accounts/`, `admin/admin-finance.*`, `admin/admin-accounts.*` | `pages/admin/AdminFinancePage.tsx`, `pages/admin/AdminAccountsPage.tsx`, `lib/financeApi.ts` | open |
| **L2 · Leads & Support** (Phase 5) | `feat/crm-leads-support` | `admin/admin-crm.*` (leads+tickets), `support/`, `kyc/` | `pages/admin/AdminLeadsPage.tsx`, `pages/admin/AdminSupportPage.tsx`, `pages/admin/AdminKycPage.tsx`, `pages/portal/SupportPage.tsx`, `lib/supportApi.ts` | open |
| **L3 · Blog / CMS** | `feat/blog` | `blog/` | `pages/Blog*.tsx`, `pages/admin/AdminBlog*.tsx`, `lib/blogApi.ts`, `lib/useSeo.ts` | open |
| **L4 · Market data** | `feat/market` | `market/` | `components/marketing/Live*.tsx`, `components/marketing/DfmBoard.tsx`, `lib/marketApi.ts`, `lib/useLiveQuotes.ts` | open |
| **L5 · Reports & Staff** (Phase 6) | `feat/crm-reports-staff` | `admin/admin-reports.*`, `admin/admin-staff.*`, `audit/` | `pages/admin/AdminReportsPage.tsx`, `pages/admin/AdminStaffPage.tsx`, `lib/reportsApi.ts` | open |
| **L6 · Clients & Dashboard** (Phase 3, done) | merged | `admin/admin-dashboard.*`, `admin/admin-crm.*` (clients) | `pages/admin/AdminClientsPage.tsx`, `pages/admin/AdminDashboardPage.tsx` | mostly merged |

> If two lanes truly must share a service file (e.g. `admin-crm.*` is used by both L2 and L6),
> split it into per-concern files (`admin-leads.service.ts`, `admin-support.service.ts`,
> `admin-clients.service.ts`) so each lane owns its own file. Ask the Integrator to do the split.

---

## 4. HOTSPOT files — Integrator-only

These are the cross-cutting files that everyone's work needs to touch. **No lane edits them
directly.** They change ONLY via a wiring request (Section 6) that the Integrator applies.

- `src/App.tsx` — routes
- `src/components/admin/adminNav.ts` — admin sidebar items
- `src/lib/adminApi.ts` and `src/lib/api.ts` — shared API client
- `server/src/app.module.ts` — Nest module registration
- `server/prisma/schema.prisma` + `server/prisma/migrations/**` — data model
- `package.json` / `package-lock.json` (root and `server/`) — dependencies
- `COORDINATION.md` (this file — Section 5/6 status updates are the exception: append-only)

**Migrations are serialized:** only the Integrator runs `prisma migrate dev`. A lane needing a model
change files a request; the Integrator updates the schema + migration so two agents never generate
conflicting migrations against the same DB.

---

## 5. Status board (each agent updates its OWN row, append-only edits)

| Agent / Lane | Working on | Files locked (editing now) | Branch @ commit | Updated |
|--------------|-----------|----------------------------|-----------------|---------|
| Integrator | trunk + wiring | — | integration @ — | 2026-06-23 |
| L1 Finance | (unassigned) | — | — | — |
| L2 Leads/Support | (unassigned) | — | — | — |
| L3 Blog | (unassigned) | — | — | — |
| L4 Market | (unassigned) | — | — | — |
| L5 Reports/Staff | (unassigned) | — | — | — |

Update your row when you start, when you lock files, and after each commit. "Files locked" = the
files you are actively mid-edit on right now (others must not open them even within your lane if
they're pairing).

---

## 6. Wiring-request queue (lane → Integrator)

Need a route, nav item, adminApi method, Nest module registration, dependency, or schema/model?
**Do not edit the hotspot yourself.** Append a request here; the Integrator applies it to the
hotspot file on `integration` and ticks it done. Keep each request copy-paste-ready.

Format:
```
### REQ-<n> — <lane> — <short title>  [ ] open / [x] done
File: <hotspot file>
Change: <exact snippet to add / model to add>
```

Example:
```
### REQ-1 — L1 Finance — register admin finance route + nav  [ ] open
File: src/App.tsx
Change: add <Route path="finance" element={<AdminFinancePage />} /> under the /admin group
File: src/components/admin/adminNav.ts
Change: add { label: 'Finance', to: '/admin/finance', icon: Banknote }
File: src/lib/adminApi.ts
Change: add finance methods (listPendingWithdrawals, approveWithdrawal, rejectWithdrawal, adjust)
```

(no requests yet)

---

## 7. Commit & verification discipline

- Commit small and often; each commit self-contained (don't reference files not in the same commit).
- Before opening a slice for merge: your lane's tests pass and typecheck is clean
  (`npx tsc -b` / frontend `npm test`; backend `npm run typecheck` / `npm test`).
- End commit messages with the standard `Co-Authored-By` trailer.
- If you hit a file you don't own: stop, file a wiring request, keep moving on your own files.

---

## 8. Phase → lane mapping (current CRM roadmap)

- Phase 3 (Clients 360, KYC review) — **done/merging** (L6). KYC pending-queue endpoint still open
  (L2 owns `admin-crm`/`kyc` now).
- Phase 4 (Finance withdrawal approvals via LedgerService, Accounts admin) — **L1**. Note: requires
  changing the withdrawal lifecycle to PENDING→approve(POST)/reject(reverse); coordinate the
  `ledger.post` status addition through the Integrator since `ledger/` is shared money code.
- Phase 5 (Leads convert + auto-create, Support, wire portal support to tickets) — **L2**.
- Phase 6 (Partners stub, Reports, Staff & Settings, Audit-log viewer) — **L5**.
- Blog/CMS and Market data run in parallel as **L3 / L4**.
