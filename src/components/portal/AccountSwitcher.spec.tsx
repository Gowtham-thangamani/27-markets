import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AccountSwitcher } from './AccountSwitcher'
import { usePortalData } from '@/context/PortalDataContext'

vi.mock('@/context/PortalDataContext', () => ({ usePortalData: vi.fn() }))

const account = (id: string, number: string, mode: 'Live' | 'Demo') => ({
  id,
  number,
  type: 'Standard',
  mode,
  currency: 'USD',
  balance: 50000,
  equity: 50000,
  freeMargin: 50000,
  marginLevel: 0,
  leverage: '1:10',
  status: 'Active',
  createdAt: '2026-10-16T10:00:00Z',
})

const ACCOUNTS = [account('a1', 'DEMO-1001', 'Demo'), account('a2', 'DEMO-1002', 'Demo')]

function setup(selectedId: string | null) {
  const selectAccount = vi.fn()
  vi.mocked(usePortalData).mockReturnValue({
    accounts: ACCOUNTS,
    selectedAccount: ACCOUNTS.find((a) => a.id === selectedId) ?? null,
    selectAccount,
  } as never)
  render(<AccountSwitcher />)
  return { selectAccount }
}

describe('AccountSwitcher', () => {
  it('renders nothing when the client has no accounts', () => {
    vi.mocked(usePortalData).mockReturnValue({
      accounts: [],
      selectedAccount: null,
      selectAccount: vi.fn(),
    } as never)
    const { container } = render(<AccountSwitcher />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows the selected account on the trigger', () => {
    setup('a2')
    expect(screen.getAllByText('DEMO-1002').length).toBeGreaterThan(0)
  })

  it('switches the whole portal to the account that was picked', () => {
    // The old picker lived on the Dashboard only, so choosing an account there
    // left Trade, Funds and the history table on a different one.
    const { selectAccount } = setup('a1')

    fireEvent.click(screen.getByRole('button', { name: /switch trading account/i }))
    fireEvent.click(screen.getByText('DEMO-1002'))

    expect(selectAccount).toHaveBeenCalledWith('a2')
  })
})
