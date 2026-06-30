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
    expect(document.querySelectorAll('.rounded-lg.bg-ink-400\\/60')).toHaveLength(5)
    rerender(<DataTable columns={columns} rows={[]} rowKey={(r: Row) => r.id} error="Boom" onRetry={onRetry} />)
    expect(screen.getByText('Boom')).toBeInTheDocument()
  })
})
