import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { api, ApiError } from '@/lib/api'
import { PortalDataProvider, usePortalData } from './PortalDataContext'

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api')
  return { ...actual, api: { get: vi.fn(), post: vi.fn() } }
})
vi.mock('./AuthContext', () => ({ useAuth: () => ({ isAuthenticated: true }) }))
vi.mock('@/lib/analytics', () => ({ track: vi.fn() }))

const ACCOUNT = {
  id: 'a1',
  number: 'DEMO-1001',
  type: 'STANDARD',
  mode: 'DEMO',
  currency: 'USD',
  leverage: '1:10',
  status: 'ACTIVE',
  balance: '50000.00',
  createdAt: '2026-10-16T10:00:00Z',
}

const KYC = { steps: [], progress: 0, verified: false }

/**
 * Routes each GET to a handler so one endpoint can fail while others succeed.
 * Handlers that throw become a REJECTED PROMISE, not a synchronous throw —
 * that is how the real client fails, and the distinction matters here.
 */
function respond(handlers: Record<string, () => unknown>) {
  vi.mocked(api.get).mockImplementation((path: string) => {
    const key = Object.keys(handlers).find((k) => path.startsWith(k))
    if (!key) return Promise.reject(new Error(`unexpected GET ${path}`)) as never
    try {
      return Promise.resolve(handlers[key]()) as never
    } catch (e) {
      return Promise.reject(e) as never
    }
  })
}

function Probe() {
  const { accounts, loading, error } = usePortalData()
  if (loading) return <p>loading</p>
  return (
    <>
      <p>accounts:{accounts.length}</p>
      <p>error:{error ?? 'none'}</p>
    </>
  )
}

const renderProvider = () =>
  render(
    <PortalDataProvider>
      <Probe />
    </PortalDataProvider>,
  )

beforeEach(() => {
  vi.clearAllMocks()
})

describe('PortalDataContext — one failing call must not erase the others', () => {
  it('still exposes accounts when an unrelated endpoint fails', async () => {
    // The real bug: /accounts returned the client's 5 demo accounts, a sibling
    // call in the same Promise.all rejected, and setAccounts was never reached.
    // The portal then rendered "No accounts yet" — telling the client they have
    // none while the server refused to open a 6th because they already have 5.
    respond({
      '/accounts': () => [ACCOUNT],
      '/funds/history': () => {
        throw new ApiError(500, 'Internal server error')
      },
      '/kyc': () => KYC,
      '/notifications': () => [],
    })

    renderProvider()

    expect(await screen.findByText('accounts:1')).toBeInTheDocument()
  })

  it('reports an error when the accounts call itself fails, and claims no accounts', async () => {
    respond({
      '/accounts': () => {
        throw new ApiError(500, 'Internal server error')
      },
      '/funds/history': () => [],
      '/kyc': () => KYC,
      '/notifications': () => [],
    })

    renderProvider()

    expect(await screen.findByText('accounts:0')).toBeInTheDocument()
    expect(screen.getByText(/^error:(?!none)/)).toBeInTheDocument()
  })

  it('reports no error on a clean load with genuinely zero accounts', async () => {
    respond({
      '/accounts': () => [],
      '/funds/history': () => [],
      '/kyc': () => KYC,
      '/notifications': () => [],
    })

    renderProvider()

    expect(await screen.findByText('accounts:0')).toBeInTheDocument()
    expect(screen.getByText('error:none')).toBeInTheDocument()
  })
})
