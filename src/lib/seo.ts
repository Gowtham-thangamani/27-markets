import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const SITE = '27 Markets'
const BASE = 'https://27markets.com'
const DEFAULT_TITLE = '27 Markets — Trade Beyond Limits'
const DEFAULT_DESC =
  '27 Markets is a multi-asset CFD & forex broker built for traders and partners. Trade forex, metals, indices, commodities, shares, and crypto with tight spreads, deep liquidity, and ultra-fast execution on MetaTrader 5.'

interface SeoEntry {
  title?: string // page title (site name is appended); omit for the homepage default
  description: string
}

/** Per-route SEO: unique title + meta description for each marketing page. */
const SEO_BY_PATH: Record<string, SeoEntry> = {
  '/': { description: DEFAULT_DESC },
  '/about': {
    title: 'About Us',
    description:
      'Learn about 27 Markets — a next-generation multi-asset broker built for traders, partners, and long-term growth, with a focus on transparency, security, and fast execution.',
  },
  '/markets': {
    title: 'Markets — Forex, Metals, Indices, Stocks & Crypto',
    description:
      'Trade 200+ instruments at 27 Markets: forex majors & minors, gold and silver, global indices, commodities, share CFDs, and top cryptocurrencies — with tight spreads and deep liquidity.',
  },
  '/platforms': {
    title: 'Trading Platforms — MetaTrader 5',
    description:
      'Trade on MetaTrader 5 at 27 Markets — advanced charting, algo trading, and 21 timeframes — on desktop, web, and mobile. One account, everywhere you trade.',
  },
  '/accounts': {
    title: 'Account Types — Standard, Raw & VIP',
    description:
      'Compare 27 Markets account types — Standard, Raw Spread, and VIP — with spreads from 0.0 pips, leverage up to 1:100, and deposits from $50. Find the account that fits your strategy.',
  },
  '/conditions': {
    title: 'Trading Conditions — Spreads, Leverage & Commission',
    description:
      'See 27 Markets trading conditions: raw spreads from 0.0 pips, transparent commission, flexible leverage, and sub-30ms execution across every asset class.',
  },
  '/funding': {
    title: 'Funding — Deposits & Withdrawals',
    description:
      'Fund your 27 Markets account from $50 with cards, bank transfer, and e-wallets. Fast, secure deposits and no-minimum withdrawals in USD.',
  },
  '/trust': {
    title: 'Trust & Safety',
    description:
      'How 27 Markets protects you: segregated client funds, no dealing desk, strong data security, and transparent, regulation-aligned operations.',
  },
  '/faq': {
    title: 'Help & FAQ',
    description:
      'Answers to common questions about opening an account, KYC verification, deposits and withdrawals, platforms, and trading with 27 Markets.',
  },
  '/partnership': {
    title: 'IB Partnership Program',
    description:
      "Grow your business with the 27 Markets Introducing Broker program — competitive rebates, powerful partner tools, real-time commission tracking, and dedicated support.",
  },
  '/partner/apply': {
    title: 'Become a Partner',
    description:
      'Apply to the 27 Markets Introducing Broker program in minutes and start earning competitive rebates on your referred clients.',
  },
  '/economic-calendar': {
    title: 'Economic Calendar',
    description:
      'Track market-moving events with the 27 Markets economic calendar — central-bank decisions, inflation prints, and key data releases with forecast and prior figures.',
  },
  '/contact': {
    title: 'Contact Us',
    description:
      'Get in touch with the 27 Markets team — sales, support, and partnerships. Call +31 10 360 2083 or reach us online.',
  },
  '/blog': {
    title: 'Market News & Analysis',
    description:
      'Market news, insights, and trading analysis from 27 Markets — stay ahead of forex, commodities, indices, and crypto moves.',
  },
  '/disclaimer': {
    title: 'Disclaimer',
    description:
      'Risk disclosure and legal disclaimer for 27 Markets. CFDs are complex instruments and carry a high risk of losing money rapidly due to leverage.',
  },
}

/**
 * Injects FAQPage structured data (schema.org) for the given Q&As so Google can
 * surface them as rich results. Upserts a single <script> and removes it on
 * unmount, so only the current route's FAQ schema is present.
 */
export function useFaqJsonLd(faqs: { question: string; answer: string }[]) {
  const json = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  })
  useEffect(() => {
    const id = 'faq-jsonld'
    let el = document.getElementById(id) as HTMLScriptElement | null
    if (!el) {
      el = document.createElement('script')
      el.id = id
      el.type = 'application/ld+json'
      document.head.appendChild(el)
    }
    el.textContent = json
    return () => document.getElementById(id)?.remove()
  }, [json])
}

/**
 * Injects BreadcrumbList structured data (schema.org) for the page's breadcrumb
 * trail, so Google can show a breadcrumb rich result instead of a bare URL.
 * Items without a known path are emitted name-only (still valid).
 */
export function useBreadcrumbJsonLd(crumbs: { name: string; path?: string }[]) {
  const json = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      ...(c.path ? { item: `${BASE}${c.path === '/' ? '/' : c.path}` } : {}),
    })),
  })
  useEffect(() => {
    const id = 'breadcrumb-jsonld'
    let el = document.getElementById(id) as HTMLScriptElement | null
    if (!el) {
      el = document.createElement('script')
      el.id = id
      el.type = 'application/ld+json'
      document.head.appendChild(el)
    }
    el.textContent = json
    return () => document.getElementById(id)?.remove()
  }, [json])
}

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function upsertCanonical(href: string) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', 'canonical')
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

/**
 * Applies per-route SEO (title, description, canonical, OG/Twitter) on marketing
 * navigation. Mounted once in the marketing layout — no per-page wiring needed.
 */
export function useRouteSeo() {
  const { pathname } = useLocation()
  useEffect(() => {
    // Prefix match for dynamic routes (e.g. /blog/:slug → /blog, /legal/:doc).
    const entry =
      SEO_BY_PATH[pathname] ??
      (pathname.startsWith('/blog') ? SEO_BY_PATH['/blog'] : undefined) ??
      (pathname.startsWith('/legal') ? SEO_BY_PATH['/disclaimer'] : undefined)

    const title = entry?.title ? `${entry.title} · ${SITE}` : DEFAULT_TITLE
    const description = entry?.description ?? DEFAULT_DESC
    const url = `${BASE}${pathname === '/' ? '/' : pathname}`

    document.title = title
    upsertMeta('name', 'description', description)
    upsertCanonical(url)
    upsertMeta('property', 'og:title', title)
    upsertMeta('property', 'og:description', description)
    upsertMeta('property', 'og:url', url)
    upsertMeta('name', 'twitter:title', title)
    upsertMeta('name', 'twitter:description', description)
  }, [pathname])
}
