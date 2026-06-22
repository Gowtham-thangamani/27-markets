import { Link } from 'react-router-dom'
import { Twitter, Linkedin, Youtube, Send } from 'lucide-react'
import { Logo } from '@/components/Logo'

const columns = [
  {
    title: 'Trading',
    links: [
      { label: 'Accounts', to: '/accounts' },
      { label: 'Markets', to: '/markets' },
      { label: 'Platforms', to: '/downloads' },
      { label: 'Demo Account', to: '/demo' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About Us', to: '/about' },
      { label: 'Partnership', to: '/partnership' },
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

export function Footer() {
  return (
    <footer className="relative mt-24 overflow-hidden border-t border-white/[0.06] bg-ink-900">
      {/* Subtle network/map texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.5]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 20%, rgba(225,29,46,0.06), transparent 40%), radial-gradient(circle at 80% 60%, rgba(225,29,46,0.05), transparent 45%)',
        }}
      />
      <div className="grid-bg pointer-events-none absolute inset-0 opacity-30" />

      <div className="container-x relative py-14">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div className="max-w-xs">
            <Logo />
            <p className="mt-4 text-sm leading-relaxed text-gray-400">
              Trade global financial markets through a broker built for traders, partners, and
              long-term growth.
            </p>
            <div className="mt-5 flex gap-2">
              {[Twitter, Linkedin, Youtube, Send].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.06] text-gray-400 transition-colors hover:border-brand-500/40 hover:text-brand-400"
                  aria-label="Social link"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="mb-4 text-sm font-semibold text-white">{col.title}</h4>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.to}
                      className="text-sm text-gray-400 transition-colors hover:text-brand-400"
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

        <div className="flex flex-col gap-4 text-xs text-gray-500 lg:flex-row lg:items-center lg:justify-between">
          <p>© 2026 Apex Markets. All rights reserved.</p>
          <p className="max-w-3xl leading-relaxed">
            Risk warning: CFDs are complex instruments and carry a high risk of losing money
            rapidly due to leverage. This is a demonstration product and not a real brokerage.
          </p>
        </div>
      </div>
    </footer>
  )
}
