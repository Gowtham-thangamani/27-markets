import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

vi.mock('@/lib/adminApi', () => ({
  adminApi: {
    listTextTemplates: vi.fn().mockResolvedValue([
      { id: 't1', kind: 'PDF', name: 'Account Statement', body: 'Body', enabled: true, sortOrder: 0, createdAt: '', updatedAt: '' },
      { id: 't2', kind: 'PDF', name: 'Deposit Receipt', body: 'Body', enabled: false, sortOrder: 1, createdAt: '', updatedAt: '' },
    ]),
    createTextTemplate: vi.fn(), updateTextTemplate: vi.fn(), deleteTextTemplate: vi.fn(),
  },
}))
vi.mock('@/context/ToastContext', () => ({ useToast: () => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }) }))

import AdminTextTemplatesPage from './AdminTextTemplatesPage'
import { adminApi } from '@/lib/adminApi'

describe('AdminTextTemplatesPage', () => {
  it('loads by kind and lists templates', async () => {
    render(<AdminTextTemplatesPage kind="PDF" title="PDF Templates" subtitle="x" />)
    await waitFor(() => expect(screen.getByText('Account Statement')).toBeInTheDocument())
    expect(adminApi.listTextTemplates).toHaveBeenCalledWith('PDF')
    expect(screen.getByText('Deposit Receipt')).toBeInTheDocument()
    expect(screen.getByText('Enabled')).toBeInTheDocument()
    expect(screen.getByText('Disabled')).toBeInTheDocument()
  })
})
