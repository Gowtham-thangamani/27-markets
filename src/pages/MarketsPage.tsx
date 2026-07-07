import { motion } from 'framer-motion'
import { useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Reveal } from '@/components/Reveal'
import { SectionHeading } from '@/components/SectionHeading'
import { PageHeader } from '@/components/marketing/PageHeader'
import { MarketCard } from '@/components/marketing/MarketCard'
import { InstrumentsExplorer } from '@/components/marketing/InstrumentsExplorer'
import { LiveMarketOverview } from '@/components/marketing/LiveMarketOverview'
import { DfmBoard } from '@/components/marketing/DfmBoard'
import { CTABand } from '@/components/marketing/CTABand'
import { staggerContainer } from '@/lib/motion'
import { marketCategories } from '@/mock/content'
import { useT } from '@/i18n/LanguageContext'
import type { InstrumentCategory } from '@/lib/types'

export default function MarketsPage() {
  const [params] = useSearchParams()
  const category = params.get('category') as InstrumentCategory | null
  const explorerRef = useRef<HTMLElement>(null)
  const t = useT()

  // When a category is chosen (via a market card or a direct link), bring the
  // filtered instruments list into view so the click visibly "goes somewhere".
  useEffect(() => {
    if (category) explorerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [category])

  return (
    <>
      <PageHeader
        breadcrumb={['Home', 'Markets']}
        title={t('mktp.title')}
        description={t('mktp.desc')}
      />

      <section className="container-x py-14">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.15 }}
          className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          {marketCategories.map((c) => (
            <MarketCard key={c.key} category={c} />
          ))}
        </motion.div>
      </section>

      {/* Real-time market data — streamed from the backend (Finnhub) over SSE */}
      <section className="container-x py-10">
        <SectionHeading
          align="left"
          eyebrow={t('mktp.rtEyebrow')}
          title={t('mktp.rtTitle')}
          description={t('mktp.rtDesc')}
        />
        <div className="mt-8 grid gap-8 lg:grid-cols-[1.6fr_1fr]">
          <LiveMarketOverview />
          <DfmBoard />
        </div>
      </section>

      <section ref={explorerRef} className="container-x py-10">
        <SectionHeading
          align="left"
          eyebrow={t('mktp.liEyebrow')}
          title={t('mktp.liTitle')}
          description={t('mktp.liDesc')}
        />
        <Reveal className="mt-8">
          <InstrumentsExplorer initialCategory={category ?? undefined} />
        </Reveal>
      </section>

      <CTABand />
    </>
  )
}
