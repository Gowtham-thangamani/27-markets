import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { PageHeader } from '@/components/marketing/PageHeader'
import { SkeletonCard, ErrorState } from '@/components/ui'
import { blogApi, type BlogCard } from '@/lib/blogApi'
import { ApiError } from '@/lib/api'
import { useSeo } from '@/lib/useSeo'
import { staggerContainer, fadeUp } from '@/lib/motion'

function formatDate(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export default function BlogListPage() {
  useSeo({
    title: '27 Markets — Insights & Market News',
    description: 'Trading insights, market analysis, and platform updates from 27 Markets.',
  })

  const [items, setItems] = useState<BlogCard[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const res = await blogApi.list(1, 12)
      setItems(res.items)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load posts')
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <>
      <PageHeader
        breadcrumb={['Home', 'Insights']}
        title="Insights & market news"
        description="Trading insights, market analysis, and platform updates from the 27 Markets desk."
      />

      <section className="container-x py-14">
        {error ? (
          <ErrorState description={error} onRetry={load} />
        ) : !items ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.06] bg-ink-800/40 p-10 text-center text-gray-400">
            No posts published yet — check back soon.
          </div>
        ) : (
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="show"
            className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
          >
            {items.map((p) => (
              <motion.article key={p.id} variants={fadeUp} className="glass-panel card-lift overflow-hidden">
                <Link to={`/blog/${p.slug}`} className="block">
                  {p.featuredImage ? (
                    <img src={p.featuredImage} alt="" className="h-44 w-full object-cover" />
                  ) : (
                    <div className="h-44 w-full bg-gradient-to-br from-brand-500/15 to-transparent" />
                  )}
                  <div className="p-5">
                    <p className="text-xs text-gray-500">{formatDate(p.publishedAt)}</p>
                    <h3 className="mt-2 font-display text-lg font-semibold text-white">{p.title}</h3>
                    {p.excerpt && (
                      <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-gray-400">{p.excerpt}</p>
                    )}
                    <span className="mt-3 inline-block text-sm font-medium text-brand-400">Read more →</span>
                  </div>
                </Link>
              </motion.article>
            ))}
          </motion.div>
        )}
      </section>
    </>
  )
}
