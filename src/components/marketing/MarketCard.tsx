import { motion } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { fadeUp } from '@/lib/motion'
import { asset } from '@/lib/asset'
import type { MarketCategory } from '@/mock/content'

export function MarketCard({ category }: { category: MarketCategory }) {
  const { icon: Icon, image, title, subtitle, examples, key } = category
  return (
    <motion.div variants={fadeUp}>
      <Link
        to={`/markets?category=${key}`}
        className="glass-panel card-lift group flex h-full flex-col p-6"
      >
        <div className="mb-4 flex items-center justify-between">
          {image ? (
            <img
              src={asset(image)}
              alt=""
              aria-hidden
              className="market-card-icon mask-radial-fade h-20 w-20 shrink-0 object-contain brightness-150 saturate-150 drop-shadow-[0_0_14px_rgba(225,29,46,0.85)]"
            />
          ) : (
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500/10 text-brand-400 ring-1 ring-brand-500/20">
              <Icon className="h-5 w-5" />
            </div>
          )}
          <ArrowUpRight className="h-5 w-5 text-gray-600 transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-brand-400" />
        </div>
        <h3 className="font-display text-lg font-semibold text-white">{title}</h3>
        <p className="mt-1 text-sm text-white">{subtitle}</p>
        <p className="mt-3 text-xs font-medium text-white/85">{examples}</p>
      </Link>
    </motion.div>
  )
}
