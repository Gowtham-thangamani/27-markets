# Partner/IB Portal — Phase 1: Foundation & Onboarding — Design Spec

- **Date:** 2026-06-29
- **Status:** Approved (pending spec review)
- **Project:** B (Full IB/Partner portal), **Phase 1 of 5**
- **Later phases (separate specs):** 2 = partner portal + dashboard · 3 = configurable commission engine (single-tier) · 4 = two-tier overrides · 5 = partner payouts

## 1. Problem / Goal

`PARTNER` is a role with no data or flow behind it. Phase 1 builds the **referral foundation**: a public partner application, an admin approval that mints a PARTNER account + unique referral code + set-password invite, and referral attribution when a referred client registers. After Phase 1 the broker has a working referral system; the partner-facing portal, commissions, tiers, and payouts come in later phases.

## 2. Decisions (locked during brainstorming)

- Commission model (later phases): **configurable per partner** — Phase 1 builds none of it but leaves room (`PartnerProfile` is a model, not User fields).
- Onboarding: **apply → admin approves**. Approval **creates** the PARTNER account and issues a **set-password invite** (no pre-existing account required).
- Tiers (later): **two-tier** — Phase 1 leaves room (`parentPartnerId` added in Phase 4, not now).
- Apply form lives on a **dedicated `/partner/apply`** public page.
- Application form collects **standard fields**: name, email, phone, country, company/brand, website, audience/how-they-promote.

## 3. Non-Goals (out of scope for Phase 1)

- Any `/partner/*` authenticated portal UI or dashboard (Phase 2).
- Commission config, accrual, or balances (Phase 3); two-tier overrides (Phase 4); payouts (Phase 5).
- A live email server. Emails remain best-effort (as today); the **invite link is surfaced in the CRM** so onboarding works without email delivery.
- Editing/withdrawing a submitted application by the applicant.

## 4. Data Model (Prisma)

```prisma
enum PartnerApplicationStatus { PENDING APPROVED REJECTED }

model PartnerApplication {
  id            String                   @id @default(cuid())
  firstName     String
  lastName      String
  email         String
  phone         String?
  country       String?
  company       String?
  website       String?
  audience      String?                  // free text: how they'll promote / audience size
  status        PartnerApplicationStatus @default(PENDING)
  notes         String?                  // admin note on review
  reviewedAt    DateTime?
  reviewedById  String?
  reviewedBy    User?                    @relation("PartnerAppReviewer", fields: [reviewedById], references: [id])
  resultingUserId String?                @unique
  resultingUser User?                    @relation("PartnerAppResult", fields: [resultingUserId], references: [id])
  createdAt     DateTime                 @default(now())
  @@index([status])
}

model PartnerProfile {
  id           String   @id @default(cuid())
  userId       String   @unique
  user         User     @relation("UserPartnerProfile", fields: [userId], references: [id], onDelete: Cascade)
  referralCode String   @unique
  createdAt    DateTime @default(now())
  // Phase 3 adds commission config; Phase 4 adds parentPartnerId.
}
```

User model additions:
- `partnerProfile PartnerProfile? @relation("UserPartnerProfile")`
- `referredByPartnerId String?` + `referredByPartner User? @relation("PartnerReferrals", fields: [referredByPartnerId], references: [id])`
- `referredClients User[] @relation("PartnerReferrals")`
- Back-relations for the two `PartnerApplication` relations (`PartnerAppReviewer`, `PartnerAppResult`).
- `VerificationTokenType` enum gains **`PARTNER_INVITE`**.

Migration: one new migration; all additions are nullable/new tables (no backfill).

## 5. Backend (new `partners` module)

### 5.1 Public
- `POST /partners/apply` — `@Public()`, throttled (mirror the public lead/contact throttle). Body validated by `ApplyPartnerDto` (Zod/class-validator like existing DTOs). Creates a `PENDING` `PartnerApplication`. Returns `{ ok: true }`. Does **not** reveal whether the email already exists (avoid enumeration).

### 5.2 Admin (CRM)
- `GET /admin/partner-applications?status=` — STAFF (ADMIN+AGENT) read; list newest first.
- `POST /admin/partner-applications/:id/approve` — **ADMIN only**. In one Prisma transaction:
  1. Guard: application exists and is `PENDING` (else 400).
  2. If a User with that email already exists → 409 (admin resolves manually); do not silently promote.
  3. Create `User(role=PARTNER, status=ACTIVE, emailVerified=true)` with a random argon2 password hash (unknown to anyone).
  4. Create `PartnerProfile` with a generated **unique** `referralCode`.
  5. Issue a `PARTNER_INVITE` verification token (7-day TTL) via the existing `issueVerificationToken`.
  6. Mark the application `APPROVED`, set `reviewedAt/reviewedById/resultingUserId`.
  7. Audit `partner.application.approve`.
  - Returns `{ ok, referralCode, inviteUrl }` where `inviteUrl = ${CLIENT_ORIGIN}/reset-password?token=RAW` (reuses the existing set-password page). Best-effort `email.sendPartnerInvite` may be added but the URL is always returned for the CRM to display.
