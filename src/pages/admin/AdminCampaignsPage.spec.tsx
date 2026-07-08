import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

vi.mock('@/lib/adminApi', () => ({
  adminApi: {
    listCampaigns: vi.fn().mockResolvedValue([
      { id: 'c1', name: 'Welcome series', channel: 'EMAIL', audience: 'New clients', subject: 'Welcome', message: 'Hi', status: 'SENT', scheduledAt: null, createdAt: '2026-07-01T00:00:00.000Z', updatedAt: '' },
      { id: 'c2', name: 'Q3 promotion', channel: 'EMAIL', audience: 'All clients', subject: 'Promo', message: 'Deal', status: 'DRAFT', scheduledAt: null, createdAt: '2026-07-02T00:00:00.000Z', updatedAt: '' },
    ]),
    createCampaign: vi.fn(), updateCampaign: vi.fn(), deleteCampaign: vi.fn(),
  },
}))
vi.mock('@/context/ToastContext', () => ({ useToast: () => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }) }))

import AdminCampaignsPage from './AdminCampaignsPage'

describe('AdminCampaignsPage', () => {
  it('lists campaigns with status and a new-campaign action', async () => {
    render(<AdminCampaignsPage />)
    await waitFor(() => expect(screen.getByText('Welcome series')).toBeInTheDocument())
    expect(screen.getByText('Q3 promotion')).toBeInTheDocument()
    expect(screen.getByText('SENT')).toBeInTheDocument()
    expect(screen.getByText('DRAFT')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /New campaign/ })).toBeInTheDocument()
  })
})
