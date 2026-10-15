import { it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '@/context/ToastContext'
import PartnerDashboardPage from './PartnerDashboardPage'
import { partnerApi } from '@/lib/partnerApi'

vi.mock('@/lib/partnerApi', () => ({
  partnerApi: { getDashboard: vi.fn(), getCommissions: vi.fn(), requestPayout: vi.fn() },
}))

const payload = {
  referralCode: 'DEMO27IB',
  kpis: {
    totalReferred: { value: 18, delta: 12, spark: [1, 2, 3] },
    kycVerified: { value: 7, spark: [0, 1, 2] },
    signups30d: { value: 5, delta: -10, spark: [1, 0, 2] },
  },
  series: Array.from({ length: 90 }, (_, i) => ({ date: `2026-01-${(i % 28) + 1}`, signups: i % 3 })),
  kycDistribution: { NOT_SUBMITTED: 4, PENDING: 3, APPROVED: 7, REJECTED: 4 },
  recentReferrals: [
    { id: 'c1', name: 'Ada Lovelace', email: 'ada@x.io', country: 'UK', kyc: 'APPROVED', createdAt: '2026-03-05T10:00:00Z' },
  ],
}

// Two-tier commissions: `direct` is level-1, `indirect` is earned via sub-partners.
const commissions = {
  total: 150,
  available: 150,
  paid: 40,
  count: 2,
  direct: 110,
  indirect: 40,
  rates: { direct: 0.3, indirect: 0.1 },
  rows: [
    {
      id: 'k1', amount: 100, source: 'deposit', reference: 'TX-1',
      client: 'Ada Lovelace', date: '2026-03-05T10:00:00Z', status: 'AVAILABLE', level: 1,
    },
  ],
}

it('renders KPIs, the two-tier commission split, and the referral code', async () => {
  ;(partnerApi.getDashboard as any).mockResolvedValue(payload)
  ;(partnerApi.getCommissions as any).mockResolvedValue(commissions)

  render(
    <MemoryRouter>
      <ToastProvider>
        <PartnerDashboardPage />
      </ToastProvider>
    </MemoryRouter>,
  )

  await waitFor(() => expect(screen.getByText('Total Referred')).toBeInTheDocument())

  // Referral KPIs
  expect(screen.getByText('KYC Verified')).toBeInTheDocument()
  expect(screen.getByText('Signups (30d)')).toBeInTheDocument()

  // Earnings, split by tier
  expect(screen.getByText('Available for payout')).toBeInTheDocument()
  expect(screen.getByText('Paid out')).toBeInTheDocument()
  expect(screen.getByText('Direct (your clients)')).toBeInTheDocument()
  expect(screen.getByText('Indirect (sub-partners)')).toBeInTheDocument()
  expect(screen.getAllByText('$150.00').length).toBeGreaterThanOrEqual(1)

  // Payout is offered because `available` is above zero
  expect(screen.getByRole('button', { name: /request payout/i })).toBeEnabled()

  expect(screen.getByText('Referred KYC status')).toBeInTheDocument()
  expect(screen.getByText(/DEMO27IB/)).toBeInTheDocument()
})
