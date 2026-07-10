import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { ToastProvider } from '@/context/ToastContext'

vi.mock('@/lib/adminApi', () => ({
  adminApi: {
    listPartners: vi.fn().mockResolvedValue([
      { id: 'p1', firstName: 'Ivan', lastName: 'Broker', email: 'ivan@ib.com', country: 'AE', status: 'ACTIVE', createdAt: '2026-01-01', referredCount: 0, commissionTotal: 0 },
    ]),
    listPartnerPayouts: vi.fn().mockResolvedValue([]),
  },
}))

import AdminPartnersPage from './AdminPartnersPage'

describe('AdminPartnersPage', () => {
  it('renders the partners / IB list with commissions', async () => {
    render(<ToastProvider><AdminPartnersPage /></ToastProvider>)
    await waitFor(() => expect(screen.getByText('Ivan Broker')).toBeInTheDocument())
    expect(screen.getAllByText('ivan@ib.com').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText(/introducing brokers/i)).toBeInTheDocument()
  })
})
