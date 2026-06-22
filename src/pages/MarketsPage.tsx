import { motion } from 'framer-motion'
import { useSearchParams } from 'react-router-dom'
import { Reveal } from '@/components/Reveal'
import { SectionHeading } from '@/components/SectionHeading'
import { PageHeader } from '@/components/marketing/PageHeader'
import { MarketCard } from '@/components/marketing/MarketCard'
import { InstrumentsExplorer } from '@/components/marketing/InstrumentsExplorer'
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
