import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

vi.mock('@/lib/adminApi', () => ({
  adminApi: {
    getAuditLog: vi.fn().mockResolvedValue([
      { id: 'a1', action: 'campaign.create', entity: 'Campaign', entityId: 'c1', metadata: {}, createdAt: '2026-07-01T00:00:00.000Z', user: { firstName: 'Avery', lastName: 'Stone', email: 'a@x.com' } },
      { id: 'a2', action: 'finance.withdrawal.approve', entity: 'JournalEntry', entityId: 'j1', metadata: {}, createdAt: '2026-07-01T00:00:00.000Z', user: null },
      { id: 'a3', action: 'templates.text.update', entity: 'TextTemplate', entityId: 't1', metadata: {}, createdAt: '2026-07-01T00:00:00.000Z', user: null },
    ]),
  },
}))

import AdminNotificationLogsPage from './AdminNotificationLogsPage'

describe('AdminNotificationLogsPage', () => {
  it('shows only notification/comms audit actions', async () => {
    render(<AdminNotificationLogsPage />)
    // Text appears in both the row badge and the select-filter option.
    await waitFor(() => expect(screen.getAllByText('campaign.create').length).toBeGreaterThan(0))
    expect(screen.getAllByText('templates.text.update').length).toBeGreaterThan(0)
    // Unrelated finance action is filtered out entirely.
    expect(screen.queryByText('finance.withdrawal.approve')).not.toBeInTheDocument()
  })
})
