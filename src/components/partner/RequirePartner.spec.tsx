import { it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

it('redirects an unauthenticated visitor to /login', async () => {
  vi.resetModules()
  vi.doMock('@/context/AuthContext', () => ({
    useAuth: () => ({ user: null, isAuthenticated: false, loading: false }),
  }))
  const { RequirePartner } = await import('./RequirePartner')
  render(
    <MemoryRouter initialEntries={['/partner/dashboard']}>
      <Routes>
        <Route
          path="/partner/dashboard"
          element={<RequirePartner><div>PARTNER AREA</div></RequirePartner>}
        />
        <Route path="/login" element={<div>LOGIN PAGE</div>} />
        <Route path="/portal/dashboard" element={<div>PORTAL PAGE</div>} />
      </Routes>
    </MemoryRouter>,
  )
  expect(screen.getByText('LOGIN PAGE')).toBeInTheDocument()
})

it('redirects a CLIENT away from partner routes to /portal/dashboard', async () => {
  vi.resetModules()
  vi.doMock('@/context/AuthContext', () => ({
    useAuth: () => ({ user: { role: 'CLIENT' }, isAuthenticated: true, loading: false }),
  }))
  const { RequirePartner } = await import('./RequirePartner')
  render(
    <MemoryRouter initialEntries={['/partner/dashboard']}>
      <Routes>
        <Route
          path="/partner/dashboard"
          element={<RequirePartner><div>PARTNER AREA</div></RequirePartner>}
        />
        <Route path="/portal/dashboard" element={<div>PORTAL PAGE</div>} />
      </Routes>
    </MemoryRouter>,
  )
  expect(screen.getByText('PORTAL PAGE')).toBeInTheDocument()
})

it('renders children for an authenticated PARTNER', async () => {
  vi.resetModules()
  vi.doMock('@/context/AuthContext', () => ({
    useAuth: () => ({ user: { role: 'PARTNER' }, isAuthenticated: true, loading: false }),
  }))
  const { RequirePartner } = await import('./RequirePartner')
  render(
    <MemoryRouter initialEntries={['/partner/dashboard']}>
      <Routes>
        <Route
          path="/partner/dashboard"
          element={<RequirePartner><div>PARTNER AREA</div></RequirePartner>}
        />
      </Routes>
    </MemoryRouter>,
  )
  expect(screen.getByText('PARTNER AREA')).toBeInTheDocument()
})
