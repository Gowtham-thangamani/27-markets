import { test, expect } from '@playwright/test'
import { apiUser, stubApi } from './helpers'

test('admin views the leads pipeline and opens a lead', async ({ page }) => {
  const lead = {
    id: 'l1',
    name: 'Ada Prospect',
    email: 'ada@lead.com',
    phone: null,
    country: 'GB',
    source: 'DEMO',
    status: 'NEW',
    assignedToId: null,
    assignedTo: null,
    createdAt: '2026-06-23T10:00:00.000Z',
    _count: { notes: 0 },
  }

  await stubApi(page, {
    me: apiUser('ADMIN'),
    routes: {
      '**/api/admin/staff': [],
      '**/api/admin/leads': [lead],
      '**/api/admin/leads/*': { ...lead, notes: [] },
    },
  })

  await page.goto('/admin/leads')

  await expect(page.getByText('Ada Prospect')).toBeVisible()
  await page.getByText('Ada Prospect').click()

  // Lead detail modal exposes status + assignment controls.
  await expect(page.getByText('Assigned to')).toBeVisible()
})
