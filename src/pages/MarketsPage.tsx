import { motion } from 'framer-motion'
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
import type { InstrumentCategory } from '@/lib/types'

export default function MarketsPage() {
  const [params] = useSearchParams()
  const category = params.get('category') as InstrumentCategory | null

  return (
    <>
      <PageHeader
        breadcrumb={['Home', 'Markets']}
        title="Trade global markets with confidence"
        description="Diversify your portfolio with 100+ instruments across multiple asset classes — all on institutional-grade infrastructure."
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
          eyebrow="Real-time"
          title="Live market overview"
          description="Streaming prices for major crypto, forex, metals, and equities. DFM real-time pending a licensed feed."
        />
        <div className="mt-8 grid gap-8 lg:grid-cols-[1.6fr_1fr]">
          <LiveMarketOverview />
          <DfmBoard />
        </div>
      </section>

      <section className="container-x py-10">
        <SectionHeading
          align="left"
          eyebrow="Live Instruments"
          title="Explore the markets"
          description="Search and filter across forex, metals, indices, commodities, stocks, and crypto."
        />
        <Reveal className="mt-8">
          <InstrumentsExplorer initialCategory={category ?? undefined} />
        </Reveal>
      </section>

      <CTABand />
    </>
  )
}
