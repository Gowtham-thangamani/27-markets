import { test, expect } from '@playwright/test'
import { apiUser, stubApi } from './helpers'

test.describe('Admin access gate (RequireStaff)', () => {
  test('staff (AGENT) reaches the admin dashboard', async ({ page }) => {
    await stubApi(page, {
      me: apiUser('AGENT'),
      routes: {
        '**/api/admin/dashboard': {
          totalClients: 12,
          pendingKyc: 3,
          pendingWithdrawals: 2,
          depositsToday: 5,
          openTickets: 4,
        },
      },
    })

    await page.goto('/admin')

    await expect(page).toHaveURL(/\/admin\/dashboard/)
    await expect(page.getByText('Total Clients')).toBeVisible()
    await expect(page.getByText('Pending Withdrawals')).toBeVisible()
  })

  test('unauthenticated visitor is redirected to /login', async ({ page }) => {
    await stubApi(page, { me: null })

    await page.goto('/admin')

    await expect(page).toHaveURL(/\/login/)
  })

  test('a CLIENT is bounced out of /admin to the portal', async ({ page }) => {
    await stubApi(page, { me: apiUser('CLIENT') })

    await page.goto('/admin')

    await expect(page).toHaveURL(/\/portal/)
    await expect(page).not.toHaveURL(/\/admin/)
  })
})