- `POST /admin/partner-applications/:id/reject` — ADMIN only; body `{ reason? }`; sets `REJECTED` + `notes`; audit `partner.application.reject`.

### 5.3 Set-password reuse
`reset-password` already consumes a token and sets the password. **Extend `consumeToken`/`resetPassword` to accept either `PASSWORD_RESET` or `PARTNER_INVITE`** (smallest change: the reset path looks up the token by hash and accepts both types). No new page or endpoint. After setting the password the partner can log in (portal UI arrives in Phase 2; for now they authenticate as a PARTNER).

### 5.4 Referral attribution at registration
- Extend `RegisterDto` with optional `ref?: string`.
- In `auth.register`, if `ref` is present, look up `PartnerProfile.referralCode`; if found, set the new user's `referredByPartnerId`. Unknown codes are ignored silently (never block signup).

### 5.5 Referral code generation
- 8-char uppercase base32 (Crockford, no ambiguous chars), e.g. `7K9F2QTX`. Generate, check `PartnerProfile.referralCode` uniqueness, retry on collision (bounded). Pure helper `generateReferralCode()` + a uniqueness loop in the service.

### 5.6 Partner list update
- Extend `AdminPartnersService.listPartners` to include `partnerProfile.referralCode` and a `_count` of `referredClients`.

## 6. Frontend

- **`/partner/apply`** public page (`PartnerApplyPage`) — react-hook-form + Zod (`partnerApplySchema`), posts to `partnersApi.apply()`; success confirmation panel. Linked from the `/partnership` page CTA and the footer.
- **`/admin/partner-applications`** (`AdminPartnerApplicationsPage`) — added to `adminNav` (icon e.g. `UserCheck`). Lists applications with a status filter; **Approve** (ADMIN) shows a modal/inline panel with the **referral code + copyable invite link**; **Reject** with an optional reason. AGENT sees the list read-only (approve/reject buttons gated/hidden; server enforces ADMIN).
- **Register page** reads `?ref=CODE` from the URL, stores it, includes it in the register payload, and shows a subtle "Referred by a partner" chip.
- New `src/lib/partnersApi.ts` (apply + admin application calls) and types.

## 7. Data Flow

```
Visitor → /partner/apply → POST /partners/apply → PartnerApplication(PENDING)
Admin → /admin/partner-applications → Approve →
   tx: create PARTNER user + PartnerProfile(referralCode) + PARTNER_INVITE token + app=APPROVED
   → CRM shows inviteUrl (/reset-password?token=…) + referralCode
Partner opens inviteUrl → sets password → can log in (PARTNER)
Partner shares https://app/register?ref=CODE
New client registers with ?ref=CODE → referredByPartnerId set
```

## 8. Error Handling

- Apply: validation errors → 400 with field messages; duplicate submissions allowed (each is a row); no email enumeration.
- Approve: non-PENDING → 400; email already a user → 409; code-collision → retry then 500 if exhausted.
- Reset/invite: expired/used token → existing reset-password error path.
- RBAC: apply public; list STAFF; approve/reject ADMIN — enforced by `@Roles`, verified by tests.

## 9. Testing

- **Backend:** apply creates PENDING; approve transaction creates user+profile+token, sets APPROVED+resultingUserId, returns code+inviteUrl; approve rejects non-PENDING (400) and existing-email (409); referral code uniqueness/format (pure helper test); reject sets REJECTED; `register({ref})` sets `referredByPartnerId`, unknown ref ignored; RBAC (apply public, approve ADMIN-only → 403 for AGENT).
- **Frontend:** apply-form validation + successful submit; CRM approve renders the invite link; register reads `?ref` and includes it.

## 10. Risks / Notes

- Reusing `PASSWORD_RESET`/`PARTNER_INVITE` for set-password keeps auth surface small; the only auth change is widening the token-type accepted by the reset path.
- `PartnerProfile` as a model (vs User fields) is deliberate forward design for Phases 3–4; Phase 1 writes only `referralCode`.
- Approval creating a real user with an unknown random password is safe (login impossible until invite consumed); status `ACTIVE` is fine because auth still requires a password.
