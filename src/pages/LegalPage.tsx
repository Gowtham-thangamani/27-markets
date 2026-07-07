import { useParams } from 'react-router-dom'
import { PageHeader } from '@/components/marketing/PageHeader'
import { useSeo } from '@/lib/useSeo'
import { useT } from '@/i18n/LanguageContext'

const KNOWN_DOCS = ['client-agreement', 'risk-disclosure']

export default function LegalPage() {
  const { doc = '' } = useParams()
  const t = useT()
  const base = KNOWN_DOCS.includes(doc) ? `lgl.${doc}` : 'lgl.default'
  const title = t(`${base}.title`)
  const intro = t(`${base}.intro`)
  useSeo({ title: `${title} — 27 Markets`, description: intro })

  return (
    <>
      <PageHeader breadcrumb={['Home', title]} title={title} description={intro} />
      <section className="container-x py-12">
        <div className="glass-panel mx-auto max-w-3xl p-8 text-sm leading-relaxed text-gray-300">
          <p>
            {t('lgl.body').replace('{title}', title)}{' '}
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
