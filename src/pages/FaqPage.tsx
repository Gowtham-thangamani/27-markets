import { Link } from 'react-router-dom'
import { UserPlus, Wallet, ShieldCheck, MonitorSmartphone } from 'lucide-react'
import { PageHeader } from '@/components/marketing/PageHeader'
import { Reveal } from '@/components/Reveal'
import { CTABand } from '@/components/marketing/CTABand'
import { Accordion, type AccordionItem } from '@/components/ui/Accordion'
import { useT } from '@/i18n/LanguageContext'

const GROUPS: { icon: typeof UserPlus; g: string; ids: string[] }[] = [
  { icon: UserPlus, g: 'g1', ids: ['open', 'kyc', 'demo'] },
  { icon: Wallet, g: 'g2', ids: ['min', 'methods', 'withdraw'] },
  { icon: ShieldCheck, g: 'g3', ids: ['safe', 'reg', 'data'] },
  { icon: MonitorSmartphone, g: 'g4', ids: ['platforms', 'markets', 'accounts'] },
]

export default function FaqPage() {
  const t = useT()
  return (
    <>
      <PageHeader
        breadcrumb={['Home', 'Help & FAQ']}
        title={t('faqp.title')}
        description={t('faqp.desc')}
      />

      <section className="container-x space-y-12 py-14">
        {GROUPS.map((group) => {
          const items: AccordionItem[] = group.ids.map((id, i) => ({
            id,
            question: t(`faqp.${group.g}q${i + 1}`),
            answer: t(`faqp.${group.g}a${i + 1}`),
          }))
          return (
            <Reveal key={group.g}>
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/10 text-brand-400 ring-1 ring-brand-500/20">
                  <group.icon className="h-5 w-5" />
                </span>
                <h2 className="font-display text-xl font-semibold text-white">{t(`faqp.${group.g}t`)}</h2>
              </div>
              <Accordion items={items} />
            </Reveal>
          )
        })}

        <Reveal className="text-center text-sm text-gray-400">
          {t('faqH.more')}{' '}
          <Link to="/contact" className="font-semibold text-brand-400 hover:text-brand-300">
            {t('faqH.contact')}
          </Link>
        </Reveal>
      </section>

      <Reveal>
        <CTABand />
      </Reveal>
    </>
  )
}
