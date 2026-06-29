import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { it, vi, expect } from 'vitest'
import PartnerApplyPage from './PartnerApplyPage'
import { partnersApi } from '@/lib/partnersApi'
import { ToastProvider } from '@/context/ToastContext'

vi.mock('@/lib/partnersApi', () => ({ partnersApi: { apply: vi.fn().mockResolvedValue({ id: 'a1' }) } }))

it('submits an application and shows the success state', async () => {
  render(<ToastProvider><MemoryRouter><PartnerApplyPage /></MemoryRouter></ToastProvider>)
  await userEvent.type(screen.getByLabelText(/first name/i), 'Pat')
  await userEvent.type(screen.getByLabelText(/last name/i), 'Lee')
  await userEvent.type(screen.getByLabelText(/email/i), 'pat@example.com')
  await userEvent.click(screen.getByRole('button', { name: /apply|submit/i }))
  await waitFor(() => expect(partnersApi.apply).toHaveBeenCalled())
  expect((await screen.findAllByText(/thank you|received|under review/i)).length).toBeGreaterThan(0)
})
