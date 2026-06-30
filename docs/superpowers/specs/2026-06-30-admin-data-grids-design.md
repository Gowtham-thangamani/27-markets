# Admin Data Grids + Document Viewer — Design

**Date:** 2026-06-30
**Status:** Approved (pending spec review)
**Branch:** `feat/admin-data-grids`

## Context

We are closing a gap identified by benchmarking our back-office CRM against
Centroid FXCRM (the incumbent SaaS the broker is trialing). Centroid's signature
back-office pattern is a **data grid with a filter control under every column
header**, plus an in-app **document viewer** for KYC files.

Today every admin page (`Clients`, `Leads`, `Partners`, `Staff`, `KYC`) hand-rolls
its own `<table>`. There is **no reusable table component and no per-column
filtering anywhere**. "View document" exists only on the KYC page as a bare
`<a target="_blank">` link ([AdminKycPage.tsx:104](../../../src/pages/admin/AdminKycPage.tsx#L104)).

This work is **frontend-only**. It does not touch the backend, the
SIMULATION/LIVE rail, money flows, or any API. It reuses existing endpoints.

## Goals

1. A reusable `DataTable<T>` component with per-column, type-appropriate filtering
   and sorting, applied to all admin tables.
2. An in-app `DocumentViewerModal` replacing the new-tab link.
3. Filters tailored to each section's own columns (text / select / date / boolean).

## Non-goals

- No backend changes; no new endpoints.
- No change to authentication, money flows, or the simulation flag.
- No server-side filtering/pagination (data volumes are modest; client-side is
  sufficient and instant). Revisit only if a list grows beyond ~a few thousand rows.
- Not building the deeper Centroid modules (MT5, PSP, IB rebates, multi-entity) —
  those are separate, larger efforts tracked in the gap analysis.

## Architecture

Two new reusable pieces under `src/components/admin/table/`:

### `DataTable<T>`

`src/components/admin/table/DataTable.tsx`. Generic, config-driven. Replaces the
hand-rolled `<table>` markup in each admin page.

```ts
type ColumnFilter = 'text' | 'select' | 'date' | 'boolean' | false

interface Column<T> {
  key: string
  header: string
  accessor: (row: T) => string | number | boolean | null  // value for filter + sort
  render?: (row: T) => React.ReactNode                     // optional rich cell
  filter?: ColumnFilter                                    // default: false
  filterOptions?: { label: string; value: string }[]       // for 'select'
  align?: 'left' | 'center' | 'right'
  sortable?: boolean                                        // default: false
}

interface DataTableProps<T> {
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T) => string
  onRowClick?: (row: T) => void
  loading?: boolean
  error?: string | null
  onRetry?: () => void
  emptyIcon?: LucideIcon
  emptyTitle?: string
  emptyDescription?: string
  minWidthClass?: string   // e.g. "min-w-[640px]"
}
```

Behavior:

- Renders header row, then a **filter row** beneath it. Each filter cell renders
  the control dictated by that column's `filter` type:
  - `text` → debounced `Input` (case-insensitive substring match on `accessor`)
  - `select` → `Select`; options from `filterOptions`, or auto-derived from the
    distinct `accessor` values when omitted
  - `date` → date `Input` (`type="date"`); matches rows whose `accessor` date
    equals the chosen day
  - `boolean` → `Select` with All / Yes / No
  - `false` / omitted → no filter cell (header only)
- **Filtering and sorting are client-side**, recomputed with `useMemo` over `rows`.
- Sortable columns toggle asc/desc/none on header click; show a caret indicator.
- Delegates loading/empty/error to existing `SkeletonRows`, `EmptyState`,
  `ErrorState`. Wraps in the existing `glass-panel` + `overflow-x-auto` shell so
  the visual style is unchanged.
- All filter state is internal to `DataTable`; pages stay thin.

### `DocumentViewerModal`

`src/components/admin/table/DocumentViewerModal.tsx`. Wraps the existing `Modal`.

```ts
interface DocumentViewerModalProps {
  open: boolean
  onClose: () => void
  url: string | null
  fileName?: string
  mimeType?: string   // inferred from extension when absent
}
```

- Images render inline (`<img>`); PDFs render in an `<embed>`/`<iframe>`.
- Always offers **Download** and **Open in new tab** as fallbacks (covers
  unknown/unsupported types).
- Uses the existing `adminApi.kycDocumentUrl(id)` for the source URL.

## Per-table column + filter specs

Filters are typed to each section's own columns:

| Page | Columns (filter type) |
|---|---|
| **Clients** | Name `text` · Email `text` · Country `select` · Accounts `none` · KYC `select` · Joined `date` |
| **Leads** | Name `text` · Email `text` · Source `select` · Assigned `select` · Status `select` · Created `date` |
| **Partners** | Name `text` · Email `text` · Country `select` · Status `select` · Joined `date` |
| **Staff** | Name `text` · Email `text` · Role `select` · Status `select` |
| **KYC / Pending Documents** | Client `text` · Email `text` · Doc Type `select` · Step `select` · Status `select` · **View document** action column |
| **Finance — Recent Deposits** | Client `text` · Account `text` · Amount `none` · Date `date` |

Notes:

- `select` options come from known enums (KYC/lead/staff statuses, lead source)
  or are auto-derived from data (distinct countries).
- The Finance **approval queues** (pending withdrawals, deposit requests) keep
  their current action-button card layout — only **Recent Deposits** becomes a
  filterable `DataTable`. Action columns (View document, Approve/Reject) are
  rendered via `column.render`.
- The KYC page's current per-client card layout is replaced by a single
  documents-oriented grid with the View-document action and per-column filters.

## Data flow

Unchanged. Pages still call their existing `adminApi.*` loaders and hold the
fetched rows in state. The rows array is handed to `DataTable`, which owns all
filter/sort UI state and derives the visible rows client-side. No new network
calls; the document viewer streams from the existing document URL.

## Error handling

- Page-level fetch errors flow into `DataTable`'s `error`/`onRetry` (same
  `ErrorState` as today).
- Document viewer: if the embed fails to load (unsupported type / network), the
  Download + Open-in-new-tab actions remain available; show a short fallback note.

## Testing

- New `src/components/admin/table/DataTable.spec.tsx`: text filter (substring,
  case-insensitive), select filter, date filter, boolean filter, sort
  asc/desc/none, empty/loading/error rendering, `onRowClick`.
- New `DocumentViewerModal.spec.tsx`: renders image vs PDF vs unknown; download
  and open-in-new-tab links present; closes.
- Keep existing page specs green
  (`AdminClientsPage.spec.tsx`, `AdminKycPage.spec.tsx`, etc.); update selectors
  where the markup changes.

## Build sequence (incremental)

1. `DataTable<T>` + `DataTable.spec.tsx`.
2. `DocumentViewerModal` + spec.
3. Convert **Clients** (proof of the pattern); keep its spec green.
4. Roll out: Leads → Partners → Staff → KYC/Pending Documents → Finance Recent Deposits.
5. Export the new components from a barrel and update `src/components/ui`/admin
   indexes as needed.
