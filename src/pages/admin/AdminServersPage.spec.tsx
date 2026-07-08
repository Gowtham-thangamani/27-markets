import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

// vi.mock is hoisted — keep data inside the factory.
vi.mock('@/lib/adminApi', () => ({
  adminApi: {
    listServers: vi.fn().mockResolvedValue([
      { id: 's1', name: '27Markets-Live', host: 'live.mt5', platform: 'MT5', environment: 'LIVE', enabled: true, sortOrder: 0, createdAt: '', updatedAt: '' },
      { id: 's2', name: '27Markets-Demo', host: 'demo.mt5', platform: 'MT5', environment: 'DEMO', enabled: false, sortOrder: 1, createdAt: '', updatedAt: '' },
    ]),
    createServer: vi.fn(),
    updateServer: vi.fn(),
    deleteServer: vi.fn(),
  },
}))
vi.mock('@/context/ToastContext', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }),
}))

import AdminServersPage from './AdminServersPage'

describe('AdminServersPage', () => {
  it('lists servers with environment + enabled state and an add action', async () => {
    render(<AdminServersPage />)
    await waitFor(() => expect(screen.getByText('27Markets-Live')).toBeInTheDocument())

    expect(screen.getByText('27Markets-Demo')).toBeInTheDocument()
    expect(screen.getByText('Enabled')).toBeInTheDocument()
    expect(screen.getByText('Disabled')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Add server/ })).toBeInTheDocument()
  })
})
