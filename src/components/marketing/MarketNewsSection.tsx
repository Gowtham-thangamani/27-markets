import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { loadMarketNews, type NewsItem } from '@/lib/marketNews'
import { relativeTime } from '@/lib/format'
import { staggerContainer, fadeUp } from '@/lib/motion'

export function MarketNewsSection() {
  const [items, setItems] = useState<NewsItem[]>([])

  useEffect(() => {
    let active = true
    void loadMarketNews().then((n) => {
      if (active) setItems(n)
    })
    return () => {
      active = false
    }
  }, [])

  if (items.length === 0) return null

  return (
    <section className="section-alt border-t border-ink-300/60">
      <div className="container-x py-14">
        <div className="mb-8">
          <p className="section-eyebrow mb-2">Live</p>
          <h2 className="font-display text-2xl font-bold text-white sm:text-3xl">Market News</h2>
          <p className="mt-2 text-sm text-gray-400">Latest market headlines · via Finnhub</p>
        </div>
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.1 }}
          className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
        >
          {items.map((n) => (
            <motion.a
              key={n.id}
              variants={fadeUp}
              href={n.url}
              target="_blank"
              rel="noreferrer"
              className="glass-panel card-lift block overflow-hidden"
            >
              {n.image ? (
                <img src={n.image} alt="" aria-hidden className="h-44 w-full object-cover" />
              ) : (
                <div className="h-44 w-full bg-gradient-to-br from-brand-500/15 to-transparent" />
              )}
              <div className="p-5">
                <p className="text-xs text-gray-500">
                  {n.source}
                  {n.datetime ? ` · ${relativeTime(new Date(n.datetime * 1000))}` : ''}
                </p>
                <h3 className="mt-2 line-clamp-2 font-display text-base font-semibold leading-snug text-white">
                  {n.headline}
                </h3>
                {n.summary && (
                  <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-gray-400">{n.summary}</p>
                )}
                <span className="mt-3 inline-block text-sm font-medium text-brand-400">
                  Read on {n.source || 'source'} →
                </span>
              </div>
            </motion.a>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
