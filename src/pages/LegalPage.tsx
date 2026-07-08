import { useParams } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import { PageHeader } from '@/components/marketing/PageHeader'
import { useSeo } from '@/lib/useSeo'
import { useT } from '@/i18n/LanguageContext'
import { getLegalDoc } from '@/content/legal'

export default function LegalPage() {
  const { doc = '' } = useParams()
  const t = useT()
  const legal = getLegalDoc(doc)

  // Fallback for any /legal/:doc slug we don't have structured content for.
  const title = legal?.title ?? t('lgl.default.title')
  const intro = legal?.intro ?? t('lgl.default.intro')
  useSeo({ title: `${title} — 27 Markets`, description: intro })

  return (
    <>
      <PageHeader breadcrumb={['Home', title]} title={title} description={intro} />
      <section className="container-x py-12">
        <div className="mx-auto max-w-3xl space-y-6">
          {legal ? (
            <>
              <div className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/5 p-4 text-sm text-warning">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                  <span className="font-semibold">Draft for review.</span> This document is a
                  template and must be reviewed and approved by qualified legal counsel before it is
                  relied upon. Last updated {legal.updated}.
                </p>
              </div>

              <div className="glass-panel space-y-6 p-8 text-sm leading-relaxed text-gray-300">
                {legal.sections.map((s) => (
                  <div key={s.heading} className="space-y-2">
                    <h2 className="text-base font-semibold text-white">{s.heading}</h2>
                    {s.body?.map((p, i) => (
                      <p key={i}>{p}</p>
                    ))}
                    {s.bullets && (
                      <ul className="list-disc space-y-1 pl-5 marker:text-brand-400">
                        {s.bullets.map((b, i) => (
                          <li key={i}>{b}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="glass-panel p-8 text-sm leading-relaxed text-gray-300">
              <p>
                {t('lgl.body').replace('{title}', title)}{' '}
                <a className="font-medium text-brand-400 underline" href="mailto:info@27markets.com">
                  info@27markets.com
                </a>
                .
              </p>
            </div>
          )}
        </div>
      </section>
    </>
  )
}
