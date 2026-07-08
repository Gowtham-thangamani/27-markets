import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

// vi.mock is hoisted — keep data inside the factory.
vi.mock('@/lib/adminApi', () => ({
  adminApi: {
    listPaymentGateways: vi.fn().mockResolvedValue([
      { id: 'g1', name: 'Bank Transfer', type: 'BANK', enabled: true, instructions: 'Wire it', minAmount: 50, maxAmount: null, sortOrder: 0, createdAt: '', updatedAt: '' },
      { id: 'g2', name: 'USDT (TRC20)', type: 'CRYPTO', enabled: false, instructions: null, minAmount: 50, maxAmount: null, sortOrder: 1, createdAt: '', updatedAt: '' },
    ]),
    createPaymentGateway: vi.fn(),
    updatePaymentGateway: vi.fn(),
    deletePaymentGateway: vi.fn(),
  },
}))
vi.mock('@/context/ToastContext', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }),
}))

import AdminPaymentGatewaysPage from './AdminPaymentGatewaysPage'

describe('AdminPaymentGatewaysPage', () => {
  it('lists gateways with enabled state and an add action', async () => {
    render(<AdminPaymentGatewaysPage />)
    await waitFor(() => expect(screen.getByText('Bank Transfer')).toBeInTheDocument())

    expect(screen.getByText('USDT (TRC20)')).toBeInTheDocument()
    expect(screen.getByText('Enabled')).toBeInTheDocument()
    expect(screen.getByText('Disabled')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Add gateway/ })).toBeInTheDocument()
  })
})
