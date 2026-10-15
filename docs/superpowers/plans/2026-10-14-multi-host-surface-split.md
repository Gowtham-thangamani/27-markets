# Multi-Host Surface Split Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Serve the marketing site, client portal, IB partner portal and admin CRM from four separate hostnames, each built so it contains only its own routes — without the currently-working `/staging/` deployment breaking at any point.

**Architecture:** One codebase. A build-time constant `VITE_SURFACE` selects which route tree mounts. `App.tsx` splits into four route modules; the three that don't apply are eliminated by Rollup because the guard comparison folds to a literal `false`. **The constant defaults to `all`, which mounts every route exactly as today** — so until a build explicitly sets `VITE_SURFACE`, output is behaviourally identical to the current bundle. A build-gate script proves the foreign routes are actually absent rather than trusting tree-shaking.

**Tech Stack:** React 18, React Router v6, Vite, TypeScript, Vitest, AWS S3 + CloudFront + ACM, Namecheap DNS, NestJS backend (config only).

**Spec:** `docs/superpowers/specs/2026-10-14-multi-host-surface-split-design.md`

## Global Constraints

- **Nothing breaks.** `27markets.com/staging/` must keep working after every single task. It is retired only in Task 9, after the replacement hosts are verified.
- `VITE_SURFACE` unset or absent ⇒ surface is `all` ⇒ every route mounts. This is the default and must stay the default until Task 9.
- No backend route, guard, or role-check changes. Backend edits are limited to the `CLIENT_ORIGIN` env value.
- All 59 existing test files must pass at the end of every task. Command: `npx vitest run`.
- Hostnames exactly: `27markets.com`, `www.27markets.com`, `preview.27markets.com`, `portal.27markets.com`, `partners.27markets.com`, `admin.27markets.com`.
- Surface names exactly: `marketing`, `portal`, `partner`, `admin`, `all`. Singular `partner`, not `partners` — the hostname is plural, the surface is not.
- ACM certificate must be in `us-east-1` regardless of where anything else lives; CloudFront accepts no other region.
- Commit after every task. Never commit a state where `npx vitest run` fails.

## Review Focus

Five things the spec implies but no obvious task tests. Each has a test assigned to the task that owns the code.

1. **`VITE_SURFACE` set to an unrecognised string** (typo in a deploy script) must fail loudly at build time, not silently mount zero routes and ship a blank site. — Task 1
2. **A logged-in user whose role doesn't match the host** must land on the right host, not a 404 or an infinite redirect between hosts. — Task 5
3. **The isolation script passing vacuously** — if the sentinel strings are wrong or the glob matches no files, it must fail, not report success on an unscanned directory. — Task 4
4. **A surface build with no `/login` route** (marketing) must not have its guards redirect to a non-existent `/login` on that host. — Task 3
5. **`VITE_SURFACE=all` output drifting from today's bundle** — the default path must keep mounting every route, or `/staging/` breaks mid-plan. — Task 3

---

### Task 1: Surface constant and host map

**Files:**
- Create: `src/lib/surface.ts`
- Test: `src/lib/surface.spec.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `type Surface = 'marketing' | 'portal' | 'partner' | 'admin' | 'all'`; `SURFACE: Surface`; `resolveSurface(raw: string | undefined): Surface`; `isSurface(build: Surface, target: Surface): boolean`; `HOST_FOR_SURFACE: Record<Exclude<Surface,'all'>, string>`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/surface.spec.ts
import { describe, expect, it } from 'vitest'
import { HOST_FOR_SURFACE, isSurface, resolveSurface } from './surface'

describe('resolveSurface', () => {
  it('defaults to "all" when unset, so the current bundle is unchanged', () => {
    expect(resolveSurface(undefined)).toBe('all')
    expect(resolveSurface('')).toBe('all')
  })

  it('accepts each known surface', () => {
    for (const s of ['marketing', 'portal', 'partner', 'admin', 'all']) {
      expect(resolveSurface(s)).toBe(s)
    }
  })

  it('throws on an unrecognised surface rather than mounting nothing', () => {
    expect(() => resolveSurface('partners')).toThrow(/unknown VITE_SURFACE/i)
    expect(() => resolveSurface('Admin')).toThrow(/unknown VITE_SURFACE/i)
  })
})

describe('isSurface', () => {
  it('matches the exact surface', () => {
    expect(isSurface('admin', 'admin')).toBe(true)
    expect(isSurface('admin', 'portal')).toBe(false)
  })

  it('"all" includes every surface', () => {
    expect(isSurface('all', 'admin')).toBe(true)
    expect(isSurface('all', 'marketing')).toBe(true)
  })
})

describe('HOST_FOR_SURFACE', () => {
  it('maps every non-"all" surface to an absolute https origin', () => {
    expect(HOST_FOR_SURFACE.marketing).toBe('https://27markets.com')
    expect(HOST_FOR_SURFACE.portal).toBe('https://portal.27markets.com')
    expect(HOST_FOR_SURFACE.partner).toBe('https://partners.27markets.com')
    expect(HOST_FOR_SURFACE.admin).toBe('https://admin.27markets.com')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/surface.spec.ts`
