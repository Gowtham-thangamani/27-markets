import { it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '@/context/ToastContext'
import PartnerClientsPage from './PartnerClientsPage'

// getClients is paginated server-side: it returns { rows, total }, not an array.
vi.mock('@/lib/partnerApi', () => ({
  partnerApi: {
    getClients: vi.fn().mockResolvedValue({
      rows: [
        {
          id: 'c1',
          name: 'Ada Lovelace',
          email: 'ada@x.io',
          country: 'UK',
          kyc: 'APPROVED',
          createdAt: '2026-03-05T10:00:00Z',
          phone: '+44 20 7946 0000',
          campaign: null,
          accounts: [],
          canTrade: true,
          conversionStatus: 'CONVERTED',
          convertedAt: '2026-03-06T10:00:00Z',
          salesAgent: null,
          totalDeposits: 2500,
          lastLoginAt: null,
        },
      ],
      total: 1,
      page: 1,
      pageSize: 25,
    }),
    setConversionStatus: vi.fn().mockResolvedValue(undefined),
  },
}))

// The page raises a toast when a conversion-status update fails, so it needs
// the provider even on the happy path.
it('lists referred clients with their KYC status', async () => {
  render(
    <MemoryRouter>
      <ToastProvider>
        <PartnerClientsPage />
      </ToastProvider>
    </MemoryRouter>,
  )
  expect(await screen.findByText('ada@x.io')).toBeInTheDocument()
  expect(screen.getByText('Ada Lovelace')).toBeInTheDocument()
  expect(screen.getByText('APPROVED')).toBeInTheDocument()
})
