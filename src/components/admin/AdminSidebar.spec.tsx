import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ logout: vi.fn(), user: { name: 'Staff' } }),
}))

import { AdminSidebarContent } from './AdminSidebar'

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AdminSidebarContent />
    </MemoryRouter>,
  )
}

describe('AdminSidebarContent', () => {
  beforeEach(() => localStorage.clear())

  it('renders group headers and the top-level Support link', () => {
    renderAt('/admin/dashboard')
    expect(screen.getByRole('button', { name: /User Management/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Support/ })).toBeInTheDocument()
  })

  it('auto-expands the group containing the active route', () => {
    renderAt('/admin/clients')
    expect(screen.getByRole('link', { name: /Clients/ })).toBeInTheDocument()
  })

  it('toggles a group open and closed on header click', () => {
    renderAt('/admin/dashboard')
    expect(screen.queryByRole('link', { name: /Transactions/ })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Finance/ }))
    expect(screen.getByRole('link', { name: /Transactions/ })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Finance/ }))
    expect(screen.queryByRole('link', { name: /Transactions/ })).not.toBeInTheDocument()
  })

  it('shows a "soon" badge on placeholder links', () => {
    renderAt('/admin/dashboard')
    fireEvent.click(screen.getByRole('button', { name: /User Management/ }))
    expect(screen.getByRole('link', { name: /Blocked Users/ })).toHaveTextContent(/soon/i)
  })
})