Expected: FAIL — "Failed to resolve import ./surface"

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/surface.ts
/**
 * Which slice of the app this build contains. Chosen at build time via
 * VITE_SURFACE so Rollup can fold the comparisons to literals and drop the
 * route trees that don't apply.
 *
 * Unset => 'all' => every route mounts, identical to the pre-split bundle.
 */
export type Surface = 'marketing' | 'portal' | 'partner' | 'admin' | 'all'

const KNOWN: readonly Surface[] = ['marketing', 'portal', 'partner', 'admin', 'all']

/** Validates the raw env value. Exported for testing; throws on a typo. */
export function resolveSurface(raw: string | undefined): Surface {
  if (!raw) return 'all'
  if (!KNOWN.includes(raw as Surface)) {
    throw new Error(
      `Unknown VITE_SURFACE "${raw}". Expected one of: ${KNOWN.join(', ')}`,
    )
  }
  return raw as Surface
}

/** Does `build` contain `target`'s routes? 'all' contains everything. */
export function isSurface(build: Surface, target: Surface): boolean {
  return build === 'all' || build === target
}

export const SURFACE: Surface = resolveSurface(
  import.meta.env.VITE_SURFACE as string | undefined,
)

/** Where each surface lives in production. Used for cross-host redirects. */
export const HOST_FOR_SURFACE: Record<Exclude<Surface, 'all'>, string> = {
  marketing: 'https://27markets.com',
  portal: 'https://portal.27markets.com',
  partner: 'https://partners.27markets.com',
  admin: 'https://admin.27markets.com',
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/surface.spec.ts`
Expected: PASS, 7 assertions

- [ ] **Step 5: Run the full suite — nothing should have changed**

Run: `npx vitest run`
Expected: PASS, all 59 files. This file is not yet imported anywhere.

- [ ] **Step 6: Commit**

```bash
git add src/lib/surface.ts src/lib/surface.spec.ts
git commit -m "feat(build): add VITE_SURFACE constant and host map"
```

---

### Task 2: Extract route modules (pure refactor, no behaviour change)

**Files:**
- Create: `src/routes/marketingRoutes.tsx`, `src/routes/portalRoutes.tsx`, `src/routes/partnerRoutes.tsx`, `src/routes/adminRoutes.tsx`, `src/routes/authRoutes.tsx`
- Modify: `src/App.tsx`
- Test: `src/App.spec.tsx`

**Interfaces:**
- Consumes: nothing from Task 1 yet — this task is deliberately surface-unaware.
- Produces: five functions, each `(): JSX.Element` returning a fragment of `<Route>` elements: `marketingRoutes()`, `authRoutes()`, `portalRoutes()`, `partnerRoutes()`, `adminRoutes()`. `adminRoutes()` contains the `/agent/*` tree as well as `/admin/*`.

This task moves code only. Every route stays mounted. If any behaviour changes, the task is wrong.

- [ ] **Step 1: Write the failing test**

```tsx
// src/App.spec.tsx
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from './App'

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

describe('App routing (default build mounts everything)', () => {
  it('mounts the marketing home route', async () => {
    renderAt('/')
    expect(await screen.findByRole('main', {}, { timeout: 3000 })).toBeTruthy()
  })

  it('mounts the login route', async () => {
    renderAt('/login')
    expect(await screen.findByText(/welcome back/i, {}, { timeout: 3000 })).toBeTruthy()
  })

  it('does not render the 404 page for a known admin path', async () => {
    renderAt('/admin/dashboard')
    expect(screen.queryByText(/page not found/i)).toBeNull()
  })

  it('does not render the 404 page for a known partner path', async () => {
    renderAt('/partner/dashboard')
    expect(screen.queryByText(/page not found/i)).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails or passes for the right reason**

Run: `npx vitest run src/App.spec.tsx`
Expected: PASS (App already mounts these). This test is the regression net for Steps 3–5 — it must be green *before* the refactor so a break during it is unambiguous. If it fails, fix the test, not `App.tsx`.

- [ ] **Step 3: Move the marketing and auth routes into modules**

Cut the `<Route element={<MarketingLayout />}>` block and the six standalone auth routes out of `src/App.tsx` verbatim, along with their `lazy()` declarations and imports.

```tsx
// src/routes/marketingRoutes.tsx
import { lazy } from 'react'
import { Navigate, Route } from 'react-router-dom'
import { MarketingLayout } from '../layouts/MarketingLayout'

const HomePage = lazy(() => import('../pages/HomePage'))
const AboutPage = lazy(() => import('../pages/AboutPage'))
// ...one per marketing page, moved verbatim from App.tsx

/** Public marketing site. No authentication anywhere in this tree. */
export function marketingRoutes() {
  return (
    <Route element={<MarketingLayout />}>
      <Route path="/" element={<HomePage />} />
      {/* ...every marketing route, moved verbatim... */}
      <Route path="/ib-portal" element={<Navigate to="/partner/dashboard" replace />} />
      <Route path="/ibpartner" element={<Navigate to="/partner/dashboard" replace />} />
    </Route>
  )
}
```

```tsx
// src/routes/authRoutes.tsx
import { lazy } from 'react'
import { Route } from 'react-router-dom'

const LoginPage = lazy(() => import('../pages/auth/LoginPage'))
const RegisterPage = lazy(() => import('../pages/auth/RegisterPage'))
const DemoPage = lazy(() => import('../pages/DemoPage'))
const VerifyEmailPage = lazy(() => import('../pages/auth/VerifyEmailPage'))
const ForgotPasswordPage = lazy(() => import('../pages/auth/ForgotPasswordPage'))
const ResetPasswordPage = lazy(() => import('../pages/auth/ResetPasswordPage'))

/**
 * Standalone full-screen auth pages.
 * `withSignup` is false on surfaces that don't self-register (partner, admin).
 */
export function authRoutes({ withSignup = true }: { withSignup?: boolean } = {}) {
  return (
    <>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      {withSignup && <Route path="/register" element={<RegisterPage />} />}
      {withSignup && <Route path="/demo" element={<DemoPage />} />}
    </>
  )
}
```

- [ ] **Step 4: Move the portal, partner and admin routes the same way**

`portalRoutes()` wraps `RequireAuth` + `PortalLayout`. `partnerRoutes()` wraps `RequirePartner` + `PartnerLayout`. `adminRoutes()` contains both the `RequireStaff` + `AdminLayout` tree (including the `placeholderLinks` mapping) and the `RequireAgent` + `AgentLayout` tree. Move verbatim — do not rename routes, reorder them, or change the guards.

- [ ] **Step 5: Reduce App.tsx to composition**

```tsx
// src/App.tsx
import { Suspense, lazy } from 'react'
import { Route, Routes } from 'react-router-dom'
import { SplashScreen } from './components/SplashScreen'
import { MaintenanceBanner } from './components/MaintenanceBanner'
import { marketingRoutes } from './routes/marketingRoutes'
import { authRoutes } from './routes/authRoutes'
import { portalRoutes } from './routes/portalRoutes'
import { partnerRoutes } from './routes/partnerRoutes'
import { adminRoutes } from './routes/adminRoutes'

const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))

