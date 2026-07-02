import { useParams } from 'react-router-dom'
import { PageHeader } from '@/components/marketing/PageHeader'
import { useSeo } from '@/lib/useSeo'

const DOCS: Record<string, { title: string; intro: string }> = {
  'client-agreement': {
    title: 'Client Agreement',
    intro: 'The terms and conditions governing your trading account with 27 Markets.',
  },
  'risk-disclosure': {
    title: 'Risk Disclosure',
    intro: 'Important information about the risks of trading leveraged products.',
  },
}

export default function LegalPage() {
  const { doc = '' } = useParams()
  const meta = DOCS[doc] ?? { title: 'Legal', intro: 'Legal documents and disclosures.' }
  useSeo({ title: `${meta.title} — 27 Markets`, description: meta.intro })

  return (
    <>
      <PageHeader breadcrumb={['Home', meta.title]} title={meta.title} description={meta.intro} />
      <section className="container-x py-12">
        <div className="glass-panel mx-auto max-w-3xl p-8 text-sm leading-relaxed text-gray-300">
          <p>
            The full {meta.title} is being finalised and will be published here shortly. For a copy in
            the meantime, please contact{' '}
            <a className="font-medium text-brand-400 underline" href="mailto:support@27markets.io">
              support@27markets.io
            </a>
            .
          </p>
        </div>
      </section>
    </>
  )
}
