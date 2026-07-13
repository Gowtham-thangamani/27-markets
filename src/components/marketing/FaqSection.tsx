import { Link } from 'react-router-dom'
import { SectionHeading } from '@/components/SectionHeading'
import { Reveal } from '@/components/Reveal'
import { Accordion, type AccordionItem } from '@/components/ui/Accordion'
import { useFaqJsonLd } from '@/lib/seo'
import { useT } from '@/i18n/LanguageContext'

const FAQ_IDS = ['start', 'min-deposit', 'withdraw', 'safe', 'markets', 'demo', 'platforms']

export function FaqSection() {
  const t = useT()
  const faqs: AccordionItem[] = FAQ_IDS.map((id, i) => ({
    id,
    question: t(`faqH.q${i + 1}`),
    answer: t(`faqH.a${i + 1}`),
  }))
  useFaqJsonLd(faqs)
  return (
    <section className="section-alt relative overflow-hidden py-20 sm:py-24">
      <div className="container-x relative z-10">
        <SectionHeading
          eyebrow={t('faqH.eyebrow')}
          title={t('faqH.title')}
          description={t('faqH.desc')}
        />
        <div className="mx-auto mt-12 max-w-3xl">
          <Accordion items={faqs} />
          <Reveal className="mt-6 text-center text-sm text-gray-400">
            {t('faqH.more')}{' '}
            <Link to="/contact" className="font-semibold text-brand-400 hover:text-brand-300">
              {t('faqH.contact')}
            </Link>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
