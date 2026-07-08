import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

vi.mock('@/lib/adminApi', () => ({
  adminApi: {
    listIbCampaigns: vi.fn().mockResolvedValue([
      { id: 'c1', name: 'Ramadan Promo', code: 'IB-RAMADAN', description: 'x', enabled: true, sortOrder: 0, createdAt: '', updatedAt: '' },
      { id: 'c2', name: 'YouTube Partners', code: 'IB-YT', description: null, enabled: false, sortOrder: 1, createdAt: '', updatedAt: '' },
    ]),
    createIbCampaign: vi.fn(), updateIbCampaign: vi.fn(), deleteIbCampaign: vi.fn(),
  },
}))
vi.mock('@/context/ToastContext', () => ({ useToast: () => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }) }))

import AdminIbCampaignsPage from './AdminIbCampaignsPage'

describe('AdminIbCampaignsPage', () => {
  it('lists IB campaigns with code + enabled state', async () => {
    render(<AdminIbCampaignsPage />)
    await waitFor(() => expect(screen.getByText('Ramadan Promo')).toBeInTheDocument())
    expect(screen.getByText('IB-YT')).toBeInTheDocument()
    expect(screen.getByText('Enabled')).toBeInTheDocument()
    expect(screen.getByText('Disabled')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /New campaign/ })).toBeInTheDocument()
  })
})
