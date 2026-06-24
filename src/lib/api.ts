/**
 * Typed fetch client for the 27 Markets API.
 * - Sends/receives httpOnly auth cookies (`credentials: 'include'`).
 * - On a 401, transparently tries one token refresh, then retries the request.
 * - Surfaces a structured ApiError so the UI can show the server's message.
 */

// In dev, talk to the backend on the same host the page is served from (works
// for both localhost and a LAN IP). In a build, VITE_API_URL drives it.
const BASE_URL: string =
  (import.meta.env.VITE_API_URL as string | undefined) ??
  `${window.location.protocol}//${window.location.hostname}:4000/api`

/** Absolute API base — useful for building direct resource URLs (e.g. file streams). */
export const API_BASE_URL = BASE_URL

export class ApiError extends Error {
  status: number
  code?: string
  constructor(status: number, message: string, code?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  body?: unknown
  /** Internal: prevents infinite refresh recursion. */
  _retried?: boolean
  /** Skip the auto-refresh dance (used by auth endpoints themselves). */
  skipRefresh?: boolean
}

// Endpoints that must never trigger the refresh-retry loop.
const NO_REFRESH = ['/auth/refresh', '/auth/login', '/auth/register', '/auth/logout']

async function parseBody(res: Response): Promise<unknown> {
  const text = await res.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

function messageFrom(body: unknown, fallback: string): { message: string; code?: string } {
  if (body && typeof body === 'object') {
    const b = body as { message?: string | string[]; error?: string }
    const msg = Array.isArray(b.message) ? b.message[0] : b.message
    return { message: msg ?? fallback, code: b.error }
  }
  return { message: typeof body === 'string' && body ? body : fallback }
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, _retried, skipRefresh } = options

  // FormData is sent as-is so the browser sets the multipart boundary header.
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    credentials: 'include',
    headers: body != null && !isForm ? { 'Content-Type': 'application/json' } : undefined,
    body: body == null ? undefined : isForm ? body : JSON.stringify(body),
  })

  if (res.ok) {
    return (await parseBody(res)) as T
  }

  // Attempt a single silent refresh on 401 for protected calls.
  const refreshable = !skipRefresh && !_retried && !NO_REFRESH.some((p) => path.startsWith(p))
  if (res.status === 401 && refreshable) {
    const refreshed = await tryRefresh()
    if (refreshed) {
      return request<T>(path, { ...options, _retried: true })
    }
  }

  const body2 = await parseBody(res)
  const { message, code } = messageFrom(body2, res.statusText || 'Request failed')
  throw new ApiError(res.status, message, code)
}

let refreshInFlight: Promise<boolean> | null = null

/** De-duplicated token refresh — concurrent 401s share one refresh call. */
function tryRefresh(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
      .then((r) => r.ok)
      .catch(() => false)
      .finally(() => {
        // Allow the next batch of 401s to trigger a fresh refresh.
        setTimeout(() => (refreshInFlight = null), 0)
      })
  }
  return refreshInFlight
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: 'POST', body }),
  upload: <T>(path: string, formData: FormData, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: 'POST', body: formData }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
}
