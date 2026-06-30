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
