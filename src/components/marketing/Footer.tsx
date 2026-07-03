import { Link } from 'react-router-dom'
import {
  Facebook,
  Instagram,
  Linkedin,
  Mail,
  ShieldCheck,
  Lock,
  DollarSign,
  Headphones,
  type LucideProps,
} from 'lucide-react'
import type { ComponentType } from 'react'
import { Logo } from '@/components/Logo'

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M16.5 3c.3 2.1 1.6 3.7 3.5 4v2.6c-1.3 0-2.5-.4-3.5-1v6.1c0 3.2-2.3 5.3-5.2 5.3C8.6 20 6.5 17.9 6.5 15.2c0-2.7 2.1-4.8 4.8-4.8.3 0 .6 0 .9.1v2.7c-.3-.1-.6-.2-.9-.2-1.2 0-2.1.9-2.1 2.1 0 1.2.9 2.1 2.1 2.1 1.2 0 2.2-.9 2.2-2.4V3h2.9z" />
    </svg>
  )
}

const socials: { label: string; href: string; Icon: ComponentType<LucideProps> | ComponentType<{ className?: string }> }[] = [
  { label: 'Facebook', href: 'https://www.facebook.com/share/1ChNbKJnvj/?mibextid=wwXIfr', Icon: Facebook },
  { label: 'Instagram', href: 'https://www.instagram.com/27markets?igsh=MWRwZTNlaTB1eXN1MA==', Icon: Instagram },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/company/27-markets/', Icon: Linkedin },
  { label: 'TikTok', href: 'https://www.tiktok.com/@27.markets?_r=1&_t=ZS-97V6CNWAtYe', Icon: TikTokIcon },
]

const trust = [
  { icon: ShieldCheck, label: 'Segregated client funds' },
  { icon: Lock, label: 'Bank-grade security' },
  { icon: DollarSign, label: 'USD accounts' },
  { icon: Headphones, label: '24/5 support' },
]

const columns = [
  {
    title: 'Trading',
    links: [
      { label: 'Accounts', to: '/accounts' },
      { label: 'Markets', to: '/markets' },
      { label: 'Platforms', to: '/platforms' },
      { label: 'Demo Account', to: '/demo' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About Us', to: '/about' },
      { label: 'Partnership', to: '/partnership' },
      { label: 'Blog', to: '/blog' },
      { label: 'Contact', to: '/contact' },
      { label: 'Client Portal', to: '/portal/dashboard' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Client Agreement', to: '/downloads' },
      { label: 'Risk Disclosure', to: '/downloads' },
      { label: 'Privacy Policy', to: '/about' },
      { label: 'AML Policy', to: '/about' },
    ],
  },
]

const legalLinks = [
  { label: 'Privacy Policy', to: '/about' },
  { label: 'Client Agreement', to: '/downloads' },
  { label: 'Risk Disclosure', to: '/downloads' },
]

export function Footer() {
  return (
    <footer className="relative mt-24 overflow-hidden border-t border-white/[0.06] bg-ink-900">
      {/* Top brand accent */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-500/60 to-transparent" />
      {/* Subtle network/map texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.5]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 20%, rgba(225,29,46,0.06), transparent 40%), radial-gradient(circle at 80% 60%, rgba(225,29,46,0.05), transparent 45%)',
        }}
      />
      <div className="grid-bg pointer-events-none absolute inset-0 opacity-30" />

      <div className="container-x relative py-16">
        {/* Trust strip */}
        <div className="mb-12 grid grid-cols-2 gap-5 border-b border-white/[0.06] pb-10 sm:grid-cols-4">
          {trust.map((t) => (
            <div key={t.label} className="flex items-center gap-3">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-500/10 text-brand-400 ring-1 ring-brand-500/15">
                <t.icon className="h-4 w-4" />
              </span>
              <span className="text-sm font-medium text-white">{t.label}</span>
            </div>
          ))}
        </div>

        <div className="grid gap-10 lg:grid-cols-[1.5fr_repeat(3,1fr)]">
          <div className="max-w-sm">
            <Logo size={30} />
            <p className="mt-4 text-sm leading-relaxed text-gray-300">
              Trade global financial markets through a broker built for traders, partners, and
              long-term growth.
            </p>
            <a
              href="mailto:support@27markets.io"
              className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-white transition-colors hover:text-brand-400"
            >
              <Mail className="h-4 w-4 text-brand-400" /> support@27markets.io
            </a>
            <div className="mt-6 flex gap-2.5">
              {socials.map(({ label, href, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.02] text-gray-300 transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-500/40 hover:bg-brand-500/10 hover:text-brand-400"
                  aria-label={label}
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-400">
                {col.title}
              </h4>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.to}
                      className="inline-block text-sm text-gray-300 transition-all duration-200 hover:translate-x-0.5 hover:text-brand-400"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="hairline my-10" />

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <p className="text-xs text-gray-400">© 2026 27 Markets. All rights reserved.</p>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs">
            {legalLinks.map((l) => (
              <Link
                key={l.label}
                to={l.to}
                className="text-gray-400 transition-colors hover:text-brand-400"
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>

        <p className="mt-6 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-xs leading-relaxed text-gray-400">
          <span className="font-semibold text-gray-300">Risk warning:</span> CFDs are complex
          instruments and carry a high risk of losing money rapidly due to leverage. This is a
          demonstration product and not a real brokerage.
        </p>
      </div>
    </footer>
  )
}
