import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

// vi.mock is hoisted — keep data inside the factory.
vi.mock('@/lib/adminApi', () => ({
  adminApi: {
    listNotificationTemplates: vi.fn().mockResolvedValue([
      { id: 't1', key: 'verify_email', name: 'Verify email', subject: 'Verify your email', body: 'Click {{link}}', updatedAt: '' },
      { id: 't2', key: 'welcome', name: 'Welcome', subject: 'Welcome', body: 'Hi {{firstName}}', updatedAt: '' },
    ]),
    updateNotificationTemplate: vi.fn(),
  },
}))
vi.mock('@/context/ToastContext', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }),
}))

import AdminNotificationTemplatesPage from './AdminNotificationTemplatesPage'

describe('AdminNotificationTemplatesPage', () => {
  it('lists templates with their key and subject and an edit action', async () => {
    render(<AdminNotificationTemplatesPage />)
    await waitFor(() => expect(screen.getByText('Verify email')).toBeInTheDocument())

    expect(screen.getByText('welcome')).toBeInTheDocument()
    expect(screen.getByText('Verify your email')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /Edit/ }).length).toBe(2)
  })
})