export default function App() {
  return (
    <>
      <SplashScreen />
      <MaintenanceBanner />
      <Suspense fallback={null}>
        <Routes>
          {marketingRoutes()}
          {authRoutes()}
          {portalRoutes()}
          {partnerRoutes()}
          {adminRoutes()}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </>
  )
}
```

- [ ] **Step 6: Run the regression net and the full suite**

Run: `npx vitest run src/App.spec.tsx && npx vitest run`
Expected: PASS, all 59 files plus the new one. Any failure here means the move was not verbatim.

- [ ] **Step 7: Verify the build still produces a working bundle**

Run: `npm run build`
Expected: exit 0, no TypeScript errors. `/staging/` is unaffected — nothing has been deployed.

- [ ] **Step 8: Commit**

```bash
git add src/routes src/App.tsx src/App.spec.tsx
git commit -m "refactor(routes): extract route trees into per-surface modules"
```

---

### Task 3: Gate the route modules on VITE_SURFACE

**Files:**
- Modify: `src/App.tsx`
- Test: `src/App.surface.spec.tsx`

**Interfaces:**
- Consumes: `SURFACE`, `isSurface` from `src/lib/surface.ts` (Task 1); the five route functions from Task 2.
- Produces: nothing new. `App` now mounts a subset determined at build time.

- [ ] **Step 1: Write the failing test**

```tsx
// src/App.surface.spec.tsx
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

