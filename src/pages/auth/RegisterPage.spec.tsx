import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { it, vi, expect } from 'vitest'

// Must be hoisted before the component import so the module-mock is in place.
const registerMock = vi.fn().mockResolvedValue(undefined)

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    register: registerMock,
    user: null,
    isAuthenticated: false,
    loading: false,
  }),
}))

// ToastContext is used by RegisterPage via useToast()
vi.mock('@/context/ToastContext', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  }),
}))

// react-router-dom's useNavigate is provided by MemoryRouter wrapper.

import RegisterPage from './RegisterPage'

it('shows a referred-by-partner note when ?ref is present', () => {
  render(
    <MemoryRouter initialEntries={['/register?ref=ABCD2345']}>
      <RegisterPage />
    </MemoryRouter>,
  )
  expect(screen.getByText(/referred by a partner/i)).toBeInTheDocument()
})

it('does NOT show the referral note when ?ref is absent', () => {
  render(
    <MemoryRouter initialEntries={['/register']}>
      <RegisterPage />
    </MemoryRouter>,
  )
  expect(screen.queryByText(/referred by a partner/i)).not.toBeInTheDocument()
})
