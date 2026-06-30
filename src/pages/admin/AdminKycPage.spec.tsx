import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

// NOTE: vi.mock is hoisted — keep all data inside the factory (no outer refs).
vi.mock('@/lib/adminApi', () => ({
  adminApi: {
    listClients: vi.fn().mockResolvedValue([
      {
        id: 'c1',
        email: 'ada@x.com',
        firstName: 'Ada',
        lastName: 'Lovelace',
        country: 'GB',
        status: 'ACTIVE',
        createdAt: '2026-01-01T00:00:00.000Z',
        _count: { tradingAccounts: 1 },
        kycProfile: { identityStatus: 'PENDING', addressStatus: 'APPROVED', selfieStatus: 'NOT_SUBMITTED' },
      },
    ]),
    listKycDocuments: vi.fn().mockResolvedValue([
      { id: 'd1', step: 'identity', fileName: 'passport.pdf', mimeType: 'application/pdf', createdAt: '2026-01-02' },
    ]),
    kycDocumentUrl: (id: string) => `http://localhost:4000/api/kyc/document/${id}`,
    reviewKyc: vi.fn().mockResolvedValue({}),
  },
}))
vi.mock('@/context/ToastContext', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }),
}))

import AdminKycPage from './AdminKycPage'
import { adminApi } from '@/lib/adminApi'

describe('AdminKycPage', () => {
  it('lists clients with a pending KYC step and fetches their documents', async () => {
    render(<AdminKycPage />)
    // The grid renders one row per step (3 steps × 1 client = 3 rows), so
    // client name and email each appear multiple times — use getAllByText.
    await waitFor(() => expect(screen.getAllByText('Ada Lovelace').length).toBeGreaterThan(0))
    expect(screen.getAllByText('ada@x.com').length).toBeGreaterThan(0)
    expect(adminApi.listKycDocuments).toHaveBeenCalledWith('c1')
    // The fetched document surfaces a "View document" button for staff review.
    expect(await screen.findByText('View document')).toBeInTheDocument()
  })
})