async function renderWithSurface(surface: string | undefined, path: string) {
  vi.resetModules()
  vi.stubEnv('VITE_SURFACE', surface ?? '')
  const { default: App } = await import('./App')
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

beforeEach(() => vi.resetModules())
afterEach(() => vi.unstubAllEnvs())

describe('surface gating', () => {
  it('unset VITE_SURFACE mounts everything (the pre-split default)', async () => {
    await renderWithSurface(undefined, '/admin/dashboard')
    expect(screen.queryByText(/page not found/i)).toBeNull()
  })

  it('marketing build does NOT mount admin routes', async () => {
    await renderWithSurface('marketing', '/admin/dashboard')
    expect(await screen.findByText(/page not found/i, {}, { timeout: 3000 })).toBeTruthy()
  })

  it('marketing build does NOT mount partner routes', async () => {
    await renderWithSurface('marketing', '/partner/dashboard')
    expect(await screen.findByText(/page not found/i, {}, { timeout: 3000 })).toBeTruthy()
  })

  it('marketing build has no /login — guards must not target it', async () => {
    await renderWithSurface('marketing', '/login')
    expect(await screen.findByText(/page not found/i, {}, { timeout: 3000 })).toBeTruthy()
  })

  it('admin build mounts admin but not marketing home', async () => {
    await renderWithSurface('admin', '/about')
    expect(await screen.findByText(/page not found/i, {}, { timeout: 3000 })).toBeTruthy()
  })

  it('partner build mounts /login and /partner', async () => {
    await renderWithSurface('partner', '/login')
    expect(screen.queryByText(/page not found/i)).toBeNull()
  })

  it('partner build does not mount /register', async () => {
    await renderWithSurface('partner', '/register')
    expect(await screen.findByText(/page not found/i, {}, { timeout: 3000 })).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/App.surface.spec.tsx`
Expected: FAIL — every route currently mounts on every surface, so the "does NOT mount" assertions fail.

- [ ] **Step 3: Add the gating**

```tsx
// src/App.tsx — Routes body only
<Routes>
  {isSurface(SURFACE, 'marketing') && marketingRoutes()}
  {!isSurface(SURFACE, 'marketing') && authRoutes({ withSignup: isSurface(SURFACE, 'portal') })}
  {isSurface(SURFACE, 'all') && authRoutes()}
  {isSurface(SURFACE, 'portal') && portalRoutes()}
  {isSurface(SURFACE, 'partner') && partnerRoutes()}
  {isSurface(SURFACE, 'admin') && adminRoutes()}
  <Route path="*" element={<NotFoundPage />} />
</Routes>
```

Marketing is the only surface with no auth pages — it links to `portal.27markets.com` for sign-in. Every other surface gets `/login`; only `portal` gets `/register` and `/demo`. The `'all'` branch keeps the pre-split behaviour exactly.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/App.surface.spec.tsx`
Expected: PASS, 7 tests

- [ ] **Step 5: Confirm the default build is unchanged**

Run: `npx vitest run && npm run build`
Expected: PASS and exit 0. With `VITE_SURFACE` unset the output must still contain every route — this is what keeps `/staging/` alive.

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx src/App.surface.spec.tsx
git commit -m "feat(build): gate route trees on VITE_SURFACE, default all"
```

---

### Task 4: Bundle isolation gate

**Files:**
- Create: `scripts/check-bundle-isolation.mjs`
- Test: `scripts/check-bundle-isolation.spec.mjs`

**Interfaces:**
- Consumes: a built `dist/` directory and `VITE_SURFACE`.
- Produces: a CLI — `node scripts/check-bundle-isolation.mjs <surface> <distDir>` — exit 0 clean, exit 1 on a leak or an unscannable directory.

This is the task that turns the isolation claim into a fact. Without it the split is a hope about Rollup.

- [ ] **Step 1: Write the failing test**

```js
// scripts/check-bundle-isolation.spec.mjs
import { describe, expect, it } from 'vitest'
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { checkIsolation } from './check-bundle-isolation.mjs'

function fixture(files) {
  const dir = mkdtempSync(join(tmpdir(), 'iso-'))
  mkdirSync(join(dir, 'assets'), { recursive: true })
  for (const [name, body] of Object.entries(files)) {
    writeFileSync(join(dir, 'assets', name), body)
  }
  return dir
}

describe('checkIsolation', () => {
  it('passes when no foreign sentinels are present', () => {
    const dir = fixture({ 'index-abc.js': 'const a="/about";const b="/funding"' })
    expect(checkIsolation('marketing', dir)).toEqual({ ok: true, leaks: [] })
  })

  it('fails when an admin route leaks into the marketing bundle', () => {
    const dir = fixture({ 'index-abc.js': 'const r="admin/withdrawal-requests"' })
    const result = checkIsolation('marketing', dir)
    expect(result.ok).toBe(false)
    expect(result.leaks[0]).toMatch(/withdrawal-requests/)
  })

  it('fails when a partner route leaks into the admin bundle', () => {
    const dir = fixture({ 'index-abc.js': 'const r="partner/commissions"' })
    expect(checkIsolation('admin', dir).ok).toBe(false)
  })

  it('does NOT pass vacuously on an empty directory', () => {
    const dir = fixture({})
    const result = checkIsolation('marketing', dir)
    expect(result.ok).toBe(false)
    expect(result.leaks[0]).toMatch(/no javascript files/i)
  })

  it('skips the check for surface "all"', () => {
    const dir = fixture({ 'index-abc.js': 'const r="admin/withdrawal-requests"' })
    expect(checkIsolation('all', dir)).toEqual({ ok: true, leaks: [] })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run scripts/check-bundle-isolation.spec.mjs`
Expected: FAIL — module not found

- [ ] **Step 3: Write the implementation**

```js
// scripts/check-bundle-isolation.mjs
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Route fragments that belong to exactly one surface. If one appears in a
 * different surface's bundle, tree-shaking did not do what we assumed and the
 * deploy must stop.
 */
const SENTINELS = {
  marketing: ['economic-calendar', 'partner/apply'],
  portal: ['portal/kyc', 'portal/funds'],
  partner: ['partner/commissions', 'partner/sub-partners'],
  admin: ['admin/withdrawal-requests', 'admin/payment-gateways'],
}

function jsFiles(dir) {
  const out = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) out.push(...jsFiles(full))
    else if (entry.endsWith('.js')) out.push(full)
  }
  return out
}

export function checkIsolation(surface, distDir) {
  if (surface === 'all') return { ok: true, leaks: [] }

  const files = jsFiles(distDir)
  if (files.length === 0) {
    return { ok: false, leaks: [`No JavaScript files found under ${distDir} — nothing was scanned`] }
  }

  const foreign = Object.entries(SENTINELS)
    .filter(([name]) => name !== surface)
    .flatMap(([name, patterns]) => patterns.map((p) => [name, p]))

  const leaks = []
  for (const file of files) {
    const body = readFileSync(file, 'utf8')
    for (const [owner, pattern] of foreign) {
      if (body.includes(pattern)) {
        leaks.push(`${pattern} (owned by "${owner}") found in ${file}`)
      }
    }
  }
  return { ok: leaks.length === 0, leaks }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [surface, distDir = 'dist'] = process.argv.slice(2)
  const { ok, leaks } = checkIsolation(surface, distDir)
  if (!ok) {
    console.error(`\n  Bundle isolation FAILED for surface "${surface}":`)
    for (const leak of leaks) console.error(`   - ${leak}`)
    process.exit(1)
  }
  console.log(`  Bundle isolation OK for surface "${surface}"`)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run scripts/check-bundle-isolation.spec.mjs`
Expected: PASS, 5 tests

- [ ] **Step 5: Prove tree-shaking actually works on a real build**

```bash
VITE_SURFACE=marketing npm run build
node scripts/check-bundle-isolation.mjs marketing dist
```

Expected: `Bundle isolation OK for surface "marketing"`.

**If this fails, STOP.** It means Rollup is not eliminating the gated branches and the whole approach needs rethinking before any infrastructure is built. Record the leaking sentinel and report back rather than weakening the sentinels to make it pass.

- [ ] **Step 6: Repeat for the other three surfaces**

```bash
for s in portal partner admin; do
  VITE_SURFACE=$s npm run build && node scripts/check-bundle-isolation.mjs $s dist || break
done
```

Expected: all three report OK. Note each bundle's size — marketing should be markedly smaller than the combined build.

- [ ] **Step 7: Commit**

```bash
git add scripts/check-bundle-isolation.mjs scripts/check-bundle-isolation.spec.mjs
git commit -m "test(build): add bundle isolation gate per surface"
```

---

### Task 5: Cross-host login redirect

**Files:**
- Modify: `src/lib/roles.ts`
- Modify: `src/pages/auth/LoginPage.tsx:51`
- Test: `src/lib/roles.spec.ts`

**Interfaces:**
- Consumes: `SURFACE`, `HOST_FOR_SURFACE`, `Surface` from Task 1; existing `landingPathForRole`, `isStaffRole`, `isPartnerRole`, `isAgentRole`.
- Produces: `surfaceForRole(role: AppRole): Exclude<Surface,'all'>`; `landingUrlForRole(role: AppRole, build?: Surface): string` — a relative path when the role belongs to this build, an absolute `https://host/path` when it does not.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/roles.spec.ts
import { describe, expect, it } from 'vitest'
import { landingUrlForRole, surfaceForRole } from './roles'

describe('surfaceForRole', () => {
  it('maps each role to its surface', () => {
    expect(surfaceForRole('CLIENT')).toBe('portal')
    expect(surfaceForRole('PARTNER')).toBe('partner')
    expect(surfaceForRole('ADMIN')).toBe('admin')
    expect(surfaceForRole('AGENT')).toBe('admin')
  })
})

describe('landingUrlForRole', () => {
  it('returns a relative path when the role belongs to this build', () => {
    expect(landingUrlForRole('ADMIN', 'admin')).toBe('/admin/dashboard')
    expect(landingUrlForRole('AGENT', 'admin')).toBe('/agent/dashboard')
    expect(landingUrlForRole('PARTNER', 'partner')).toBe('/partner/dashboard')
    expect(landingUrlForRole('CLIENT', 'portal')).toBe('/portal/dashboard')
  })

  it('returns a relative path on the combined "all" build', () => {
    expect(landingUrlForRole('PARTNER', 'all')).toBe('/partner/dashboard')
    expect(landingUrlForRole('ADMIN', 'all')).toBe('/admin/dashboard')
  })

  it('returns an absolute URL when the role belongs elsewhere', () => {
    expect(landingUrlForRole('CLIENT', 'admin')).toBe(
      'https://portal.27markets.com/portal/dashboard',
    )
    expect(landingUrlForRole('PARTNER', 'admin')).toBe(
      'https://partners.27markets.com/partner/dashboard',
    )
    expect(landingUrlForRole('ADMIN', 'partner')).toBe(
      'https://admin.27markets.com/admin/dashboard',
    )
  })

  it('never returns a URL pointing back at the build it was called from', () => {
    for (const build of ['portal', 'partner', 'admin'] as const) {
      for (const role of ['CLIENT', 'PARTNER', 'ADMIN', 'AGENT'] as const) {
        const url = landingUrlForRole(role, build)
        if (url.startsWith('https://')) {
          expect(url.startsWith(`https://${build}`)).toBe(false)
        }
      }
    }
  })
})
```

The last test is the infinite-redirect guard: if a mismatched role were ever sent back to the host it just came from, the two hosts would bounce the user between them forever.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/roles.spec.ts`
Expected: FAIL — `landingUrlForRole` is not exported

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/roles.ts — append
import { HOST_FOR_SURFACE, SURFACE, type Surface } from './surface'

/** Which surface's build contains this role's pages. AGENT lives in admin. */
export const surfaceForRole = (role: AppRole): Exclude<Surface, 'all'> => {
  if (isPartnerRole(role)) return 'partner'
  if (isStaffRole(role)) return 'admin'
  return 'portal'
}

/**
 * Where to send a user after login.
 * Same-surface roles get a relative path (no page reload). A role belonging to
 * another host gets an absolute URL, because its routes do not exist here.
 */
export const landingUrlForRole = (role: AppRole, build: Surface = SURFACE): string => {
  const path = landingPathForRole(role)
  const target = surfaceForRole(role)
  if (build === 'all' || build === target) return path
  return `${HOST_FOR_SURFACE[target]}${path}`
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/roles.spec.ts`
Expected: PASS, 5 tests

- [ ] **Step 5: Use it in LoginPage**

Replace the navigation at `src/pages/auth/LoginPage.tsx:51`:

```tsx
const dest = landingUrlForRole(user.role)
if (dest.startsWith('https://')) {
  window.location.replace(dest)
} else {
  navigate(dest, { replace: true })
}
```

Import `landingUrlForRole` alongside the existing `landingPathForRole` import. Leave `landingPathForRole` exported — the guards still use it.

- [ ] **Step 6: Make the IB aliases cross-host on the marketing build**

`/ib-portal` and `/ibpartner` live in `marketingRoutes()` and currently
`<Navigate>` to `/partner/dashboard`. That route does not exist in the marketing
build, so on `27markets.com` both aliases would land on the 404 page. They must
leave for the partner host instead.

Write the failing test first:

```tsx
// src/routes/marketingRoutes.spec.tsx
import { describe, expect, it, vi, afterEach } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ExternalRedirect } from './ExternalRedirect'

afterEach(() => vi.restoreAllMocks())

describe('ExternalRedirect', () => {
  it('sends the browser to the absolute URL', () => {
    const replace = vi.fn()
    vi.stubGlobal('location', { replace } as unknown as Location)
    render(
      <MemoryRouter initialEntries={['/ib-portal']}>
        <Routes>
          <Route
            path="/ib-portal"
            element={<ExternalRedirect to="https://partners.27markets.com/partner/dashboard" />}
          />
        </Routes>
      </MemoryRouter>,
    )
    expect(replace).toHaveBeenCalledWith('https://partners.27markets.com/partner/dashboard')
  })
})
```

Run: `npx vitest run src/routes/marketingRoutes.spec.tsx` — expect FAIL, module not found.

Then implement:

```tsx
// src/routes/ExternalRedirect.tsx
import { useEffect } from 'react'

/** Leaves the SPA entirely. For routes that live on another host. */
export function ExternalRedirect({ to }: { to: string }) {
  useEffect(() => {
    window.location.replace(to)
  }, [to])
  return null
}
```

In `marketingRoutes.tsx`, replace both alias routes:

```tsx
import { HOST_FOR_SURFACE } from '../lib/surface'
import { ExternalRedirect } from './ExternalRedirect'

const IB_DASHBOARD = `${HOST_FOR_SURFACE.partner}/partner/dashboard`

<Route path="/ib-portal" element={<ExternalRedirect to={IB_DASHBOARD} />} />
<Route path="/ibpartner" element={<ExternalRedirect to={IB_DASHBOARD} />} />
```

Run: `npx vitest run src/routes/marketingRoutes.spec.tsx` — expect PASS.

This changes behaviour on the `all` build too: `/staging/ib-portal` will now jump to `partners.27markets.com` rather than routing internally. That host does not exist until Task 7, so **do not deploy between this task and Task 7** — the alias would dead-end. The aliases are unlinked convenience URLs, so nothing in the UI depends on them meanwhile.

- [ ] **Step 7: Run the full suite**

Run: `npx vitest run`
Expected: PASS. Apart from the two aliases above, the default `all` build returns the same relative paths as before, so `/staging/` behaviour is unchanged.

- [ ] **Step 8: Commit**

```bash
git add src/lib/roles.ts src/lib/roles.spec.ts src/pages/auth/LoginPage.tsx \
  src/routes/ExternalRedirect.tsx src/routes/marketingRoutes.tsx \
  src/routes/marketingRoutes.spec.tsx
git commit -m "feat(auth): redirect to the correct host when role and surface differ"
```

---

### Task 6: Parameterize the deploy script

**Files:**
- Modify: `scripts/deploy-frontend.sh`

**Interfaces:**
- Consumes: `checkIsolation` CLI from Task 4.
- Produces: a script taking `SURFACE`, `S3_BUCKET`, `CF_DISTRIBUTION_ID`; refuses to deploy a bundle that fails isolation.

- [ ] **Step 1: Add the surface parameter and the gate**

Insert after the existing `CF_DISTRIBUTION_ID` guard:

```bash
: "${SURFACE:?Set SURFACE (marketing|portal|partner|admin|all)}"
export VITE_SURFACE="$SURFACE"
echo "==> Building surface: $SURFACE"
```

Then, immediately after `npm run build` and **before** the first `aws s3 sync`:

```bash
echo "==> Verifying bundle isolation"
node scripts/check-bundle-isolation.mjs "$SURFACE" dist
```

The script already runs under `set -euo pipefail`, so a non-zero exit here aborts before anything reaches S3. That ordering is the whole point: a leaking bundle must never be published.

- [ ] **Step 2: Verify the script still works for the current deployment**

```bash
SURFACE=all S3_BUCKET=27markets-frontend CF_DISTRIBUTION_ID=E19DRXVNFKYHB4 \
  bash -n scripts/deploy-frontend.sh && echo "syntax OK"
```

Expected: `syntax OK`. `bash -n` parses without executing — this must not deploy anything yet.

- [ ] **Step 3: Dry-run the build half only**

```bash
SURFACE=admin npm run build && node scripts/check-bundle-isolation.mjs admin dist
```

Expected: isolation OK. Nothing is uploaded.

- [ ] **Step 4: Commit**

```bash
git add scripts/deploy-frontend.sh
git commit -m "feat(deploy): build per surface and gate on bundle isolation"
```

---

### Task 7: Infrastructure — DNS, certificate, buckets, distributions

**Files:**
- Create: `docs/DEPLOYMENT-hosts.md` (runbook; the AWS changes themselves are console/CLI operations, not code)

No application code changes. `/staging/` is untouched throughout.

- [ ] **Step 1: Request the ACM certificate**

```bash
aws acm request-certificate --region us-east-1 \
  --domain-name 27markets.com \
  --subject-alternative-names www.27markets.com preview.27markets.com \
     portal.27markets.com partners.27markets.com admin.27markets.com \
  --validation-method DNS
```

Record the certificate ARN. **Region must be `us-east-1`** — CloudFront reads certificates from nowhere else, and a certificate in `eu-north-1` will simply not appear in the distribution's dropdown.

- [ ] **Step 2: Add the DNS validation records at Namecheap**

`aws acm describe-certificate --region us-east-1 --certificate-arn <arn>` lists one CNAME per name. Add all six. Validation typically completes in 5–30 minutes; poll with the same command until `Status: ISSUED`.

- [ ] **Step 3: Create one S3 bucket per surface**

`27markets-preview`, `27markets-portal`, `27markets-partners`, `27markets-admin`. Private, with Origin Access Control, matching the existing `27markets-frontend` configuration. `27markets-frontend` keeps serving the holding page on the apex.

- [ ] **Step 4: Create four CloudFront distributions**

One each for `preview`, `portal`, `partners`, `admin`. For each: the matching bucket as OAC origin, the new certificate, the hostname as an alternate domain name, and a 403/404 → `/index.html` (200) custom error response for SPA routing — copy the existing distribution's error-response config exactly.

Leave the apex distribution `E19DRXVNFKYHB4` **completely alone**. It is serving the live holding page and `/staging/`.

- [ ] **Step 5: Create four CSP response-headers policies**

Copy `27markets-security-csp` (`06e0f25d-0141-43aa-a041-20738f6f0756`) once per surface. For each, build the surface, read the inline `<script>` blocks from its `dist/index.html`, compute `sha256` over the exact bytes between `<script>` and `</script>`, base64 them, and pin those hashes. Admin additionally drops the Google Analytics hosts from `script-src` and `connect-src`.

A wrong hash does not error visibly — the page renders blank or features silently stop. Verify each with a real page load and a clean console before announcing that host.

- [ ] **Step 6: Add the DNS CNAMEs**

Four CNAMEs at Namecheap pointing each hostname at its distribution domain. Apex and `www` unchanged.

- [ ] **Step 7: Write the runbook**

Record in `docs/DEPLOYMENT-hosts.md`: every bucket name, distribution ID, policy ID, the certificate ARN, and the per-surface deploy command. Future sessions need this the way `deployment-live.md` is needed today.

- [ ] **Step 8: Commit**

```bash
git add docs/DEPLOYMENT-hosts.md
git commit -m "docs: runbook for per-surface hosts and distributions"
```

---

### Task 8: Backend CORS origins

**Files:**
- Modify: EC2 `~/app/.env.production` (not in the repo)
- Modify: `.env.example`

- [ ] **Step 1: Extend CLIENT_ORIGIN on the EC2 host**

SSH in and append the four new origins to the existing comma-separated value. **Keep `https://27markets.com`** in the list — `/staging/` is served from it and must keep working.

```
CLIENT_ORIGIN=https://27markets.com,https://www.27markets.com,https://preview.27markets.com,https://portal.27markets.com,https://partners.27markets.com,https://admin.27markets.com
```

- [ ] **Step 2: Restart the API and verify**

```bash
cd ~/app && docker compose --env-file .env.production -f docker-compose.prod.yml up -d
curl -sS -o /dev/null -w "%{http_code}\n" https://api.27markets.com/api/health
```

Expected: `200`.

- [ ] **Step 3: Verify the existing deployment still works**

Load `27markets.com/staging/login` and sign in. Expected: succeeds exactly as before. A CORS regression here would break the live system — this check is the point of the task.

- [ ] **Step 4: Mirror the list in .env.example and commit**

```bash
git add .env.example
git commit -m "chore(config): document the per-surface CLIENT_ORIGIN list"
```

---

### Task 9: Deploy, verify, and retire /staging/

**Files:** none — deployment and verification only.

- [ ] **Step 1: Deploy the three private surfaces**

```bash
SURFACE=portal   S3_BUCKET=27markets-portal   CF_DISTRIBUTION_ID=<id> bash scripts/deploy-frontend.sh
SURFACE=partner  S3_BUCKET=27markets-partners CF_DISTRIBUTION_ID=<id> bash scripts/deploy-frontend.sh
SURFACE=admin    S3_BUCKET=27markets-admin    CF_DISTRIBUTION_ID=<id> bash scripts/deploy-frontend.sh
```

- [ ] **Step 2: Verify each host end to end**

For `portal`, `partners` and `admin`: the host loads over HTTPS with no certificate warning; the browser console shows zero CSP violations; login succeeds; a deep link to a foreign route (e.g. `admin.27markets.com/partner/dashboard`) renders the 404 page rather than the partner dashboard; and signing in with a mismatched role redirects to the correct host and stops there.

- [ ] **Step 3: Deploy the marketing preview**

```bash
SURFACE=marketing S3_BUCKET=27markets-preview CF_DISTRIBUTION_ID=<id> bash scripts/deploy-frontend.sh
```

Verify `preview.27markets.com` renders the full marketing site and that `27markets.com` **still shows Coming Soon**.

- [ ] **Step 4: Owner sign-off**

Hand the owner the four URLs. Do not proceed to Step 5 until they confirm.

- [ ] **Step 5: Retire /staging/**

Only after every host above is verified and signed off:

```bash
aws s3 rm s3://27markets-frontend/staging --recursive
aws cloudfront create-invalidation --distribution-id E19DRXVNFKYHB4 --paths "/staging/*"
```

The holding page at the apex is untouched. If anything is wrong, the previous steps are all additive and reversible — nothing before this one removed anything.

- [ ] **Step 6: Update the deployment memory**

Record the new hosts, bucket names, distribution IDs and policy IDs in the auto-memory `deployment-live.md`, and mark `/staging/` as retired so a future session doesn't look for it.

---

## Notes for the implementer

The riskiest step in this plan is **Task 4 Step 5** — the first real proof that Rollup eliminates the gated route trees. Everything after it assumes that works. If it fails, stop and report rather than weakening the sentinel list to get a green result; a passing isolation check that proves nothing is worse than no check, because it will be trusted.

The second riskiest is **Task 7 Step 5**, the CSP hashes. They fail silently. Always verify with a real page load.
