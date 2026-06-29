# Partner/IB Portal — Phase 2: Partner Portal + Dashboard — Design Spec

- **Date:** 2026-06-29
- **Status:** Approved (pending spec review)
- **Project:** B (Full IB/Partner portal), **Phase 2 of 5**
- **Depends on:** Phase 1 (PARTNER role, `PartnerProfile.referralCode`, `User.referredByPartnerId`/`referredClients`) — merged.
- **Later phases (separate specs):** 3 = configurable commission engine · 4 = two-tier overrides · 5 = partner payouts.

## 1. Goal

Give approved partners an authenticated `/partner/*` portal — a charted dashboard, a referred-clients list, and referral tools (shareable link + QR) — all scoped to the logged-in partner's own data. Mirrors the existing `/admin` structure and reuses the Recharts components. No commission yet (Phase 3); earnings appear as a "coming soon" placeholder.

## 2. Decisions (locked during brainstorming)

- Pages: **Dashboard + Referred Clients + Referral Tools** (3 pages).
- Earnings: **referral metrics + a greyed "Commission — available soon" card** (Phase-3-ready layout).
- Login redirect: **role-based** — CLIENT→`/portal`, PARTNER→`/partner`, ADMIN/AGENT→`/admin`.
- Referral Tools includes a **QR code** of the referral link (adds `qrcode.react`).
- Seed a **demo partner** `partner@27markets.io` / `Partner123!` with ~15–20 linked referred clients.

## 3. Non-Goals (out of scope for Phase 2)

- Commission config/accrual/balances (Phase 3); two-tier (Phase 4); payouts (Phase 5).
- Editing partner profile/bank details; marketing banner assets beyond a copyable link + text + QR.
- Any change to client `/portal` or staff `/admin` feature set (only the shared login-redirect is touched).

## 4. Backend (extend the `partners` module)

New `PartnerPortalController` — `@UseGuards(RolesGuard)`, `@Roles(UserRole.PARTNER)`, `@Controller('partner')`. All methods key off `@CurrentUser('id')` (the partner's user id). Add methods to `PartnersService` (or a new `PartnerPortalService` in the same module — implementer's call, kept in `partners/`).

### 4.1 `GET /partner/dashboard`
```ts
interface PartnerDashboard {
  referralCode: string
  kpis: {
    totalReferred: { value: number; delta: number | null; spark: number[] }
    kycVerified:   { value: number; spark: number[] }   // referred clients fully KYC-approved
    signups30d:    { value: number; delta: number | null; spark: number[] }
  }
  series: { date: string; signups: number }[]            // 90 days, referred-client signups/day, zero-filled
  kycDistribution: Record<'NOT_SUBMITTED'|'PENDING'|'APPROVED'|'REJECTED', number>
  recentReferrals: { id: string; name: string; email: string; country: string | null; kyc: 'NOT_SUBMITTED'|'PENDING'|'APPROVED'|'REJECTED'; createdAt: string }[]
}
```
- Built from `User where referredByPartnerId = <me>`. Reuse the Phase-A daily-bucketing/`computeDelta`/`sparkFromSeries` helpers (`admin-dashboard.util.ts`) and `kycStatusOf` for the KYC tally — import them; do not duplicate.
- `delta` = current vs previous half-window (same rule as the admin dashboard); `null` when previous is 0.

### 4.2 `GET /partner/clients`
Returns the partner's referred clients: `{ id, name, email, country, kyc, createdAt }[]`, newest first, capped at 200.

### 4.3 `GET /partner/profile`
Returns `{ referralCode, referralLink }` where `referralLink = ${CLIENT_ORIGIN}/register?ref=<code>`. Lightweight source for the Tools page.

