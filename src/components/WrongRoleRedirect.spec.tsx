import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { WrongRoleRedirect } from './WrongRoleRedirect'

/** Renders whatever navigation state the login route was reached with. */
function LoginProbe() {
  const state = useLocation().state as { from?: string; needRole?: string } | null
  return <pre>{JSON.stringify(state)}</pre>
}

function renderFrom(path: string, need: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/partner/clients" element={<WrongRoleRedirect need={need} />} />
        <Route path="/admin/leads" element={<WrongRoleRedirect need={need} />} />
        <Route path="/login" element={<LoginProbe />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('WrongRoleRedirect', () => {
  it('sends the user to /login rather than to their own dashboard', () => {
    renderFrom('/partner/clients', 'partner')
    expect(screen.getByText(/needRole/)).toBeTruthy()
  })

  it('names the role the area requires, so the login page can explain', () => {
    renderFrom('/partner/clients', 'partner')
    expect(JSON.parse(screen.getByText(/needRole/).textContent!).needRole).toBe('partner')
  })

  it('remembers the attempted path so signing in returns the user there', () => {
    renderFrom('/partner/clients', 'partner')
    expect(JSON.parse(screen.getByText(/needRole/).textContent!).from).toBe('/partner/clients')
  })

  it('preserves the query string on the attempted path', () => {
    renderFrom('/admin/leads?status=new', 'staff')
    const state = JSON.parse(screen.getByText(/needRole/).textContent!)
    expect(state.from).toBe('/admin/leads?status=new')
    expect(state.needRole).toBe('staff')
  })
})
