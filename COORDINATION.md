# 27 Markets — Working Mode

Updated: 2026-06-23

## Single-agent mode (current)

Multi-agent parallel development has been **retired**. The lane branches and
`integration` trunk were collapsed into a single line on **`main`**, because the
agents shared one working directory and git branches could not isolate them
(branch switches and edits collided). One agent now owns all work.

- **All work happens on `main`** (or a short-lived feature branch merged promptly).
- Commit small and often; keep `main` green: backend `npm run typecheck` + `npm test`
  (from `server/`), frontend `npx tsc -b` + `npm test`.
- Migrations are run one at a time against the dev DB.

> If parallel agents are ever needed again, do it with **git worktrees** (a
> separate directory per agent on its own branch), never multiple agents in one
> checkout: `git worktree add ../27-<lane> <branch>`. Branches alone do not
> isolate processes that edit the same folder.

## CRM roadmap status

- Phase 1 — Backend foundation (AGENT role, CRM models, admin module). ✅ done
- Phase 2 — Admin shell + Dashboard (live KPIs). ✅ done
- Phase 3 — Clients 360 + notes, KYC review (+ server-side queue, document viewing). ✅ done
- Phase 4 — Finance (withdrawal approval lifecycle, adjustments) + Accounts admin. ✅ done
- Phase 5 — Leads (public capture + convert-on-register funnel) + Support desk + portal tickets. ✅ done
- Phase 6 — Partners stub, Reports, Staff & Settings, Audit-log viewer. ✅ done

**All six CRM phases are complete.**

## Key behaviors to remember
- SIMULATION rail stays on; no real money movement. Withdrawals are created
  PENDING and require Admin approval (post) or rejection (ledger reversal).
- Two-tier staff access: ADMIN (full) / AGENT (no finance, accounts, roles, settings).
- Every state-changing admin action is written to `AuditLog`.
