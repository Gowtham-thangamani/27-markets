import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { it, vi, expect } from 'vitest'

// Hoist the mock before any component import.
const loginMock = vi.fn()

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ login: loginMock }),
}))

// Mock ToastContext so we don't need framer-motion in jsdom.
vi.mock('@/context/ToastContext', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  }),
}))

import LoginPage from './LoginPage'

it('redirects a PARTNER to /partner/dashboard after login', async () => {
  loginMock.mockResolvedValue({ role: 'PARTNER' })

  render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/partner/dashboard" element={<div>PARTNER HOME</div>} />
      </Routes>
    </MemoryRouter>,
  )

  // Labels in LoginPage.tsx: "Email", "Password"; button text: "Login"
  await userEvent.type(screen.getByLabelText(/email/i), 'p@x.io')
  await userEvent.type(screen.getByLabelText(/password/i), 'Partner123!')
  await userEvent.click(screen.getByRole('button', { name: /login/i }))
  await waitFor(() => expect(screen.getByText('PARTNER HOME')).toBeInTheDocument())
})
