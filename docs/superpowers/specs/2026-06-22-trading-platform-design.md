# Apex Markets — Trading Brokerage Platform (Design Spec)

Date: 2026-06-22

## Summary
A dark-themed (black/red) fintech CFD/forex brokerage **marketing website + secure client portal**,
built as a single coherent SPA. Original branding ("Apex Markets" / infinity mark), original copy.

## Stack
- Vite + React 18 + TypeScript
- Tailwind CSS (custom black/red token system)
- Framer Motion + GSAP (scroll reveals, micro-interactions)
- React Three Fiber / Three.js (lazy-loaded: globe, particles, market wave, infinity ribbon, hero scene)
- React Router v6
- Lucide React (icons)
- lightweight-charts (mini market charts)
- react-hook-form + zod (form validation)
- Data: mock/in-memory via React Context, persisted to localStorage

## Routes
```
/                 Home
/markets          Markets explorer (filters)
/accounts         Account types pricing
/partnership      Partner / IB page (infinity ribbon)
/about            About
/contact          Contact (form + map texture)
/login            Login
/register         Multi-step Open Account onboarding
/demo             Demo account request
/portal           Portal shell (sidebar)
  /dashboard      KPIs + accounts table
  /accounts       Accounts + open-new flow
  /funds          Deposit / Withdraw / Internal Transfer / History tabs
  /kyc            Identity / Address / Selfie steps + uploads + progress
  /downloads      Platform + document download center
  /profile        Profile settings
  /support        Support ticket creation + list
```

## State / Contexts
- `AuthContext` — fake login/register/logout, current user, session in localStorage
- `PortalDataContext` — accounts, balances, transactions, KYC status, tickets, notifications
- `ToastContext` — global toast/notification queue

## Color system
- bg `#050505` / `#0a0a0a`; panels `#111`→`#181818`; primary red `#e11d2e`; success/warning/danger for status badges only.
- Utilities: `.glass-panel`, `.red-glow`, `.card-lift`; reduced-motion fallbacks everywhere.

## Components (ui/)
Button, Card, Badge, Tabs, Modal, Dropdown, Toast, Accordion, Input, Select, FileUpload,
Skeleton, EmptyState, ErrorState, StatCard, ProgressBar, DataTable.

## 3D / animation
- Hero: floating laptop+mobile mockup over glowing market wave + particle field.
- Partner: rotating globe with connection arcs.
- Partnership page: glowing infinity ribbon.
- Section bg: red particle field, animated waveform.
- All 3D lazy-loaded behind Suspense + skeleton; `prefers-reduced-motion` → static.

## Build phases
1. Scaffold + design system (tokens, ui primitives, contexts, mock data, toasts)
2. Marketing site (nav/footer + all marketing pages + 3D hero/globe)
3. Auth + portal shell + dashboard
4. Portal modules (funds, kyc, downloads, profile, support, onboarding)
5. Polish (skeleton/empty/error, responsive, a11y, reduced-motion, build QA)

## Non-goals
- No real backend / payments / persistence beyond localStorage.
- No real KYC processing — UI workflow + status simulation only.
