# Admin Data Grids + Document Viewer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a reusable, config-driven `DataTable<T>` with per-column typed filters + sorting and an in-app `DocumentViewerModal`, then convert every admin table to use them.

**Architecture:** One generic `DataTable<T>` owns all filter/sort UI state and derives visible rows client-side from a `rows` array; pages stay thin and only supply a `columns` config + their existing loaders. A `DocumentViewerModal` wraps the existing `Modal` to render images/PDFs in-app. Frontend-only — no backend, API, money-flow, or simulation-flag changes.

**Tech Stack:** React 18 + TypeScript, Vite, Tailwind, lucide-react, Vitest + @testing-library/react (jsdom).

## Global Constraints

- Frontend only. Do NOT modify backend, `src/lib/adminApi.ts` endpoints, auth, money flows, or any SIMULATION/LIVE flag.
- Filtering and sorting are **client-side** over already-loaded rows. No new network calls, no server-side pagination.
- Reuse existing UI primitives: `Input`, `Select`, `Badge`, `Modal`, `Button`, `SkeletonRows`, `EmptyState`, `ErrorState` from `@/components/ui`. Reuse `glass-panel` + `overflow-x-auto` shell so visual style is unchanged.
- Test runner: `npx vitest run <path>` for one file; `npm test` for all. Mock `@/lib/adminApi` and `@/context/ToastContext` with `vi.mock` (factory must be self-contained — no outer refs).
- TypeScript must compile: `npm run build` (runs `tsc -b`). No `any`.
- Commit after every task. Branch: `feat/admin-data-grids`.

---

### Task 1: `DataTable<T>` component (types + filter/sort engine)

**Files:**
- Create: `src/components/admin/table/types.ts`
- Create: `src/components/admin/table/DataTable.tsx`
- Test: `src/components/admin/table/DataTable.spec.tsx`

**Interfaces:**
- Consumes: `@/components/ui` (`Input`, `Select`, `SkeletonRows`, `EmptyState`, `ErrorState`), `@/lib/cn`.
- Produces:
  - `type ColumnFilter = 'text' | 'select' | 'date' | 'boolean' | false`
  - `interface Column<T>` with `key, header, accessor:(row:T)=>string|number|boolean|null, render?, filter?, filterOptions?, align?, sortable?`
  - `interface DataTableProps<T>` with `columns, rows, rowKey:(row:T)=>string, onRowClick?, loading?, error?, onRetry?, emptyIcon?, emptyTitle?, emptyDescription?, minWidthClass?`
  - `function DataTable<T>(props: DataTableProps<T>): JSX.Element`

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/admin/table/DataTable.spec.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { DataTable } from './DataTable'
import type { Column } from './types'

interface Row { id: string; name: string; country: string; active: boolean; joined: string }
const rows: Row[] = [
  { id: '1', name: 'Ada Lovelace', country: 'GB', active: true, joined: '2026-01-01T00:00:00.000Z' },
  { id: '2', name: 'Alan Turing', country: 'GB', active: false, joined: '2026-02-02T00:00:00.000Z' },
  { id: '3', name: 'Grace Hopper', country: 'US', active: true, joined: '2026-03-03T00:00:00.000Z' },
]
const columns: Column<Row>[] = [
  { key: 'name', header: 'Name', accessor: (r) => r.name, filter: 'text', sortable: true },
  { key: 'country', header: 'Country', accessor: (r) => r.country, filter: 'select' },
  { key: 'active', header: 'Active', accessor: (r) => r.active, filter: 'boolean' },
  { key: 'joined', header: 'Joined', accessor: (r) => r.joined, filter: 'date' },
]
const renderTable = (extra = {}) =>
  render(<DataTable columns={columns} rows={rows} rowKey={(r: Row) => r.id} {...extra} />)

