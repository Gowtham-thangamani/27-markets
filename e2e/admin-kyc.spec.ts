import { test, expect } from '@playwright/test'
import { apiUser, stubApi } from './helpers'

test('admin approves a pending KYC step and clears the queue', async ({ page }) => {
  let reviewed = false

  await stubApi(page, {
    me: apiUser('ADMIN'),
    routes: {
      '**/api/admin/clients': (route) =>
        route.fulfill({
          status: 200,
          json: [
            {
              id: 'c1',
              email: 'ada@x.com',
              firstName: 'Ada',
              lastName: 'Lovelace',
              country: 'GB',
              status: 'ACTIVE',
              createdAt: '2026-01-01',
              _count: { tradingAccounts: 1 },
              kycProfile: {
                identityStatus: reviewed ? 'APPROVED' : 'PENDING',
                addressStatus: 'APPROVED',
                selfieStatus: 'NOT_SUBMITTED',
              },
            },
          ],
        }),
      '**/api/kyc/documents/*': [
        { id: 'd1', step: 'identity', fileName: 'passport.pdf', mimeType: 'application/pdf', createdAt: '2026-01-02' },
      ],
      '**/api/kyc/review': (route) => {
        reviewed = true
        route.fulfill({ status: 200, json: { steps: [], progress: 0, verified: false } })
      },
    },
  })

  await page.goto('/admin/kyc')

  await expect(page.getByText('Ada Lovelace')).toBeVisible()
  await expect(page.getByRole('link', { name: /View/ })).toBeVisible() // document link

  await page.getByRole('button', { name: /Approve/ }).first().click()
  await expect(page.getByText('Nothing to review')).toBeVisible()
})
