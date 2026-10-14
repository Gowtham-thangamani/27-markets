import { afterEach, describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'
import {
  MemoryRouter,
  Route,
  Routes,
  createRoutesFromChildren,
  matchRoutes,
  type RouteObject,
} from 'react-router-dom'
import { ExternalRedirect } from './ExternalRedirect'
import { surfaceRoutes as marketing } from './surfaces/marketing'

afterEach(() => vi.unstubAllGlobals())

describe('ExternalRedirect', () => {
  it('sends the browser to the absolute URL', () => {
    const replace = vi.fn()
    vi.stubGlobal('location', { replace } as unknown as Location)
    render(
      <MemoryRouter initialEntries={['/x']}>
        <Routes>
          <Route
            path="/x"
            element={<ExternalRedirect to="https://partners.27markets.com/partner/dashboard" />}
          />
        </Routes>
      </MemoryRouter>,
    )
    expect(replace).toHaveBeenCalledWith('https://partners.27markets.com/partner/dashboard')
  })
})

describe('IB aliases on the marketing build', () => {
  const routes: RouteObject[] = createRoutesFromChildren(marketing())

  it.each(['/ib-portal', '/ibpartner'])('%s is mounted, not a 404', (path) => {
    const matches = matchRoutes(routes, path)
    expect(matches).not.toBeNull()
    expect(matches![matches!.length - 1].route.path).toBe(path)
  })

  it('does not point at /partner/dashboard, which this build does not have', () => {
    const matches = matchRoutes(routes, '/partner/dashboard')
    // the only /partner route on marketing is the public application form
    expect(matches).toBeNull()
  })
})
