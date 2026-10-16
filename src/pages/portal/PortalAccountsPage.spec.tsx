import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import PortalAccountsPage from './PortalAccountsPage'
import { usePortalData } from '@/context/PortalDataContext'

vi.mock('@/context/PortalDataContext', () => ({ usePortalData: vi.fn() }))
vi.mock('@/layouts/PortalLayout', () => ({ usePortalUI: () => ({ openNewAccount: vi.fn() }) }))
vi.mock('@/context/ToastContext', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}))

const portal = (over: Partial<ReturnType<typeof usePortalData>>) =>
  vi.mocked(usePortalData).mockReturnValue({
    accounts: [],
    loading: false,
    error: null,
    refresh: vi.fn(),
    ...over,
  } as never)

describe('PortalAccountsPage — an empty list must mean empty, not broken', () => {
  it('does NOT claim "No accounts yet" when the load failed', () => {
    // The client had five demo accounts. A failed load rendered the empty
    // state, so the page said they had none while the server refused to open
    // a sixth. An empty list and a failed load must not look identical.
    portal({ accounts: [], error: 'Internal server error' })

    render(<PortalAccountsPage />)

    expect(screen.queryByText(/no accounts yet/i)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
  })

  it('still shows the empty state on a clean load with no accounts', () => {
    portal({ accounts: [], error: null })

    render(<PortalAccountsPage />)

    expect(screen.getByText(/no accounts yet/i)).toBeInTheDocument()
  })

  it('shows accounts that did load even if something else on the page failed', () => {
    portal({
      accounts: [
        {
          id: 'a1',
          number: 'DEMO-1001',
          type: 'Standard',
          mode: 'Demo',
          currency: 'USD',
          balance: 50000,
          equity: 50000,
          freeMargin: 50000,
          marginLevel: 0,
          leverage: '1:10',
          status: 'Active',
          createdAt: '2026-10-16T10:00:00Z',
        },
      ],
      error: 'Internal server error',
    } as never)

    render(<PortalAccountsPage />)

    expect(screen.getByText('DEMO-1001')).toBeInTheDocument()
    expect(screen.queryByText(/no accounts yet/i)).not.toBeInTheDocument()
  })
})
