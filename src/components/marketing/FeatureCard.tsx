import type { LucideIcon } from 'lucide-react'
import { motion } from 'framer-motion'
import { fadeUp } from '@/lib/motion'

interface FeatureCardProps {
  icon: LucideIcon
  title: string
  description: string
}

export function FeatureCard({ icon: Icon, title, description }: FeatureCardProps) {
  return (
    <motion.div variants={fadeUp} className="glass-panel card-lift group h-full p-6">
      <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500/10 text-brand-400 ring-1 ring-brand-500/20 transition-all duration-300 group-hover:bg-brand-500 group-hover:text-white group-hover:shadow-[0_0_24px_rgba(225,29,46,0.5)]">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="font-display text-lg font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-gray-400">{description}</p>
    </motion.div>
  )
}
