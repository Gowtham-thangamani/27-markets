import { PageHeader } from '@/components/marketing/PageHeader'
import { useSeo } from '@/lib/useSeo'

const TITLE = 'Disclaimer'
const INTRO = 'Important risk information regarding trading with 27 Markets Ltd.'

export default function DisclaimerPage() {
  useSeo({ title: `${TITLE} — 27 Markets`, description: INTRO })

  return (
    <>
      <PageHeader breadcrumb={['Home', TITLE]} title={TITLE} description={INTRO} />
      <section className="container-x py-12">
        <div className="glass-panel mx-auto max-w-3xl space-y-5 p-8 text-sm leading-relaxed text-gray-300">
          <p className="text-white/90">
            <span className="font-semibold text-white">27 Markets Ltd.</span> — Registration No. 2026-00485
          </p>
          <p>
            <span className="font-semibold text-white">Risk statement:</span> An investment in
            derivatives may mean investors may lose an amount even greater than their original
            investment. Anyone wishing to invest in any of the products mentioned in 27markets.com
            should seek their own financial or professional advice. Trading of securities, forex,
            stock market, commodities, options and futures may not be suitable for everyone and
            involves the risk of losing part or all of your money. Trading in the financial markets
            has large potential rewards, but also large potential risk. You must be aware of the
            risks and be willing to accept them in order to invest in the markets. Don&apos;t invest
            and trade with money which you can&apos;t afford to lose. Forex trading is not allowed in
            some countries; before investing your money, make sure whether your country is allowing
            this or not.
          </p>
          <p>
            You are strongly advised to obtain independent financial, legal and tax advice before
            proceeding with any currency or spot metals trade. Nothing in this site should be read or
            construed as constituting advice on the part of 27 Markets Ltd or any of its affiliates,
            directors, officers or employees.
          </p>
          <p>
            Information on this site is not directed at residents in any country or jurisdiction where
            such distribution or use would be contrary to local law or regulation.
          </p>
        </div>
      </section>
    </>
  )
}
