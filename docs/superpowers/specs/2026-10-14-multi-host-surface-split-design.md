# Multi-Host Surface Split — Design

Date: 2026-10-14
Status: awaiting review

## Problem

The whole platform ships as one SPA on one CloudFront distribution. Every
visitor — including anonymous ones who only wanted the marketing site —
downloads the entire bundle: the client portal, the IB partner portal, and all
~50 admin CRM routes. The route names, form field names and API shapes of the
back office are readable in the JavaScript by anyone who opens devtools.

Because the public root currently serves a Coming Soon holding page, the real
app is parked at `27markets.com/staging/`. That prefix is not an environment —
it is a workaround for the occupied root. It also means the only URL we can give
an IB partner is `27markets.com/staging/partner/dashboard`.

Two goals, stated by the owner:

1. **Branded URLs** — a partner or staff member should get a hostname that reads
   like a product, not a path prefix.
2. **Security isolation** — admin and partner code must not be served to the
   public.

Goal 2 is the binding constraint. Pointing extra hostnames at the existing
bundle satisfies goal 1 alone and is explicitly rejected below.

## Decisions

- **Four surfaces, four builds.** `marketing`, `portal`, `partner`, `admin`.
  One codebase; the surface is chosen at build time and the other three route
  trees are eliminated by the bundler.
- **Six DNS names, five distributions, four builds.** The three logged-in
  surfaces are already private (login gated, unlinked, SIMULATION mode), so they
  need no staging twin. Only marketing needs a hidden variant, because its
  public URL is occupied by the holding page.
- **Isolation is tested, not asserted.** Each build is grepped for route strings
  belonging to other surfaces; a hit fails the build.
- **One CloudFront distribution per hostname group**, not a single distribution
  with a host-routing function, so each surface carries its own
  Content-Security-Policy.
- **No second API or database.** One backend keeps serving all surfaces. The
  split is frontend-only.
- `/staging/` is retired once the four hosts are live.

### Why not the alternatives

**Monorepo split** (`apps/marketing`, `apps/portal`, …, `packages/shared`) gives
structural isolation rather than isolation that depends on tree-shaking, and
independent deploys come free. It is the better long-term shape. It is rejected
*now* because it rewrites every import path in a working, pre-launch codebase
and would rewire the test suites and CI for a benefit this design already
achieves by a cheaper route. Approach A does not block it later.

**One bundle on four hostnames** is an afternoon of work and delivers the
branded URLs, but every visitor still downloads the admin code. It fails goal 2
outright.

**Full staging mirror** (eight hostnames, eight builds) is the correct shape
after launch, when production holds real client money. Today production is
behind a holding page and runs in SIMULATION, so a staging twin of a surface
nobody can reach is duplicated infrastructure with no reviewer benefit.

## Hostnames

| Host | Surface | Visibility |
|---|---|---|
| `27markets.com`, `www.27markets.com` | marketing | public — Coming Soon until launch |
| `preview.27markets.com` | marketing | private — owner sign-off |
| `portal.27markets.com` | client portal | login gated |
| `partners.27markets.com` | IB partner portal | login gated |
| `admin.27markets.com` | admin + agent CRM | login gated |

Pre-launch the apex and `www` serve the Coming Soon holding page while `preview`
serves the real marketing build. That is different content, so they are
different distributions over different buckets — not one distribution with two
names. At launch the apex distribution is repointed at the marketing bucket and
`preview` either retires or becomes the first real staging host. Nothing else
moves.

## Route allocation

Each surface build contains only these routes. `*` denotes the existing nested
children, unchanged.

**marketing** — `/`, `/about`, `/markets`, `/platforms`, `/accounts`,
`/conditions`, `/funding`, `/trust`, `/faq`, `/economic-calendar`,
`/partnership`, `/contact`, `/blog`, `/blog/:slug`, `/partner/apply`,
`/disclaimer`, `/legal/:doc`. No login, no authenticated routes.

**portal** — `/login`, `/register`, `/demo`, `/verify-email`,
`/forgot-password`, `/reset-password`, `/portal/*`.

**partner** — `/login`, `/partner/*`. No `/register`: partners are onboarded via
`/partner/apply` on the marketing site and approved in the CRM.

**admin** — `/login`, `/admin/*`, `/agent/*`.

`/login` is present in three builds. It is a small component and duplicating it
is cheaper than a central auth host, which would reintroduce a cross-host
redirect on every sign-in.

The `/ib-portal` and `/ibpartner` aliases move to the marketing build and become
external redirects to `https://partners.27markets.com`.

## Build-time surface selection

A new env var drives the build:

```
VITE_SURFACE = marketing | portal | partner | admin
```

Vite replaces `import.meta.env.VITE_SURFACE` with a string literal at build
time. Guarding each route module behind a comparison against that literal lets
Rollup prove the other branches unreachable and drop them, along with their
`lazy()` imports and the chunks those would have produced.

`src/App.tsx` splits into:

```
src/routes/marketingRoutes.tsx
src/routes/portalRoutes.tsx
src/routes/partnerRoutes.tsx
src/routes/adminRoutes.tsx
src/routes/index.tsx     — selects one by VITE_SURFACE
```

Route definitions move verbatim. Guards (`RequirePartner` and its siblings),
layouts and page components are untouched. Shared code — `src/lib/api.ts`,
`AuthContext`, `src/lib/roles.ts`, `src/components/ui/*` — stays exactly where
it is and is imported by whichever surfaces need it.

