import { motion } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card3D } from '@/components/Card3D'
import { fadeUp } from '@/lib/motion'
import { asset } from '@/lib/asset'
import { useThemeSafe } from '@/context/ThemeContext'
import { useT } from '@/i18n/LanguageContext'
import type { MarketCategory } from '@/mock/content'

// The category PNGs have wildly different canvases + internal padding, so at the
// same box they render at different visual sizes. These per-icon factors (from
// measuring each glyph's content bounding box) normalise every icon to ~the same
// on-screen size. Light theme uses different source files, hence a separate map.
const ICON_SCALE_DARK: Record<string, number> = {
  Forex: 1.52,
  Metals: 1,
  Indices: 1.16,
  Commodities: 1.08,
  Stocks: 0.91,
  // Dark Crypto uses bitcoin-coin.webp (glyph ~91px), not icon-crypto.webp.
  Crypto: 1.21,
}
const ICON_SCALE_LIGHT: Record<string, number> = {
  Forex: 0.98,
  Metals: 1.08,
  Indices: 1.14,
  Commodities: 1.11,
  Stocks: 0.91,
  Crypto: 0.89,
}

export function MarketCard({ category }: { category: MarketCategory }) {
  const { icon: Icon, image, imageLight, title, subtitle, examples, key } = category
  const onLight = useThemeSafe() === 'light'
  const t = useT()
  const iconSrc = onLight && imageLight ? imageLight : image
  const iconScale = (onLight ? ICON_SCALE_LIGHT : ICON_SCALE_DARK)[key] ?? 1
  return (
    <Card3D className="h-full">
      <motion.div variants={fadeUp} className="h-full">
      <Link
        to={`/markets?category=${key}`}
        className="glass-panel card-lift group relative flex h-full flex-col p-6"
      >
        <div className="mb-4 flex items-center justify-between">
          {iconSrc ? (
            <img
              src={asset(iconSrc)}
              alt=""
              aria-hidden
              style={{ transform: `scale(${iconScale})` }}
              className="market-card-icon mask-radial-fade h-36 w-36 shrink-0 object-contain brightness-150 saturate-150 drop-shadow-[0_0_14px_rgba(225,29,46,0.85)]"
            />
          ) : (
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500/10 text-brand-400 ring-1 ring-brand-500/20">
              <Icon className="h-5 w-5" />
            </div>
          )}
          <ArrowUpRight className="h-5 w-5 text-gray-600 transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-brand-400" />
        </div>
        <span className="card-tick mb-2" aria-hidden />
        <h3 className="font-display text-lg font-semibold text-white">{t(`cat.${key}.title`)}</h3>
        <p className="mt-1 text-sm text-white">{t(`cat.${key}.sub`)}</p>
        <p className="mt-3 text-xs font-medium text-white/85">{examples}</p>
        <span className="card-corner-slash" aria-hidden />
      </Link>
      </motion.div>
    </Card3D>
  )
}
