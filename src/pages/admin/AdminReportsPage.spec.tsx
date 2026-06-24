import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

vi.mock('@/lib/adminApi', () => ({
  adminApi: {
    getReports: vi.fn().mockResolvedValue({
      deposits: '1000.00',
      withdrawals: '300.00',
      netFlow: '700.00',
      totalClients: 7,
      funnel: { NEW: 4, CONTACTED: 1, QUALIFIED: 0, CONVERTED: 2, LOST: 1 },
    }),
  },
}))

import AdminReportsPage from './AdminReportsPage'

describe('AdminReportsPage', () => {
  it('renders financial KPIs and the lead funnel', async () => {
    render(<AdminReportsPage />)
    await waitFor(() => expect(screen.getByText('Deposits')).toBeInTheDocument())
    expect(screen.getByText('Net Flow')).toBeInTheDocument()
    expect(screen.getByText('CONVERTED')).toBeInTheDocument()
  })
})
