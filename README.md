# Apex Markets — Trading Brokerage Platform

[![Backend tests](https://github.com/Gowtham-thangamani/27-markets/actions/workflows/test-backend.yml/badge.svg)](https://github.com/Gowtham-thangamani/27-markets/actions/workflows/test-backend.yml)

A production-grade, responsive **black & red** fintech web app: a public marketing
website **plus** a secure client portal. Built as a single coherent SPA with original
branding (the reference design's "27MARKETS" was reinterpreted as **Apex Markets**).

> ⚠️ The client **portal is wired to the real backend API** (`server/`) — auth, accounts,
> funds, and KYC use live endpoints, and **all money runs through the server's double-entry
> ledger in `SIMULATION` mode** (no real funds, no licensed PSP/custody/LP yet). The marketing
> site uses static content. Support tickets and notifications remain client-side for now.
> See `server/README.md` for the backend and the "Before going live" requirements.

## ✨ Highlights

- **Premium black/red theme** — near-black surfaces, glass panels, red glow lines, grid textures.
- **3D & motion** — React Three Fiber globe with connection arcs, drifting particle field,
  glowing infinity ribbon, animated market waveform, floating laptop/mobile hero mockup.
  All 3D is lazy-loaded and respects `prefers-reduced-motion`.
- **Full marketing site** — Home, About, Markets (with live instrument explorer + filters),
  Trading Accounts (pricing + comparison + FAQ), Partnership/IB, Contact.
- **Secure client portal** — Dashboard (animated KPIs + accounts table), Accounts, Funds
  (Deposit / Withdraw / Internal Transfer / History), KYC verification with uploads & progress,
  Download Center, Profile settings, Support tickets.
- **Auth flows** — Login, multi-step Open-Account onboarding, Demo account request.
- **Complete UI kit** — Button, Card, Badge, Input, Select, Textarea, FileUpload, Tabs, Modal,
  Dropdown, Accordion, Skeleton, Empty/Error states, ProgressBar, Toast notifications.
- **Accessible** — keyboard focus rings, ARIA roles, reduced-motion, responsive mobile nav & dashboard.

## 🧱 Tech Stack

| Concern        | Choice                                    |
| -------------- | ----------------------------------------- |
| Framework      | React 18 + TypeScript + Vite              |
| Styling        | Tailwind CSS (custom token system)        |
| Motion         | Framer Motion                             |
| 3D             | Three.js + @react-three/fiber             |
| Routing        | React Router v6                           |
| Forms          | react-hook-form + Zod (custom resolver)   |
| Icons          | lucide-react                              |
| State / data   | React Context + REST API (`src/lib/api.ts`) |

## 🚀 Getting Started

The portal needs the backend running. Start the API first (see `server/README.md`):

```bash
# in server/ :  docker compose up -d && npm install && npm run prisma:migrate && npm run start:dev
```

Then the frontend (repo root):

```bash
npm install
npm run dev        # http://localhost:5173  (expects API at http://localhost:4000/api)
npm run build      # type-check + production build → dist/
npm run preview    # preview the production build
```

Set `VITE_API_URL` in `.env` if the API is not on the default `http://localhost:4000/api`.

### Sign in

Use **Open Account** to register a new client (real auth against the backend), or
**Login** with any account you've created. Sessions use httpOnly cookies with silent
token refresh.

## 📁 Project Structure

```
src/
  components/
    ui/            Reusable design-system primitives (Button, Card, Modal, …)
    marketing/     Navbar, Footer, Hero, sections, account/market cards
    portal/        Sidebar, Topbar, KPI widget, modals, status helpers
    three/         Lazy 3D set-pieces (Globe, ParticleField, InfinityRibbon, MarketWave)
    Logo, Reveal, SectionHeading, StatCard
  context/         AuthContext, PortalDataContext, ToastContext
  layouts/         MarketingLayout, PortalLayout, AuthShell
  pages/           Marketing pages, auth/*, portal/*
  lib/             cn, format, hooks, motion, types, validation, zodResolver
  mock/            data.ts (accounts, txns, instruments…), content.ts (copy)
  styles/          globals.css (theme + utilities)
```

## 🎨 Design Tokens

- Background `#050505` / `#0a0a0a` · Panels `#111`–`#181818`
- Primary red `#e11d2e` (brand scale 50–900)
- Success / warning / danger reserved for status labels only
- Fonts: Space Grotesk (display) + Inter (body)

## ♿ Accessibility & Performance

- Lazy-loaded Three.js keeps the initial bundle lean; 3D falls back to static gradients
  under `prefers-reduced-motion`.
- Focus-visible rings, ARIA roles on tabs/menus/dialogs, scroll-locked modals & drawers.
- Code-split vendor chunk for Three.js via Vite `manualChunks`.

## 🧪 Testing & CI

| Suite | Command | Count |
| --- | --- | --- |
| Frontend (Vitest) | `npm test` | 102 |
| Backend (Jest, mocked Prisma — no DB) | `cd server && npm test` | 310 |

- **`.github/workflows/test-backend.yml`** runs the backend suite (typecheck + tests)
  on every PR and push that touches `server/` — the merge gate for ledger/finance
  regressions. Make it a required check in branch protection to block red merges.
- **`.github/workflows/deploy-s3.yml`** builds and ships the frontend to S3 + CloudFront
  on push to `main` (skips backend/docs-only changes).

## 🚀 Deployment & Operations

- **Frontend:** `scripts/deploy-frontend.sh` → S3 (`27markets-frontend`) + CloudFront
  invalidation. A `postbuild` step regenerates `sitemap.xml` from published blog posts.
- **Backend:** `EC2_HOST=<ip> scripts/deploy-backend.sh` → off-host DB backup, tar `server/`,
  scp to EC2, `docker compose up -d --build`; Prisma migrations run on container start.
- **CloudFront** serves a strict Content-Security-Policy (custom response-headers policy)
  and routes `/sitemap.xml` to the live backend endpoint.
- **Error tracking (optional, dormant):** set `SENTRY_DSN` in the server env and restart —
  the code is already wired (see `server/src/observability/sentry.ts`).
- **Nightly DB backups (active):** `scripts/ec2-backup-db.sh` runs on the EC2 host via cron
  (03:00 UTC) and streams a compressed `pg_dump` to S3 (`27markets-db-backups`, private +
  versioned + AES256 + 90-day lifecycle) using the instance's IAM role — no stored keys, no
  inbound SSH. (GitHub-hosted runners can't reach the firewalled host, so backups run on-box.)

See `server/README.md` for the full "Before going live" checklist (licensing, KYC/AML
vendor keys, PSP go-live).