describe('DataTable', () => {
  it('renders all rows initially', () => {
    renderTable()
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument()
    expect(screen.getByText('Grace Hopper')).toBeInTheDocument()
  })

  it('text filter matches case-insensitive substring', () => {
    renderTable()
    fireEvent.change(screen.getByLabelText('Filter Name'), { target: { value: 'turing' } })
    expect(screen.getByText('Alan Turing')).toBeInTheDocument()
    expect(screen.queryByText('Ada Lovelace')).not.toBeInTheDocument()
  })

  it('select filter matches exact value and auto-derives options', () => {
    renderTable()
    const sel = screen.getByLabelText('Filter Country')
    expect(within(sel).getByRole('option', { name: 'US' })).toBeInTheDocument()
    fireEvent.change(sel, { target: { value: 'US' } })
    expect(screen.getByText('Grace Hopper')).toBeInTheDocument()
    expect(screen.queryByText('Ada Lovelace')).not.toBeInTheDocument()
  })

  it('boolean filter matches Yes/No', () => {
    renderTable()
    fireEvent.change(screen.getByLabelText('Filter Active'), { target: { value: 'false' } })
    expect(screen.getByText('Alan Turing')).toBeInTheDocument()
    expect(screen.queryByText('Ada Lovelace')).not.toBeInTheDocument()
  })

  it('date filter matches the chosen day', () => {
    renderTable()
    fireEvent.change(screen.getByLabelText('Filter Joined'), { target: { value: '2026-02-02' } })
    expect(screen.getByText('Alan Turing')).toBeInTheDocument()
    expect(screen.queryByText('Grace Hopper')).not.toBeInTheDocument()
  })

  it('sorts ascending then descending on header click', () => {
    renderTable()
    const header = screen.getByRole('button', { name: /Name/ })
    fireEvent.click(header)
    let cells = screen.getAllByTestId('cell-name').map((c) => c.textContent)
    expect(cells).toEqual(['Ada Lovelace', 'Alan Turing', 'Grace Hopper'])
    fireEvent.click(header)
    cells = screen.getAllByTestId('cell-name').map((c) => c.textContent)
    expect(cells).toEqual(['Grace Hopper', 'Alan Turing', 'Ada Lovelace'])
  })

  it('calls onRowClick', () => {
    const onRowClick = vi.fn()
    renderTable({ onRowClick })
    fireEvent.click(screen.getByText('Ada Lovelace'))
    expect(onRowClick).toHaveBeenCalledWith(rows[0])
  })

  it('shows empty state when no rows match', () => {
    renderTable({ emptyTitle: 'Nothing here' })
    fireEvent.change(screen.getByLabelText('Filter Name'), { target: { value: 'zzz' } })
    expect(screen.getByText('Nothing here')).toBeInTheDocument()
  })

  it('renders skeleton when loading and error state with retry', () => {
    const onRetry = vi.fn()
    const { rerender } = render(
      <DataTable columns={columns} rows={[]} rowKey={(r: Row) => r.id} loading />,
    )
    expect(document.querySelector('.animate-pulse')).toBeTruthy()
    rerender(<DataTable columns={columns} rows={[]} rowKey={(r: Row) => r.id} error="Boom" onRetry={onRetry} />)
    expect(screen.getByText('Boom')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/admin/table/DataTable.spec.tsx`
Expected: FAIL — cannot resolve `./DataTable` / `./types`.

- [ ] **Step 3: Write the types**

```ts
// src/components/admin/table/types.ts
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

export type ColumnFilter = 'text' | 'select' | 'date' | 'boolean' | false

export interface Column<T> {
  key: string
  header: string
  /** Value used for filtering and sorting. */
  accessor: (row: T) => string | number | boolean | null
  /** Optional rich cell; defaults to String(accessor). */
  render?: (row: T) => ReactNode
  filter?: ColumnFilter
  /** For 'select'; auto-derived from distinct accessor values when omitted. */
  filterOptions?: { label: string; value: string }[]
  align?: 'left' | 'center' | 'right'
  sortable?: boolean
}

export interface DataTableProps<T> {
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
  minWidthClass?: string
}
```

- [ ] **Step 4: Write the component**

```tsx
// src/components/admin/table/DataTable.tsx
import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, ChevronsUpDown, Inbox } from 'lucide-react'
import { Input, Select, SkeletonRows, EmptyState, ErrorState } from '@/components/ui'
import { cn } from '@/lib/cn'
import type { Column, DataTableProps } from './types'

const ALIGN: Record<string, string> = { left: 'text-left', center: 'text-center', right: 'text-right' }

function toDay(v: unknown): string {
  if (!v) return ''
  const d = new Date(String(v))
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10)
}

function matches<T>(col: Column<T>, row: T, value: string): boolean {
  if (!value) return true
  const raw = col.accessor(row)
  switch (col.filter) {
    case 'text':
      return String(raw ?? '').toLowerCase().includes(value.toLowerCase())
    case 'select':
      return String(raw ?? '') === value
    case 'boolean':
      return String(Boolean(raw)) === value
    case 'date':
      return toDay(raw) === value
    default:
      return true
  }
}

export function DataTable<T>({
  columns, rows, rowKey, onRowClick, loading, error, onRetry,
  emptyIcon = Inbox, emptyTitle = 'No results', emptyDescription = 'Try adjusting the filters.',
  minWidthClass = 'min-w-[640px]',
}: DataTableProps<T>) {
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(null)

  const visible = useMemo(() => {
    let out = rows.filter((row) =>
      columns.every((col) => (col.filter ? matches(col, row, filters[col.key] ?? '') : true)),
    )
    if (sort) {
      const col = columns.find((c) => c.key === sort.key)
      if (col) {
        out = [...out].sort((a, b) => {
          const av = col.accessor(a)
          const bv = col.accessor(b)
          let cmp: number
          if (typeof av === 'number' && typeof bv === 'number') cmp = av - bv
          else cmp = String(av ?? '').localeCompare(String(bv ?? ''))
          return sort.dir === 'asc' ? cmp : -cmp
        })
      }
    }
    return out
  }, [rows, columns, filters, sort])

  const setFilter = (key: string, value: string) => setFilters((f) => ({ ...f, [key]: value }))
  const toggleSort = (key: string) =>
    setSort((s) => (s?.key !== key ? { key, dir: 'asc' } : s.dir === 'asc' ? { key, dir: 'desc' } : null))

  const optionsFor = (col: Column<T>) =>
    col.filterOptions ??
    Array.from(new Set(rows.map((r) => String(col.accessor(r) ?? '')).filter(Boolean)))
      .sort()
      .map((v) => ({ label: v, value: v }))

  if (error) return <ErrorState description={error} onRetry={onRetry} />
  if (loading) return <SkeletonRows rows={5} />

  return (
    <div className="glass-panel overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className={cn('w-full', minWidthClass)}>
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-gray-500">
              {columns.map((col) => (
                <th key={col.key} className={cn('px-5 py-3 font-medium', ALIGN[col.align ?? 'left'])}>
                  {col.sortable ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(col.key)}
                      className="inline-flex items-center gap-1 hover:text-gray-300"
                    >
                      {col.header}
                      {sort?.key === col.key ? (
                        sort.dir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                      ) : (
                        <ChevronsUpDown className="h-3 w-3 opacity-40" />
                      )}
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              ))}
            </tr>
            <tr>
              {columns.map((col) => (
                <th key={col.key} className="px-3 py-2">
                  {col.filter === 'text' && (
                    <Input
                      aria-label={`Filter ${col.header}`}
                      value={filters[col.key] ?? ''}
                      onChange={(e) => setFilter(col.key, e.target.value)}
                      placeholder="Filter…"
                      className="h-8 text-xs"
                    />
                  )}
                  {col.filter === 'select' && (
                    <Select
                      aria-label={`Filter ${col.header}`}
                      value={filters[col.key] ?? ''}
                      options={[{ label: 'All', value: '' }, ...optionsFor(col)]}
                      onChange={(e) => setFilter(col.key, e.target.value)}
                    />
                  )}
                  {col.filter === 'boolean' && (
                    <Select
                      aria-label={`Filter ${col.header}`}
                      value={filters[col.key] ?? ''}
                      options={[{ label: 'All', value: '' }, { label: 'Yes', value: 'true' }, { label: 'No', value: 'false' }]}
                      onChange={(e) => setFilter(col.key, e.target.value)}
                    />
                  )}
                  {col.filter === 'date' && (
                    <Input
                      type="date"
                      aria-label={`Filter ${col.header}`}
                      value={filters[col.key] ?? ''}
                      onChange={(e) => setFilter(col.key, e.target.value)}
                      className="h-8 text-xs"
                    />
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04] text-sm">
            {visible.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn('transition-colors', onRowClick && 'cursor-pointer hover:bg-white/[0.02]')}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    data-testid={`cell-${col.key}`}
                    className={cn('px-5 py-3.5 text-gray-300', ALIGN[col.align ?? 'left'])}
                  >
                    {col.render ? col.render(row) : String(col.accessor(row) ?? '—')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {visible.length === 0 && (
        <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription} />
      )}
    </div>
  )
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/components/admin/table/DataTable.spec.tsx`
Expected: PASS (8 tests). If `Select`/`Input` forward `aria-label` differently, check `src/components/ui/Select.tsx` and `Input.tsx` and adjust the `aria-label` wiring (they spread `...props` — confirm).

- [ ] **Step 6: Commit**

```bash
git add src/components/admin/table/
git commit -m "feat(admin): reusable DataTable with per-column filters and sort"
```

---

### Task 2: `DocumentViewerModal`

**Files:**
- Create: `src/components/admin/table/DocumentViewerModal.tsx`
- Test: `src/components/admin/table/DocumentViewerModal.spec.tsx`

**Interfaces:**
- Consumes: `@/components/ui` (`Modal`, `Button`).
- Produces: `interface DocumentViewerModalProps { open: boolean; onClose: () => void; url: string | null; fileName?: string; mimeType?: string }` and `function DocumentViewerModal(props): JSX.Element`.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/admin/table/DocumentViewerModal.spec.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DocumentViewerModal } from './DocumentViewerModal'

describe('DocumentViewerModal', () => {
  it('renders an image for image urls', () => {
    render(<DocumentViewerModal open onClose={vi.fn()} url="/api/kyc/document/1" fileName="passport.png" />)
    expect(screen.getByRole('img', { name: 'passport.png' })).toBeInTheDocument()
  })

  it('renders an embed for pdf urls and shows download + open links', () => {
    render(<DocumentViewerModal open onClose={vi.fn()} url="/api/kyc/document/2" fileName="proof.pdf" />)
    expect(document.querySelector('embed')).toBeTruthy()
    expect(screen.getByRole('link', { name: /download/i })).toHaveAttribute('href', '/api/kyc/document/2')
    expect(screen.getByRole('link', { name: /open in new tab/i })).toBeInTheDocument()
  })

  it('renders nothing when closed', () => {
    render(<DocumentViewerModal open={false} onClose={vi.fn()} url="/api/kyc/document/3" fileName="x.png" />)
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/admin/table/DocumentViewerModal.spec.tsx`
Expected: FAIL — cannot resolve `./DocumentViewerModal`.

- [ ] **Step 3: Write the component**

```tsx
// src/components/admin/table/DocumentViewerModal.tsx
import { Download, ExternalLink } from 'lucide-react'
import { Modal, Button } from '@/components/ui'

export interface DocumentViewerModalProps {
  open: boolean
  onClose: () => void
  url: string | null
  fileName?: string
  mimeType?: string
}

const IMAGE_RE = /\.(png|jpe?g|gif|webp|bmp|svg)$/i
const PDF_RE = /\.pdf$/i

export function DocumentViewerModal({ open, onClose, url, fileName, mimeType }: DocumentViewerModalProps) {
  const name = fileName ?? 'Document'
  const isImage = mimeType?.startsWith('image/') || (fileName ? IMAGE_RE.test(fileName) : false)
  const isPdf = mimeType === 'application/pdf' || (fileName ? PDF_RE.test(fileName) : false)

  return (
    <Modal open={open && !!url} onClose={onClose} title={name} className="max-w-3xl">
      {url && (
        <div className="space-y-4">
          <div className="flex max-h-[70vh] items-center justify-center overflow-auto rounded-lg border border-white/[0.06] bg-ink-900/60 p-2">
            {isImage ? (
              <img src={url} alt={name} className="max-h-[66vh] max-w-full object-contain" />
            ) : isPdf ? (
              <embed src={url} type="application/pdf" className="h-[66vh] w-full" />
            ) : (
              <p className="p-8 text-sm text-gray-400">Preview not available for this file type.</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <a href={url} download={fileName} className="inline-flex">
              <Button variant="outline" size="sm" className="gap-1">
                <Download className="h-3.5 w-3.5" /> Download
              </Button>
            </a>
            <a href={url} target="_blank" rel="noreferrer" className="inline-flex">
              <Button variant="outline" size="sm" className="gap-1">
                <ExternalLink className="h-3.5 w-3.5" /> Open in new tab
              </Button>
            </a>
          </div>
        </div>
      )}
    </Modal>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/admin/table/DocumentViewerModal.spec.tsx`
Expected: PASS (3 tests). If `Button` does not accept being wrapped in `<a>`, confirm in `src/components/ui/Button.tsx`; the wrapper `<a>` provides the role `link`.

- [ ] **Step 5: Add a barrel export**

```ts
// src/components/admin/table/index.ts
export { DataTable } from './DataTable'
export { DocumentViewerModal } from './DocumentViewerModal'
export type { Column, ColumnFilter, DataTableProps } from './types'
export type { DocumentViewerModalProps } from './DocumentViewerModal'
```

- [ ] **Step 6: Commit**

```bash
git add src/components/admin/table/
git commit -m "feat(admin): in-app DocumentViewerModal for image/PDF files"
```

---

### Task 3: Convert Clients page (proof of pattern)

**Files:**
- Modify: `src/pages/admin/AdminClientsPage.tsx` (replace the hand-rolled `<table>` block, lines ~70-118)
- Test: `src/pages/admin/AdminClientsPage.spec.tsx` (keep green)

**Interfaces:**
- Consumes: `DataTable`, `Column` from `@/components/admin/table`; existing `adminApi.listClients`, `ClientListItem`, `kycSummary`.
- Produces: nothing new (page-level change).

- [ ] **Step 1: Replace the table render with `DataTable`**

In `AdminClientsPage.tsx`, remove the `error/loading/empty/<table>` block (the `{error ? ... : loading ? ... : clients.length === 0 ? ... : (<div className="glass-panel ...">...</div>)}`) and replace with a `columns` definition + `DataTable`. Keep the search `Input` and the `ClientDetailModal` exactly as-is.

```tsx
// add imports
import { DataTable, type Column } from '@/components/admin/table'

// inside component, before return:
const columns: Column<ClientListItem>[] = [
  {
    key: 'name', header: 'Client', filter: 'text', sortable: true,
    accessor: (c) => `${c.firstName} ${c.lastName}`,
    render: (c) => (
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-500/15 text-xs font-semibold text-brand-300 ring-1 ring-brand-500/30">
          {initials(`${c.firstName} ${c.lastName}`)}
        </span>
        <div>
          <div className="font-medium text-white">{c.firstName} {c.lastName}</div>
          <div className="text-xs text-gray-500">{c.email}</div>
        </div>
      </div>
    ),
  },
  { key: 'email', header: 'Email', filter: 'text', accessor: (c) => c.email },
  { key: 'country', header: 'Country', filter: 'select', accessor: (c) => c.country ?? '', render: (c) => c.country ?? '—' },
  { key: 'accounts', header: 'Accounts', align: 'center', accessor: (c) => c._count.tradingAccounts },
  {
    key: 'kyc', header: 'KYC', filter: 'select', accessor: (c) => kycSummary(c.kycProfile).label,
    render: (c) => { const k = kycSummary(c.kycProfile); return <Badge tone={k.tone} dot>{k.label}</Badge> },
  },
  { key: 'joined', header: 'Joined', filter: 'date', sortable: true, accessor: (c) => c.createdAt, render: (c) => formatDate(c.createdAt) },
]

// replace the old table block with:
<DataTable
  columns={columns}
  rows={clients}
  rowKey={(c) => c.id}
  onRowClick={(c) => openClient(c.id)}
  loading={loading}
  error={error}
  onRetry={() => load(search || undefined)}
  emptyIcon={Users}
  emptyTitle="No clients found"
  emptyDescription="Try a different search."
  minWidthClass="min-w-[640px]"
/>
```

- [ ] **Step 2: Run the page spec**

Run: `npx vitest run src/pages/admin/AdminClientsPage.spec.tsx`
Expected: PASS — the existing test asserts `Ada Lovelace` and `ada@x.com` render, which the new grid still shows.

- [ ] **Step 3: Typecheck**

Run: `npm run build`
Expected: builds with no TS errors. (Fix unused imports left from the removed table, e.g. `Search` stays for the search box; remove nothing still used.)

- [ ] **Step 4: Commit**

```bash
git add src/pages/admin/AdminClientsPage.tsx
git commit -m "feat(admin): clients page uses filterable DataTable"
```

---

### Task 4: Convert Leads page

**Files:**
- Modify: `src/pages/admin/AdminLeadsPage.tsx` (replace `<table>` block, lines ~78-122; keep the status pill bar and `LeadDetailModal`)
- Test: `src/pages/admin/AdminLeadsPage.spec.tsx` (keep green)

**Interfaces:**
- Consumes: `DataTable`, `Column`; existing `Lead`, `leadSourceLabel`, `leadStatusLabel`, `leadStatusTone`.

- [ ] **Step 1: Replace the table render with `DataTable`**

```tsx
import { DataTable, type Column } from '@/components/admin/table'

const columns: Column<Lead>[] = [
  {
    key: 'name', header: 'Lead', filter: 'text', sortable: true, accessor: (l) => l.name,
    render: (l) => (
      <div><div className="font-medium text-white">{l.name}</div><div className="text-xs text-gray-500">{l.email}</div></div>
    ),
  },
  { key: 'email', header: 'Email', filter: 'text', accessor: (l) => l.email },
  { key: 'source', header: 'Source', filter: 'select', accessor: (l) => leadSourceLabel[l.source] },
  {
    key: 'assigned', header: 'Assigned', filter: 'select',
    accessor: (l) => (l.assignedTo ? `${l.assignedTo.firstName} ${l.assignedTo.lastName}` : 'Unassigned'),
    render: (l) => l.assignedTo ? `${l.assignedTo.firstName} ${l.assignedTo.lastName}` : <span className="text-gray-600">Unassigned</span>,
  },
  {
    key: 'status', header: 'Status', filter: 'select', accessor: (l) => leadStatusLabel[l.status],
    render: (l) => <Badge tone={leadStatusTone[l.status]} dot>{leadStatusLabel[l.status]}</Badge>,
  },
  { key: 'created', header: 'Created', filter: 'date', sortable: true, accessor: (l) => l.createdAt, render: (l) => formatDate(l.createdAt) },
]

// replace old block:
<DataTable
  columns={columns}
  rows={leads}
  rowKey={(l) => l.id}
  onRowClick={async (l) => { try { setActive(await adminApi.getLead(l.id)) } catch (e) { toast.error('Could not open lead', (e as Error).message) } }}
  loading={loading}
  error={error}
  onRetry={() => load(filter)}
  emptyIcon={UserPlus}
  emptyTitle="No leads"
  emptyDescription="No leads in this status."
  minWidthClass="min-w-[680px]"
/>
```

- [ ] **Step 2: Run the page spec**

Run: `npx vitest run src/pages/admin/AdminLeadsPage.spec.tsx`
Expected: PASS. If the spec asserts old markup that changed, update its selectors to query rendered text (e.g. `screen.getByText(<lead name>)`).

- [ ] **Step 3: Typecheck**

Run: `npm run build`
Expected: no TS errors.

- [ ] **Step 4: Commit**

```bash
git add src/pages/admin/AdminLeadsPage.tsx src/pages/admin/AdminLeadsPage.spec.tsx
git commit -m "feat(admin): leads page uses filterable DataTable"
```

---

### Task 5: Convert Partners page

**Files:**
- Modify: `src/pages/admin/AdminPartnersPage.tsx` (replace `<table>` block, lines ~39-67; keep the "commission later phase" notice)
- Test: `src/pages/admin/AdminPartnersPage.spec.tsx` (keep green)

**Interfaces:**
- Consumes: `DataTable`, `Column`; existing `PartnerItem`, `formatDate`, `Badge`.

- [ ] **Step 1: Replace the table render with `DataTable`**

```tsx
import { DataTable, type Column } from '@/components/admin/table'

const columns: Column<PartnerItem>[] = [
  {
    key: 'name', header: 'Partner', filter: 'text', sortable: true, accessor: (p) => `${p.firstName} ${p.lastName}`,
    render: (p) => (<div><div className="text-white">{p.firstName} {p.lastName}</div><div className="text-xs text-gray-500">{p.email}</div></div>),
  },
  { key: 'email', header: 'Email', filter: 'text', accessor: (p) => p.email },
  { key: 'country', header: 'Country', filter: 'select', accessor: (p) => p.country ?? '', render: (p) => p.country ?? '—' },
  {
    key: 'status', header: 'Status', filter: 'select', accessor: (p) => p.status,
    render: (p) => <Badge tone={p.status === 'ACTIVE' ? 'success' : 'neutral'} dot>{p.status}</Badge>,
  },
  { key: 'joined', header: 'Joined', filter: 'date', sortable: true, accessor: (p) => p.createdAt, render: (p) => formatDate(p.createdAt) },
]

// the page currently uses `partners: PartnerItem[] | null`. Pass rows={partners ?? []}
// and loading={!partners && !error}.
<DataTable
  columns={columns}
  rows={partners ?? []}
  rowKey={(p) => p.id}
  loading={!partners && !error}
  error={error ? 'Could not load partners' : null}
  emptyIcon={Handshake}
  emptyTitle="No partners yet"
  emptyDescription="Partner accounts will appear here."
  minWidthClass="min-w-[560px]"
/>
```

- [ ] **Step 2: Run the page spec**

Run: `npx vitest run src/pages/admin/AdminPartnersPage.spec.tsx`
Expected: PASS. Update selectors if they assert removed markup.

- [ ] **Step 3: Typecheck**

Run: `npm run build`
Expected: no TS errors.

- [ ] **Step 4: Commit**

```bash
git add src/pages/admin/AdminPartnersPage.tsx src/pages/admin/AdminPartnersPage.spec.tsx
git commit -m "feat(admin): partners page uses filterable DataTable"
```

---

### Task 6: Convert Staff "Team" table

**Files:**
- Modify: `src/pages/admin/AdminStaffPage.tsx` (replace the Team `<table>`, lines ~58-92; keep the Audit Log section unchanged)
- Test: `src/pages/admin/AdminStaffPage.spec.tsx` (keep green)

**Interfaces:**
- Consumes: `DataTable`, `Column`; existing `TeamMember`, `StaffRole`, `changeRole`, `Badge`.

- [ ] **Step 1: Replace the Team table render with `DataTable`**

The Role cell stays interactive (a `<select>` calling `changeRole`); render it via `column.render`. Stop row clicks from interfering — there is no `onRowClick` here.

```tsx
import { DataTable, type Column } from '@/components/admin/table'

const teamColumns: Column<TeamMember>[] = [
  {
    key: 'member', header: 'Member', filter: 'text', sortable: true, accessor: (m) => `${m.firstName} ${m.lastName}`,
    render: (m) => (<div><div className="text-white">{m.firstName} {m.lastName}</div><div className="text-xs text-gray-500">{m.email}</div></div>),
  },
  { key: 'email', header: 'Email', filter: 'text', accessor: (m) => m.email },
  {
    key: 'role', header: 'Role', filter: 'select', accessor: (m) => m.role,
    render: (m) => (
      <select
        value={m.role}
        aria-label={`Role for ${m.email}`}
        onChange={(e) => changeRole(m, e.target.value as StaffRole)}
        className="rounded-md border border-white/10 bg-ink-800 px-2 py-1 text-sm text-gray-200"
      >
        <option value="ADMIN">Admin</option>
        <option value="AGENT">Agent</option>
      </select>
    ),
  },
  {
    key: 'status', header: 'Status', filter: 'select', accessor: (m) => m.status,
    render: (m) => <Badge tone={m.status === 'ACTIVE' ? 'success' : 'neutral'} dot>{m.status}</Badge>,
  },
]

// inside the Team <section>, replace the glass-panel/table with:
<DataTable columns={teamColumns} rows={team} rowKey={(m) => m.id} loading={loading} error={error} onRetry={load} minWidthClass="min-w-[560px]" />
```

Note: the page wraps Team + Audit in one `loading`/`error` guard today. Keep the outer guard for the Audit section; pass `loading`/`error` to `DataTable` too (it will no-op once data is present).

- [ ] **Step 2: Run the page spec**

Run: `npx vitest run src/pages/admin/AdminStaffPage.spec.tsx`
Expected: PASS. Update selectors if needed.

- [ ] **Step 3: Typecheck**

Run: `npm run build`
Expected: no TS errors.

- [ ] **Step 4: Commit**

```bash
git add src/pages/admin/AdminStaffPage.tsx src/pages/admin/AdminStaffPage.spec.tsx
git commit -m "feat(admin): staff team table uses filterable DataTable"
```

---

### Task 7: Convert KYC page to a documents grid with in-app viewer

**Files:**
- Modify: `src/pages/admin/AdminKycPage.tsx` (replace the per-client card list with a flat documents `DataTable` + `DocumentViewerModal`)
- Test: `src/pages/admin/AdminKycPage.spec.tsx` (keep green)

**Interfaces:**
- Consumes: `DataTable`, `Column`, `DocumentViewerModal` from `@/components/admin/table`; existing `adminApi.listClients`, `adminApi.listKycDocuments`, `adminApi.kycDocumentUrl`, `adminApi.reviewKyc`, `KycDocument`, `ClientListItem`, `kycLabel`, `kycTone`.

- [ ] **Step 1: Flatten clients+docs into rows**

Build a `DocRow` view-model from the already-loaded `clients` + `docs` map (no new API). Place near the top of the component body.

```tsx
import { DataTable, DocumentViewerModal, type Column } from '@/components/admin/table'

interface DocRow {
  clientId: string
  clientName: string
  email: string
  step: StepKey
  stepLabel: string
  status: KycStepStatus
  doc?: KycDocument
}

// after `const pending = clients.filter(isPendingClient)`:
const docRows: DocRow[] = pending.flatMap((c) =>
  STEPS.map((s) => ({
    clientId: c.id,
    clientName: `${c.firstName} ${c.lastName}`,
    email: c.email,
    step: s.key,
    stepLabel: s.label,
    status: (c.kycProfile?.[s.field] ?? 'NOT_SUBMITTED') as KycStepStatus,
    doc: docs[c.id]?.find((d) => d.step === s.key),
  })),
)

const [viewer, setViewer] = useState<{ url: string; name: string } | null>(null)
```

- [ ] **Step 2: Render the grid + viewer**

```tsx
const columns: Column<DocRow>[] = [
  { key: 'client', header: 'Client', filter: 'text', sortable: true, accessor: (r) => r.clientName,
    render: (r) => (<div><div className="font-medium text-white">{r.clientName}</div><div className="text-xs text-gray-500">{r.email}</div></div>) },
  { key: 'email', header: 'Email', filter: 'text', accessor: (r) => r.email },
  { key: 'step', header: 'Document', filter: 'select', accessor: (r) => r.stepLabel },
  { key: 'status', header: 'Status', filter: 'select', accessor: (r) => kycLabel[r.status],
    render: (r) => <Badge tone={kycTone[r.status]} dot>{kycLabel[r.status]}</Badge> },
  {
    key: 'actions', header: 'Actions', accessor: () => '',
    render: (r) => (
      <div className="flex items-center gap-2">
        {r.doc && (
          <Button size="sm" variant="outline" className="gap-1"
            onClick={() => setViewer({ url: adminApi.kycDocumentUrl(r.doc!.id), name: r.doc!.fileName })}>
            <FileText className="h-3.5 w-3.5" /> View document
          </Button>
        )}
        {r.status === 'PENDING' && (
          <>
            <Button size="sm" variant="outline" loading={busy === `${r.clientId}:${r.step}`}
              onClick={() => review(r.clientId, r.step, 'APPROVED')}
              className="gap-1 border-success/40 text-success hover:bg-success/10"><Check className="h-3.5 w-3.5" /> Approve</Button>
            <Button size="sm" variant="outline" onClick={() => review(r.clientId, r.step, 'REJECTED')}
              className="gap-1 border-danger/40 text-danger hover:bg-danger/10"><X className="h-3.5 w-3.5" /> Reject</Button>
          </>
        )}
      </div>
    ),
  },
]

return (
  <>
    <PageTitle title="KYC Review" subtitle="Approve or reject submitted client documents." />
    <DataTable
      columns={columns}
      rows={docRows}
      rowKey={(r) => `${r.clientId}:${r.step}`}
      loading={loading}
      error={error}
      onRetry={load}
      emptyIcon={ShieldCheck}
      emptyTitle="Nothing to review"
      emptyDescription="No clients have documents pending review."
      minWidthClass="min-w-[720px]"
    />
    <DocumentViewerModal
      open={!!viewer}
      onClose={() => setViewer(null)}
      url={viewer?.url ?? null}
      fileName={viewer?.name}
    />
  </>
)
```

Remove the old card-list JSX and the now-unused `initials` import if it is no longer referenced.

- [ ] **Step 3: Run the page spec**

Run: `npx vitest run src/pages/admin/AdminKycPage.spec.tsx`
Expected: PASS. Update selectors to match the grid (query by client name / "View document").

- [ ] **Step 4: Typecheck**

Run: `npm run build`
Expected: no TS errors.

- [ ] **Step 5: Commit**

```bash
git add src/pages/admin/AdminKycPage.tsx src/pages/admin/AdminKycPage.spec.tsx
git commit -m "feat(admin): KYC review grid with in-app document viewer"
```

---

### Task 8: Convert Finance "Recent Deposits" to a filterable grid

**Files:**
- Modify: `src/pages/admin/AdminFinancePage.tsx` (replace ONLY the "Recent Deposits" `section`, lines ~176-192; leave the Pending Withdrawals and Deposit Requests action queues untouched)
- Test: `src/pages/admin/AdminFinancePage.spec.tsx` (keep green)

**Interfaces:**
- Consumes: `DataTable`, `Column`; existing `FinanceTxn`, `formatCurrency`, `formatDateTime`.

- [ ] **Step 1: Replace the Recent Deposits section body with `DataTable`**

```tsx
import { DataTable, type Column } from '@/components/admin/table'

const depositColumns: Column<FinanceTxn>[] = [
  { key: 'client', header: 'Client', filter: 'text', sortable: true, accessor: (d) => d.client?.name ?? 'Unknown' },
  { key: 'email', header: 'Email', filter: 'text', accessor: (d) => d.client?.email ?? '' , render: (d) => d.client?.email ?? '—' },
  { key: 'account', header: 'Account', filter: 'text', accessor: (d) => d.accountNumber ?? '', render: (d) => d.accountNumber ?? '—' },
  { key: 'amount', header: 'Amount', align: 'right', sortable: true, accessor: (d) => Number(d.amount), render: (d) => formatCurrency(Number(d.amount)) },
  { key: 'date', header: 'Date', filter: 'date', sortable: true, accessor: (d) => d.createdAt, render: (d) => formatDateTime(d.createdAt) },
]

// inside the Recent Deposits <section>, replace the EmptyState/glass-panel block with:
{deposits.length === 0 ? (
  <EmptyState icon={ArrowDownToLine} title="No deposits yet" description="Completed deposits will appear here." />
) : (
  <DataTable columns={depositColumns} rows={deposits} rowKey={(d) => d.id} minWidthClass="min-w-[640px]" />
)}
```

Note: `FinanceTxn.client` may be optional and may lack `email` — if `email` is not on the type, drop the `email` column. Confirm against `src/lib/financeApi.ts` `FinanceTxn`.

- [ ] **Step 2: Run the page spec**

Run: `npx vitest run src/pages/admin/AdminFinancePage.spec.tsx`
Expected: PASS. Update selectors if they asserted the old deposit rows.

- [ ] **Step 3: Typecheck + full test sweep**

Run: `npm run build && npm test`
Expected: build clean; all Vitest suites pass.

- [ ] **Step 4: Commit**

```bash
git add src/pages/admin/AdminFinancePage.tsx src/pages/admin/AdminFinancePage.spec.tsx
git commit -m "feat(admin): finance recent deposits use filterable DataTable"
```

---

## Self-Review Notes

- **Spec coverage:** DataTable (Task 1), DocumentViewerModal (Task 2), all six admin tables — Clients (3), Leads (4), Partners (5), Staff (6), KYC/Documents (7), Finance Recent Deposits (8). Per-column typed filters and the "View document" action are covered. Finance approval queues intentionally left as action cards per spec.
- **Client-side filtering, no backend change:** honored throughout.
- **Open risk flagged in tasks:** exact prop names on `FinanceTxn` (Task 8) and whether `Input`/`Select`/`Button` forward `aria-label`/wrapping (Tasks 1-2) must be confirmed against the real files during implementation; tasks call this out rather than assuming.
