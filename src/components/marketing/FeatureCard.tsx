import type { LucideIcon } from 'lucide-react'
import { motion } from 'framer-motion'
import { Card3D } from '@/components/Card3D'
import { asset } from '@/lib/asset'
import { useThemeSafe } from '@/context/ThemeContext'
import { cardReveal } from '@/lib/motion'

interface FeatureCardProps {
  icon: LucideIcon
  image?: string
  title: string
  description: string
}

export function FeatureCard({ icon: Icon, image, title, description }: FeatureCardProps) {
  const onLight = useThemeSafe() === 'light'
  return (
    <Card3D className="h-full">
      <motion.div
      variants={cardReveal}
      whileHover={{ y: -6 }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      className="glass-panel group relative h-full p-5 transition-shadow duration-300 hover:border-brand-500/40 hover:shadow-[0_0_0_1px_rgba(225,29,46,0.3),0_18px_50px_rgba(0,0,0,0.45),0_0_40px_rgba(225,29,46,0.12)]"
    >
      {onLight && image ? (
        <img
          src={asset(image)}
          alt=""
          aria-hidden
          className="mb-4 h-12 w-12 rounded-xl object-contain transition-transform duration-300 group-hover:scale-110"
        />
      ) : (
        <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-full bg-ink-800 text-brand-400 ring-1 ring-brand-500/25 transition-all duration-300 group-hover:scale-110 group-hover:bg-brand-500 group-hover:text-onaccent group-hover:shadow-[0_0_24px_rgba(225,29,46,0.5)]">
          <Icon className="h-5 w-5" />
        </div>
      )}
      <h3 className="font-display text-base font-semibold text-white">{title}</h3>
      <span className="card-tick mt-2" aria-hidden />
      <p className="mt-2 text-[13px] leading-relaxed text-gray-100">{description}</p>
      <span className="card-corner-slash" aria-hidden />
      </motion.div>
    </Card3D>
  )
}
