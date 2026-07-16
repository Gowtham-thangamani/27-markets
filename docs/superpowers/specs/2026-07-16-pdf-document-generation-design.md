# PDF Document Generation — Design

**Date:** 2026-07-16
**Status:** Approved (design); not yet implemented

## Problem

The admin PDF Templates page (`TextTemplate` where `kind = 'PDF'`) stores template
bodies but nothing renders them. Templates are plain text with `{{token}}`
placeholders. Two are seeded:

- **Account Statement** — `Statement for {{clientName}} — period {{period}}.\nBalance: {{balance}}`
- **Deposit Receipt** — `Receipt for deposit of {{amount}} by {{clientName}} on {{date}}.`

No PDF library is installed. This design wires the config page into real
document generation.

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Trigger | Admin, on a client, from the CRM client-detail modal | Smallest real slice; both seeded templates fit; no client-facing risk while in SIMULATION |
| Persistence | Render on-the-fly, stream to browser; audit the event | No storage/retention concerns; audit still answers "who issued this document" |
| Placeholders | Auto-resolve known tokens, prompt admin for the rest | Handles `{{period}}`/`{{amount}}` without hardcoding; new templates need no code change |
| Library | PDFKit | Pure Node, no Chromium; streams to the response; fits a modest EC2 box |
| Account-scoped tokens | Admin picks the trading account | A client may have several accounts; a statement must name the account it covers |

### Why not the alternatives

- **Puppeteer** would reuse the branded HTML from `email.service.ts` and look
  best, but costs a ~150MB Chromium and a browser process per render on EC2 —
  too heavy for two text documents.
- **pdf-lib** is pure JS like PDFKit but lower-level; we would hand-roll text
  wrapping and pagination for no gain.
- **Storing every PDF** is truer to broker record-keeping but needs storage
  config and a retention story. Deferred; see Future Work.

## Architecture

New module `server/src/documents/`, split so the error-prone logic is pure and
testable without mocks:

| File | Responsibility | Depends on |
|---|---|---|
| `pdf-renderer.ts` | `(title, body, footer) → Buffer` via PDFKit | PDFKit only |
| `document-vars.ts` | Token extraction; auto/manual split; `needsAccount` | nothing |
| `documents.service.ts` | Orchestrate: template → client/account → vars → render → audit | Prisma, Ledger, Audit |
| `admin-documents.controller.ts` | HTTP routes, staff-guarded | service |
| `documents.module.ts` | Nest wiring | — |

`pdf-renderer.ts` and `document-vars.ts` have no Prisma dependency, so their
tests need no database mocking.

## Endpoints

Both under `/admin/documents`, guarded by `RolesGuard` + `@Roles(...STAFF_ROLES)`,
matching `admin-partners.controller.ts`.

### `GET /admin/documents/prepare`

Query: `templateId`, `clientId`, optional `accountId`.

```ts
{
  autoVars: Record<string, string>,   // resolved server-side
  manualTokens: string[],             // admin must supply
  needsAccount: boolean,              // body references an account-scoped token
  accounts: { id: string, label: string }[]
}
```

### `POST /admin/documents/generate`

Body: `{ templateId, clientId, accountId?, vars: Record<string, string> }`

Responds `application/pdf` with
`Content-Disposition: attachment; filename="<template-slug>-<client>-<date>.pdf"`.

## Token resolution

**Auto-resolved (client-scoped):** `clientName`, `clientEmail`, `date`
**Auto-resolved (account-scoped):** `accountNumber`, `balance`, `currency`

`balance` comes from `ledger.balanceOf(account.ledgerAccount.id)` formatted via
`formatMoney`, the same path `admin-crm.service.getClient` already uses.
`accountNumber` resolves to `TradingAccount.number` (the human-facing account
number), not the internal cuid — a cuid on a client-facing document is noise.
`currency` resolves to `TradingAccount.currency` (defaults to `USD`).

Any other token in the body is returned as a `manualTokens` entry and rendered
from admin input. A token the admin leaves blank renders as an empty string,
consistent with `EmailService.subst`.

`needsAccount` is true when the body references any account-scoped token. The UI
shows the account picker only then.

## Shared token helper

The `{{\w+}}` substitution regex is currently private in
`server/src/email/email.service.ts` (`subst`). Lift it to a shared helper in
`server/src/common/` exposing `substituteTokens(text, vars)` and
`extractTokens(text)`. `EmailService` is refactored to use it so the two copies
cannot drift. This is the only pre-existing code touched.

## Data flow

1. Admin opens a client in the CRM (`ClientDetailModal` in `AdminClientsPage.tsx`).
2. Clicks **Generate document**; picks an enabled `kind='PDF'` template.
3. UI calls `prepare` → renders the account picker (if `needsAccount`) and one
   input per `manualTokens` entry.
4. Admin submits → `POST /generate` → response blob downloads.
5. Service records an audit entry after a successful render.

## Error handling

| Condition | Response |
|---|---|
| Template not found | 404 |
| Template `kind !== 'PDF'` | 400 |
| Template `enabled === false` | 400 — do not issue documents from a disabled template |
| Client not found | 404 |
| `accountId` does not belong to `clientId` | 400 — **security-critical** |
| `needsAccount` but no `accountId` given | 400 |
| PDF render throws | 500; no audit entry recorded |

The `accountId` ownership check is the important one: without it, staff could
render another client's balance onto this client's statement.

Audit is recorded only after a successful render, so failures leave no phantom
"document issued" entry. Action: `documents.generate`, entity `TextTemplate`,
with `clientId` / `accountId` in metadata.

## SIMULATION safeguard

These documents look like real financial records while the platform is on the
SIMULATION rail. The PDF footer prints:

> `SIMULATION — not a valid financial document`

whenever the backend is not in LIVE mode, so a simulated statement cannot be
mistaken for a real one. The footer disappears when the platform goes LIVE.

Mode comes from the existing `TRADING_MODE` env var, validated in
`server/src/config/env.validation.ts` as `z.enum(['SIMULATION', 'LIVE'])` with
default `SIMULATION`, and read via `ConfigService.get('TRADING_MODE')` — the same
mechanism `admin-finance.service.ts` already uses. The footer renders whenever
`TRADING_MODE !== 'LIVE'`, so the safeguard fails safe: a missing or malformed
value keeps the watermark rather than removing it.

## Testing

**`pdf-renderer.spec.ts`** — returns a Buffer starting with `%PDF`; SIMULATION
footer present in simulation mode and absent in LIVE.

**`document-vars.spec.ts`** — `extractTokens` finds all tokens; auto/manual split
is correct for both seeded templates; `needsAccount` true for Account Statement
(references `{{balance}}`) and false for Deposit Receipt.

**`documents.service.spec.ts`** — resolves `clientName`/`balance`; rejects a
foreign `accountId`; rejects a disabled template; audits on success; does not
audit on render failure.

**Frontend** — generate-modal spec: lists enabled PDF templates, shows inputs for
manual tokens, shows the account picker only when `needsAccount`, calls generate.

Follows the existing spec conventions (plain `new Service(prismaMock, auditMock)`,
per `admin-account-types.service.spec.ts`). Note the DataTable `filter: 'select'`
selector collision: prefer `getAllByText(...).length > 0` in page specs.

## Out of scope / future work

- Storing generated PDFs (`GeneratedDocument` model + S3/disk) and feeding the
  Document Tracker page, which currently has no backend data source.
- Client self-serve document download from the portal.
- Bulk or scheduled statement generation.
- Branded HTML-quality layout (would require the Puppeteer trade-off above).