### 4.4 Edge cases
- A PARTNER with no `PartnerProfile` is not expected (created at approval). If absent, return 404 `Partner profile not found` (don't auto-create). Tests cover the normal case.

## 5. Frontend

- **`RequirePartner`** (`src/components/partner/RequirePartner.tsx`) — mirrors `RequireStaff`: `loading` → spinner; unauth → `/login`; non-PARTNER → CLIENT to `/portal/dashboard`, staff to `/admin`. Uses a `isPartnerRole`/`role === 'PARTNER'` check.
- **`PartnerLayout`** (`src/layouts/PartnerLayout.tsx`) + **`PartnerSidebar`** (`src/components/partner/PartnerSidebar.tsx`) + **`partnerNav`** (`src/components/partner/partnerNav.ts`) — mirror `AdminLayout`/`AdminSidebar`/`adminNav`. Nav: Dashboard, Referred Clients, Referral Tools.
- **Routes** in `App.tsx`: a `/partner` group wrapped in `RequirePartner` + `PartnerLayout`; `index`→`/partner/dashboard`; `dashboard`, `clients`, `tools`.
- **Pages** (`src/pages/partner/`):
  - `PartnerDashboardPage` — KPI sparkline cards (Total Referred, KYC-Verified, Signups 30d, + a greyed **"Commission — available soon"** card), a referred-signups **area chart**, a **KYC-status donut**, a recent-referrals table, and a referral-link widget. Reuse `KpiSparkCard`, `FunnelDonut`, and the area chart from `src/components/admin/charts/` (import in place; a future shared move is out of scope).
  - `PartnerClientsPage` — table: client, email, country, KYC `Badge`, joined. Loading/error/empty states like `AdminKycPage`.
  - `PartnerReferralToolsPage` — the referral link + copy button + pre-written share text + a **QR code** (`qrcode.react` `QRCodeSVG value={referralLink}`).
- **`partnerApi`** (`src/lib/partnerApi.ts`) — `getDashboard()`, `getClients()`, `getProfile()` + types.
- **Login redirect by role** — central helper `landingPathForRole(role)` (`src/lib/roles.ts`): CLIENT→`/portal/dashboard`, PARTNER→`/partner/dashboard`, ADMIN|AGENT→`/admin/dashboard`. Use it in the login success path (`LoginPage`/`AuthContext`) and replace the post-register hardcoded `/portal/dashboard` only where role-appropriate (new registrations are CLIENT → `/portal`, unchanged).

## 6. Seed

Extend `server/prisma/seed.ts` (idempotent): create `partner@27markets.io` / `Partner123!` as `role=PARTNER` with a `PartnerProfile` (fixed referral code e.g. `DEMO27IB`); set `referredByPartnerId` on ~15–20 of the existing `demo.client+` users (spread `createdAt`) so the partner dashboard and clients list are populated. Guard so re-running doesn't duplicate.

## 7. Data Flow

```
Login (PARTNER) → landingPathForRole → /partner/dashboard
RequirePartner (role gate) → PartnerLayout → PartnerDashboardPage
  → partnerApi.getDashboard() → KPIs + signups chart + KYC donut + recent referrals + link
Referred Clients → partnerApi.getClients()
Referral Tools → partnerApi.getProfile() → link + copy + share text + QR
```

## 8. Error Handling

- All `/partner/*` endpoints: 401 if unauthenticated (global JwtAuthGuard), 403 if not PARTNER (RolesGuard). 404 if the partner has no profile.
- Frontend pages: `ErrorState` + retry, `SkeletonRows`/`SkeletonCard` loading, `EmptyState` when a partner has zero referrals (dashboard still renders with zeros).

## 9. Testing

- **Backend:** dashboard returns only the caller's referred clients (scoping test with two partners); 90-day zero-filled series; KYC tally; clients list; profile link format; RBAC (PARTNER 200; CLIENT/ADMIN/AGENT → 403). Reuse of util helpers asserted by correct output, not re-testing the helpers.
- **Frontend:** `RequirePartner` redirects (unauth→login; CLIENT→/portal; PARTNER passes); `PartnerDashboardPage` renders KPIs/chart/donut/“Commission — available soon” from a mocked payload; `PartnerClientsPage` lists clients; `PartnerReferralToolsPage` shows the link + copies it + renders a QR; `landingPathForRole` returns the right path per role.

## 10. Risks / Notes

- Reusing `admin/charts` components from a partner page is a cross-area import; acceptable for Phase 2. A future refactor could move shared charts to `src/components/charts/` (out of scope, noted).
- `qrcode.react` is a small, well-maintained dependency; QR rendered as inline SVG (no network).
- The dashboard payload deliberately parallels the admin dashboard shape so Phase 3 can graft commission KPIs without restructuring.