## Cross-surface login redirect

`landingPathForRole()` in `src/lib/roles.ts` currently returns a path. With
surfaces split, a path is no longer sufficient: a CLIENT who signs in on
`admin.27markets.com` cannot be sent to `/portal/dashboard`, because that route
does not exist in the admin build.

It gains a companion that returns an absolute URL when the role does not belong
to the current surface:

```
landingUrlForRole(role, currentSurface) -> string
```

Same-surface roles keep returning a relative path, so nothing changes for the
common case. Mismatched roles get a full `https://<host>/<path>` redirect. The
surface→host map is a single constant, read from env so local development and
production differ without code changes.

This also replaces today's silent in-app redirect, which sends a non-partner
hitting `/partner/dashboard` to `/portal/dashboard` with no explanation.

## Isolation test

The claim "admin code is not in the public bundle" must be verifiable on every
deploy, not assumed from bundler behaviour.

After each build, a script scans `dist/` for route strings owned by other
surfaces — `admin/withdrawal-requests`, `partner/commissions`,
`portal/kyc` and similar sentinels, one per foreign surface. Any hit exits
non-zero and fails the deploy.

This runs in `deploy-frontend.sh` before the S3 sync, so a regression in
tree-shaking (a stray eager import, a barrel file pulling in a sibling route
module) stops the deploy rather than silently shipping the admin surface to the
public site. It is the single most important test in this design: without it,
goal 2 is a hope.

## Infrastructure

**DNS (Namecheap).** Four new CNAMEs — `preview`, `portal`, `partners`,
`admin` — each pointing at its CloudFront distribution domain. The apex and
`www` records are unchanged.

**TLS.** One ACM certificate in `us-east-1` (CloudFront requires that region)
covering all six names: `27markets.com`, `www.27markets.com`,
`preview.27markets.com`, `portal.27markets.com`, `partners.27markets.com`,
`admin.27markets.com`. DNS validation. ACM auto-renews, unlike the EC2
certificate — see the TLS warning in the deployment memory.

**S3.** One bucket per surface. Prefer separate buckets over prefixes within one
bucket: a misconfigured prefix is a plausible way to leak the admin build, a
wrong bucket is not. The existing `27markets-frontend` bucket keeps the holding
page for the apex until launch.

**CloudFront.** Five distributions — apex + `www` (holding page), `preview`,
`portal`, `partners`, `admin`. Each app distribution gets its own SPA
404→`index.html` fallback, matching the current setup; the holding-page
distribution needs none.

**CSP.** The existing response-headers policy
`06e0f25d-0141-43aa-a041-20738f6f0756` pins sha256 hashes of three inline
scripts in `index.html`. Each surface has a different set of inline scripts —
marketing carries GA and the Organization JSON-LD, admin needs neither — so one
shared policy would white-screen at least three of the four surfaces. Each
distribution gets its own policy with its own hashes. Admin additionally drops
the GA hosts from `script-src` and `connect-src`.

This is the most likely thing to break silently and the hardest to diagnose, so
each policy is verified against a real page load before the surface is announced.

## Backend changes

Two, both configuration:

- `CLIENT_ORIGIN` in the EC2 `.env.production` gains the four new origins. It is
  already a comma-separated list consumed at `server/src/main.ts:40`.
- No cookie changes. `server/src/auth/cookies.ts:25` already sets
  `sameSite: 'none'` with `secure` in production, because the API has always
  been cross-origin from the frontend. Additional frontend origins need nothing
  further.

No route, guard, or role-checking change anywhere in the backend. The server
continues to authorize by role, not by hostname — hostname isolation is defence
in depth, not the access control itself.

## Deploy script

`scripts/deploy-frontend.sh` gains a surface parameter and is run four times:

```
SURFACE=admin S3_BUCKET=27markets-admin CF_DISTRIBUTION_ID=E... \
  ./scripts/deploy-frontend.sh
```

It exports `VITE_SURFACE`, builds, runs the isolation test, then syncs and
invalidates exactly as it does today. The existing cache-control tiers —
immutable for `assets/`, short TTL for unhashed files, no-store for
`index.html` — carry over unchanged.

## Testing

- **Unit:** `landingUrlForRole()` across every role × surface combination,
  including the mismatches that produce absolute URLs.
- **Build:** the isolation scan, per surface — the deploy gate described above.
- **Build:** each surface produces a bundle smaller than today's combined one;
  marketing should drop substantially.
- **Manual, per surface before announcing:** page renders, no CSP violations in
  the console, login succeeds, a wrong-role login redirects to the correct host,
  and a deep link to a foreign route 404s rather than rendering.

## Launch cutover

Until licensing completes, `27markets.com` and `www` keep serving Coming Soon.
The three logged-in hosts go live immediately — they are private by nature — and
`preview.27markets.com` carries the marketing site for owner review.

At launch, the apex distribution switches to the real marketing build. No DNS
change, no certificate change, no redeploy of the other three surfaces.

## Out of scope / future work

- Monorepo restructure. Revisit if independent deploy cadence becomes a real
  constraint.
- A true staging tier with its own API and database. Needed once production
  holds real client funds; pointless while production is behind a holding page.
- Edge access control on `admin.27markets.com` (IP allowlist or WAF). Worth
  doing before going live with real money, but it is a separate change and does
  not block this one.
- Password protection on `preview.27markets.com`. The URL is unlisted; add basic
  auth at the edge if the owner wants more than obscurity.
