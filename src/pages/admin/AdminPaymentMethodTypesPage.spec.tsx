import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

// vi.mock is hoisted — keep data inside the factory.
vi.mock('@/lib/adminApi', () => ({
  adminApi: {
    listPaymentMethodTypes: vi.fn().mockResolvedValue([
      { id: 'm1', category: 'CARD', name: 'Visa', enabled: true, sortOrder: 0, createdAt: '', updatedAt: '' },
      { id: 'm2', category: 'CARD', name: 'Mastercard', enabled: false, sortOrder: 1, createdAt: '', updatedAt: '' },
    ]),
    createPaymentMethodType: vi.fn(),
    updatePaymentMethodType: vi.fn(),
    deletePaymentMethodType: vi.fn(),
  },
}))
vi.mock('@/context/ToastContext', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }),
}))

import AdminPaymentMethodTypesPage from './AdminPaymentMethodTypesPage'
import { adminApi } from '@/lib/adminApi'

describe('AdminPaymentMethodTypesPage', () => {
  it('loads by category and lists items with enable/disable state', async () => {
    render(<AdminPaymentMethodTypesPage category="CARD" title="Credit Card Types" subtitle="x" />)
    await waitFor(() => expect(screen.getByText('Visa')).toBeInTheDocument())

    expect(adminApi.listPaymentMethodTypes).toHaveBeenCalledWith('CARD')
    expect(screen.getByText('Mastercard')).toBeInTheDocument()
    expect(screen.getByText('Enabled')).toBeInTheDocument()
    expect(screen.getByText('Disabled')).toBeInTheDocument()
  })
})
