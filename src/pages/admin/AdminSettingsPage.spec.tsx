import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

// vi.mock is hoisted — keep data inside the factory.
vi.mock('@/lib/adminApi', () => ({
  adminApi: {
    listSettings: vi.fn().mockResolvedValue([
      { id: 's1', key: 'company_name', label: 'Company name', value: '27 Markets Ltd', group: 'General', sortOrder: 0, updatedAt: '' },
      { id: 's2', key: 'min_deposit_usd', label: 'Minimum deposit (USD)', value: '50', group: 'Funding', sortOrder: 0, updatedAt: '' },
    ]),
    updateSettings: vi.fn(),
  },
}))
vi.mock('@/context/ToastContext', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }),
}))

import AdminSettingsPage from './AdminSettingsPage'

describe('AdminSettingsPage', () => {
  it('renders settings grouped with their current values', async () => {
    render(<AdminSettingsPage />)
    await waitFor(() => expect(screen.getByText('Company name')).toBeInTheDocument())

    expect(screen.getByText('General')).toBeInTheDocument()
    expect(screen.getByText('Funding')).toBeInTheDocument()
    expect(screen.getByDisplayValue('27 Markets Ltd')).toBeInTheDocument()
    expect(screen.getByDisplayValue('50')).toBeInTheDocument()
  })
})
