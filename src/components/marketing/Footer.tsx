import { Link } from 'react-router-dom'
import { Mail, MapPin, ShieldCheck, Lock, DollarSign, Headphones } from 'lucide-react'
import type { ComponentType } from 'react'
import { FaFacebookF, FaInstagram, FaLinkedinIn, FaTiktok } from 'react-icons/fa6'
import { Logo } from '@/components/Logo'
import { useT } from '@/i18n/LanguageContext'

const socials: { label: string; href: string; Icon: ComponentType<{ className?: string }> }[] = [
  { label: 'Facebook', href: 'https://www.facebook.com/share/1ChNbKJnvj/?mibextid=wwXIfr', Icon: FaFacebookF },
  { label: 'Instagram', href: 'https://www.instagram.com/27markets?igsh=MWRwZTNlaTB1eXN1MA==', Icon: FaInstagram },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/company/27-markets/', Icon: FaLinkedinIn },
  { label: 'TikTok', href: 'https://www.tiktok.com/@27.markets?_r=1&_t=ZS-97V6CNWAtYe', Icon: FaTiktok },
]

const trust = [
  { icon: ShieldCheck, key: 'footer.segregated' },
  { icon: Lock, key: 'footer.security' },
  { icon: DollarSign, key: 'footer.usd' },
  { icon: Headphones, key: 'footer.support' },
]

const columns = [
  {
    titleKey: 'footer.trading',
    links: [
      { labelKey: 'footer.accounts', to: '/accounts' },
      { labelKey: 'nav.markets', to: '/markets' },
      { labelKey: 'nav.platforms', to: '/platforms' },
      { labelKey: 'nav.demo', to: '/demo' },
    ],
  },
  {
    titleKey: 'footer.company',
    links: [
      { labelKey: 'nav.about', to: '/about' },
      { labelKey: 'footer.partnership', to: '/partnership' },
      { labelKey: 'footer.blog', to: '/blog' },
      { labelKey: 'nav.contact', to: '/contact' },
      { labelKey: 'footer.clientPortal', to: '/portal/dashboard' },
    ],
  },
  {
    titleKey: 'footer.legal',
    links: [
      { labelKey: 'footer.clientAgreement', to: '/downloads' },
      { labelKey: 'footer.riskDisclosure', to: '/downloads' },
      { labelKey: 'footer.disclaimer', to: '/disclaimer' },
      { labelKey: 'footer.privacy', to: '/about' },
      { labelKey: 'footer.aml', to: '/about' },
    ],
  },
]

const legalLinks = [
  { labelKey: 'footer.privacy', to: '/about' },
  { labelKey: 'footer.clientAgreement', to: '/downloads' },
  { labelKey: 'footer.riskDisclosure', to: '/downloads' },
  { labelKey: 'footer.disclaimer', to: '/disclaimer' },
]

export function Footer() {
  const t = useT()
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
          {trust.map((item) => (
            <div key={item.key} className="flex items-center gap-3">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-500/10 text-brand-400 ring-1 ring-brand-500/15">
                <item.icon className="h-4 w-4" />
              </span>
              <span className="text-sm font-medium text-white">{t(item.key)}</span>
            </div>
          ))}
        </div>

        <div className="grid gap-10 lg:grid-cols-[1.5fr_repeat(3,1fr)]">
          <div className="max-w-sm">
            <Logo size={30} />
            <p className="mt-4 text-sm leading-relaxed text-gray-300">{t('footer.tagline')}</p>
            <a
              href="mailto:info@27markets.com"
              className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-white transition-colors hover:text-brand-400"
            >
              <Mail className="h-4 w-4 text-brand-400" /> info@27markets.com
            </a>
            <p className="mt-3 flex items-start gap-2 text-sm leading-relaxed text-gray-400">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" />
              <span>
                27 Markets Ltd · Ground Floor, The Sotheby Building, Rodney Village, Rodney Bay,
                Gros-Islet, Saint Lucia
              </span>
            </p>
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
            <div key={col.titleKey}>
              <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-400">
                {t(col.titleKey)}
              </h4>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.labelKey}>
                    <Link
                      to={link.to}
                      className="inline-block text-sm text-gray-300 transition-all duration-200 hover:translate-x-0.5 hover:text-brand-400"
                    >
                      {t(link.labelKey)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="hairline my-10" />

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <p className="text-xs text-gray-400">{t('footer.rights')}</p>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs">
            {legalLinks.map((l) => (
              <Link
                key={l.labelKey}
                to={l.to}
                className="text-gray-400 transition-colors hover:text-brand-400"
              >
                {t(l.labelKey)}
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-6 space-y-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-xs leading-relaxed text-gray-400">
          <p>
            <span className="font-semibold text-gray-300">{t('footer.riskTitle')}</span> {t('footer.riskBody')}
          </p>
          <p>
            <span className="font-semibold text-gray-300">{t('footer.regTitle')}</span> {t('footer.regBody')}
          </p>
        </div>
      </div>
    </footer>
  )
}
