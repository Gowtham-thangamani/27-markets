import { test, expect } from '@playwright/test'
import { apiUser, stubApi } from './helpers'

test('admin opens a ticket and sees the conversation', async ({ page }) => {
  const ticket = {
    id: 't1',
    subject: 'Cannot withdraw',
    category: 'Funding',
    priority: 'HIGH',
    status: 'OPEN',
    updatedAt: '2026-06-23T10:00:00.000Z',
    user: { id: 'c1', firstName: 'Ada', lastName: 'Lovelace', email: 'ada@x.com' },
    assignedTo: null,
    _count: { messages: 1 },
  }

  await stubApi(page, {
    me: apiUser('ADMIN'),
    routes: {
      '**/api/admin/staff': [],
      '**/api/admin/tickets': [ticket],
      '**/api/admin/tickets/*': {
        ...ticket,
        messages: [
          { id: 'm1', body: 'Please help me withdraw', internal: false, createdAt: '2026-06-23T10:00:00.000Z', author: { firstName: 'Ada', lastName: 'Lovelace', role: 'CLIENT' } },
        ],
      },
    },
  })

  await page.goto('/admin/support')

  await expect(page.getByText('Cannot withdraw')).toBeVisible()
  await page.getByText('Cannot withdraw').click()

  // Ticket thread modal shows the client's message.
  await expect(page.getByText('Please help me withdraw')).toBeVisible()
})
