import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

// vi.mock is hoisted — keep data inside the factory.
vi.mock('@/lib/adminApi', () => ({
  adminApi: {
    listExchangeRates: vi.fn().mockResolvedValue([
      { id: 'r1', base: 'USD', quote: 'EUR', rate: '0.92', updatedAt: '', createdAt: '' },
      { id: 'r2', base: 'USD', quote: 'GBP', rate: '0.79', updatedAt: '', createdAt: '' },
    ]),
    createExchangeRate: vi.fn(),
    updateExchangeRate: vi.fn(),
    deleteExchangeRate: vi.fn(),
  },
}))
vi.mock('@/context/ToastContext', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }),
}))

import AdminExchangeRatesPage from './AdminExchangeRatesPage'

describe('AdminExchangeRatesPage', () => {
  it('lists currency pairs with editable rates', async () => {
    render(<AdminExchangeRatesPage />)
    await waitFor(() => expect(screen.getByText('USD / EUR')).toBeInTheDocument())

    expect(screen.getByText('USD / GBP')).toBeInTheDocument()
    expect(screen.getByDisplayValue('0.92')).toBeInTheDocument()
    expect(screen.getByDisplayValue('0.79')).toBeInTheDocument()
  })
})
