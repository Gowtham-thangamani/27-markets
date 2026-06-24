import { test, expect } from '@playwright/test'
import { apiUser, stubApi } from './helpers'

test('admin approves a pending withdrawal end-to-end', async ({ page }) => {
  let approved = false

  await stubApi(page, {
    me: apiUser('ADMIN'),
    routes: {
      '**/api/admin/finance/deposits': [],
      '**/api/admin/finance/withdrawals': (route) =>
        route.fulfill({
          status: 200,
          json: approved
            ? []
            : [
                {
                  id: 'w1',
                  reference: 'TX-1',
                  status: 'PENDING',
                  amount: '250.00',
                  memo: null,
                  createdAt: '2026-06-23T10:00:00.000Z',
                  accountNumber: '10012345',
                  client: { id: 'c1', name: 'Ada Lovelace', email: 'ada@x.com' },
                },
              ],
        }),
      '**/api/admin/finance/withdrawals/*/approve': (route) => {
        approved = true
        route.fulfill({ status: 200, json: { ok: true, status: 'POSTED' } })
      },
    },
  })

  await page.goto('/admin/finance')

  // The pending withdrawal is shown.
  await expect(page.getByText(/Ada Lovelace/)).toBeVisible()
  const approveBtn = page.getByRole('button', { name: /Approve/ })
  await expect(approveBtn).toBeVisible()

  // Approving it clears the queue (re-fetch now returns empty).
  await approveBtn.click()
  await expect(page.getByText('No pending withdrawals')).toBeVisible()
})
