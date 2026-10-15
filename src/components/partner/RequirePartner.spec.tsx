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

// /partner is a URL handed to IB partners. Someone signed in with the wrong
// role should get the chance to sign in as a partner, not be silently
// teleported to their own dashboard as if the link were broken.
it('offers a sign-in to a CLIENT who opens a partner route', async () => {
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
        <Route path="/login" element={<div>LOGIN PAGE</div>} />
        <Route path="/portal/dashboard" element={<div>PORTAL PAGE</div>} />
      </Routes>
    </MemoryRouter>,
  )
  expect(screen.getByText('LOGIN PAGE')).toBeInTheDocument()
  expect(screen.queryByText('PORTAL PAGE')).not.toBeInTheDocument()
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
