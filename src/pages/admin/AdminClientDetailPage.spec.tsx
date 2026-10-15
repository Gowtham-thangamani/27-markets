import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import AdminClientDetailPage from './AdminClientDetailPage'
import { adminApi } from '@/lib/adminApi'

vi.mock('@/lib/adminApi', () => ({ adminApi: { getClient: vi.fn() } }))

const base = {
  id: 'c1',
  email: 'ada@example.com',
  name: 'Ada Lovelace',
  phone: '+44 20 7946 0000',
  country: 'UK',
  status: 'ACTIVE',
  joinedAt: '2026-01-05T10:00:00Z',
  kyc: { identityStatus: 'APPROVED', addressStatus: 'APPROVED', selfieStatus: 'PENDING' },
  accounts: [{ id: 'a1', number: 'MT5-1001', type: 'STANDARD', mode: 'LIVE', status: 'ACTIVE', balance: '1250.00' }],
  notes: [],
  tickets: [{ id: 't1', subject: 'Cannot withdraw', status: 'OPEN', updatedAt: '2026-02-01T10:00:00Z' }],
  kycAnswers: [],
  consents: [],
  assignedAgentId: null,
  assignedAgent: 'Sam Agent',
  transactions: [
    { id: 'p1', reference: 'TX-1', kind: 'DEPOSIT', status: 'POSTED', direction: 'CREDIT', amount: '250.00', currency: 'USD', simulated: true, at: '2026-02-02T10:00:00Z' },
  ],
  orders: [
    { id: 'o1', symbol: 'EURUSD', side: 'BUY', type: 'MARKET', quantity: '1', price: '1.08', status: 'FILLED', simulated: true, createdAt: '2026-02-03T10:00:00Z' },
  ],
  auditLog: [{ id: 'al1', action: 'auth.login', entity: null, entityId: null, ip: '1.2.3.4', createdAt: '2026-02-04T10:00:00Z' }],
  lead: { id: 'l1', source: 'WAITLIST', status: 'CONVERTED', createdAt: '2025-12-01T10:00:00Z' },
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/admin/clients/c1']}>
      <Routes>
        <Route path="/admin/clients/:id" element={<AdminClientDetailPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => vi.clearAllMocks())

describe('AdminClientDetailPage', () => {
  it('shows who the client is', async () => {
    vi.mocked(adminApi.getClient).mockResolvedValue(base as never)
    renderPage()
    expect(await screen.findByText('Ada Lovelace')).toBeInTheDocument()
    expect(screen.getByText('ada@example.com')).toBeInTheDocument()
  })

  it('renders every history section', async () => {
    vi.mocked(adminApi.getClient).mockResolvedValue(base as never)
    renderPage()
    expect(await screen.findByText('Ada Lovelace')).toBeInTheDocument()
    expect(screen.getByText('MT5-1001')).toBeInTheDocument() // accounts
    expect(screen.getByText('TX-1')).toBeInTheDocument() // money
    expect(screen.getByText('EURUSD')).toBeInTheDocument() // trading
    expect(screen.getByText('auth.login')).toBeInTheDocument() // audit
    expect(screen.getByText('Cannot withdraw')).toBeInTheDocument() // support
    expect(screen.getByText(/WAITLIST/)).toBeInTheDocument() // lead
  })

  it('shows an empty state per section rather than a blank gap', async () => {
    vi.mocked(adminApi.getClient).mockResolvedValue({
      ...base, accounts: [], transactions: [], orders: [], auditLog: [], tickets: [], lead: null,
    } as never)
    renderPage()
    expect(await screen.findByText('Ada Lovelace')).toBeInTheDocument()
    expect(screen.getByText(/no transactions/i)).toBeInTheDocument()
    expect(screen.getByText(/no orders/i)).toBeInTheDocument()
    expect(screen.getByText(/no activity recorded/i)).toBeInTheDocument()
  })

  it('surfaces a load failure with a retry rather than an endless skeleton', async () => {
    vi.mocked(adminApi.getClient).mockRejectedValue(new Error('boom'))
    renderPage()
    expect(await screen.findByRole('button', { name: /try again|retry/i })).toBeInTheDocument()
  })
})

describe('AdminClientDetailPage — tolerating an older API', () => {
  it('still renders when the API omits the new sections', async () => {
    // The frontend and backend deploy independently. Between the two, the API
    // returns the pre-profile payload with no transactions/orders/auditLog/lead.
    // Reading .length on those crashed the page into the error boundary.
    const { transactions, orders, auditLog, lead, ...legacy } = base
    void transactions; void orders; void auditLog; void lead
    vi.mocked(adminApi.getClient).mockResolvedValue(legacy as never)

    renderPage()

    expect(await screen.findByText('Ada Lovelace')).toBeInTheDocument()
    expect(screen.getByText(/no transactions/i)).toBeInTheDocument()
    expect(screen.getByText(/no orders/i)).toBeInTheDocument()
    expect(screen.getByText(/no activity recorded/i)).toBeInTheDocument()
  })
})
