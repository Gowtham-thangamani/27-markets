import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

// vi.mock is hoisted — keep data inside the factory.
vi.mock('@/lib/adminApi', () => ({
  adminApi: {
    listAccountTypes: vi.fn().mockResolvedValue([
      { id: 't1', type: 'STANDARD', displayName: 'Standard', spreadFrom: '0.8', commission: '$0', leverage: '1:10', minDeposit: 50, popular: false, sortOrder: 0, updatedAt: '2026-07-08T00:00:00.000Z' },
      { id: 't2', type: 'RAW_SPREAD', displayName: 'Raw Spread', spreadFrom: '0.0', commission: '$7 / lot', leverage: '1:50', minDeposit: 500, popular: true, sortOrder: 1, updatedAt: '2026-07-08T00:00:00.000Z' },
    ]),
    updateAccountType: vi.fn(),
  },
}))
vi.mock('@/context/ToastContext', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }),
}))

import AdminAccountTypesPage from './AdminAccountTypesPage'

describe('AdminAccountTypesPage', () => {
  it('renders each account type with its conditions and an edit action', async () => {
    render(<AdminAccountTypesPage />)
    await waitFor(() => expect(screen.getByText('Standard')).toBeInTheDocument())

    expect(screen.getByText('Raw Spread')).toBeInTheDocument()
    expect(screen.getByText('1:10')).toBeInTheDocument()
    expect(screen.getByText('$500')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /Edit/ }).length).toBe(2)
  })
})
