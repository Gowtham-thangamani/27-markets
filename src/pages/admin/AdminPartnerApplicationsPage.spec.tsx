import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { it, expect, vi } from 'vitest'
import { ToastProvider } from '@/context/ToastContext'
import { partnersApi } from '@/lib/partnersApi'

vi.mock('@/lib/partnersApi', () => ({
  partnersApi: {
    listApplications: vi.fn().mockResolvedValue([
      {
        id: 'a1',
        firstName: 'Pat',
        lastName: 'Lee',
        email: 'pat@x.io',
        phone: null,
        country: 'UK',
        company: 'PatPromo',
        website: null,
        audience: null,
        status: 'PENDING',
        notes: null,
        createdAt: '2026-06-29T00:00:00Z',
        reviewedAt: null,
        resultingUserId: null,
      },
    ]),
    approve: vi.fn().mockResolvedValue({ ok: true, referralCode: 'ABCD2345', inviteUrl: 'https://app/reset-password?token=xyz' }),
    reject: vi.fn().mockResolvedValue({ ok: true }),
  },
}))

import AdminPartnerApplicationsPage from './AdminPartnerApplicationsPage'

it('lists applications and reveals the invite link on approve', async () => {
  render(
    <MemoryRouter>
      <ToastProvider>
        <AdminPartnerApplicationsPage />
      </ToastProvider>
    </MemoryRouter>,
  )
  expect(await screen.findByText('pat@x.io')).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: /approve/i }))
  await waitFor(() => expect(partnersApi.approve).toHaveBeenCalledWith('a1'))
  expect(await screen.findByText(/ABCD2345/)).toBeInTheDocument()
  expect(screen.getByText(/reset-password\?token=xyz/)).toBeInTheDocument()
})
