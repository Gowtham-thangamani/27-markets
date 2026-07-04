import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'
import { loadMarketNews, type NewsItem } from '@/lib/marketNews'
import { relativeTime } from '@/lib/format'
import { staggerContainer, fadeUp } from '@/lib/motion'

/** One external news card. Handles broken/missing images gracefully. */
function NewsCard({ item }: { item: NewsItem }) {
  const [imgOk, setImgOk] = useState(Boolean(item.image))

  return (
    <motion.a
      variants={fadeUp}
      href={item.url}
      target="_blank"
      rel="noreferrer"
      className="glass-panel card-lift group relative block overflow-hidden"
    >
      <div className="relative h-44 w-full overflow-hidden">
        {imgOk ? (
          <img
            src={item.image}
            alt=""
            aria-hidden
            loading="lazy"
            onError={() => setImgOk(false)}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-brand-500/20 via-ink-800 to-transparent" />
        )}
        {/* Legibility scrim */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />
        {item.source && (
          <span className="absolute left-3 top-3 rounded-md bg-black/55 px-2 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
            {item.source}
          </span>
        )}
        <span className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-black/45 text-white opacity-0 backdrop-blur-sm transition-all duration-300 group-hover:opacity-100">
          <ArrowUpRight className="h-4 w-4" />
        </span>
      </div>

      <div className="p-5">
        <p className="text-xs text-gray-500">
          {item.datetime ? relativeTime(new Date(item.datetime * 1000)) : 'Market news'}
        </p>
        <h3 className="mt-1.5 line-clamp-2 font-display text-base font-semibold leading-snug text-white transition-colors duration-300 group-hover:text-brand-300">
          {item.headline}
        </h3>
        {item.summary && (
          <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-gray-400">{item.summary}</p>
        )}
      </div>
    </motion.a>
  )
}

const CAT_ORDER = ['forex', 'crypto', 'general'] as const
const CAT_LABEL: Record<string, string> = {
  all: 'All',
  forex: 'Forex',
  crypto: 'Crypto',
  general: 'General',
}

export function MarketNewsSection() {
  const [items, setItems] = useState<NewsItem[]>([])
  const [active, setActive] = useState<string>('all')

  useEffect(() => {
    let alive = true
    void loadMarketNews().then((n) => {
      if (alive) setItems(n)
    })
    return () => {
      alive = false
    }
  }, [])

  if (items.length === 0) return null

  // Only offer tabs when at least two categories are actually present.
  const present = CAT_ORDER.filter((c) => items.some((i) => i.category === c))
  const tabs = present.length >= 2 ? ['all', ...present] : []
  const shown = active === 'all' ? items : items.filter((i) => i.category === active)

  return (
    <section className="section-alt border-t border-ink-300/60">
      <div className="container-x py-14">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="section-eyebrow mb-2">Live</p>
            <h2 className="font-display text-2xl font-bold text-white sm:text-3xl">Market News</h2>
          </div>
          {tabs.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {tabs.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setActive(t)}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                    active === t
                      ? 'bg-brand-500 text-onaccent'
                      : 'border border-ink-300/60 text-gray-400 hover:text-white'
                  }`}
                >
                  {CAT_LABEL[t] ?? t}
                </button>
              ))}
            </div>
          ) : (
            <p className="hidden text-xs text-gray-500 sm:block">Headlines via Finnhub</p>
          )}
        </div>
        <motion.div
          key={active}
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
        >
          {shown.map((n) => (
            <NewsCard key={n.id} item={n} />
          ))}
        </motion.div>
      </div>
    </section>
  )
}
