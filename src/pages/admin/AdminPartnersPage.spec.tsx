import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

vi.mock('@/lib/adminApi', () => ({
  adminApi: {
    listPartners: vi.fn().mockResolvedValue([
      { id: 'p1', firstName: 'Ivan', lastName: 'Broker', email: 'ivan@ib.com', country: 'AE', status: 'ACTIVE', createdAt: '2026-01-01' },
    ]),
  },
}))

import AdminPartnersPage from './AdminPartnersPage'

describe('AdminPartnersPage', () => {
  it('renders the read-only partner list', async () => {
    render(<AdminPartnersPage />)
    await waitFor(() => expect(screen.getByText('Ivan Broker')).toBeInTheDocument())
    expect(screen.getByText('ivan@ib.com')).toBeInTheDocument()
    expect(screen.getByText(/coming in a later phase/i)).toBeInTheDocument()
  })
})
