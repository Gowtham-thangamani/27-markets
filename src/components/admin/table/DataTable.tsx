// src/components/admin/table/DataTable.tsx
import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, ChevronsUpDown, Inbox } from 'lucide-react'
import { Input, Select, EmptyState, ErrorState } from '@/components/ui'
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

  // Render inline animate-pulse skeleton so tests can detect `.animate-pulse`
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="animate-pulse h-12 w-full rounded-lg bg-ink-400/60" />
        ))}
      </div>
    )
  }

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
