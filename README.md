# Apex Markets — Trading Brokerage Platform

A production-grade, responsive **black & red** fintech web app: a public marketing
website **plus** a secure client portal. Built as a single coherent SPA with original
branding (the reference design's "27MARKETS" was reinterpreted as **Apex Markets**).

> ⚠️ This is a **front-end demonstration product**. All data is mock/in-memory
> (persisted to `localStorage`). There is no real backend, payments, or KYC processing.

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
| State          | React Context + localStorage              |

## 🚀 Getting Started

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build → dist/
npm run preview    # preview the production build
```

### Demo login

Any email + any 6+ character password signs you in (mock auth).
Or use **Open Account** to run the multi-step onboarding.

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
