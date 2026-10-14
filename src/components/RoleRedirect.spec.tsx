import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { RoleRedirect } from './RoleRedirect'

afterEach(() => vi.unstubAllGlobals())

function renderFor(role: 'CLIENT' | 'PARTNER' | 'ADMIN' | 'AGENT') {
  return render(
    <MemoryRouter initialEntries={['/start']}>
      <Routes>
        <Route path="/start" element={<RoleRedirect role={role} />} />
        <Route path="/portal/dashboard" element={<p>portal dashboard</p>} />
        <Route path="/partner/dashboard" element={<p>partner dashboard</p>} />
        <Route path="/admin/dashboard" element={<p>admin dashboard</p>} />
        <Route path="/agent/dashboard" element={<p>agent dashboard</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('RoleRedirect on the combined build', () => {
  // VITE_SURFACE is unset under test, so every role is "local" and should route
  // in-app without touching window.location.
  it.each([
    ['CLIENT', 'portal dashboard'],
    ['PARTNER', 'partner dashboard'],
    ['ADMIN', 'admin dashboard'],
    ['AGENT', 'agent dashboard'],
  ] as const)('routes %s in-app', (role, expected) => {
    const replace = vi.fn()
    vi.stubGlobal('location', { replace } as unknown as Location)
    renderFor(role)
    expect(screen.getByText(expected)).toBeTruthy()
    expect(replace).not.toHaveBeenCalled()
  })
})
