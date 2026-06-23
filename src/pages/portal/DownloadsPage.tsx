import { motion } from 'framer-motion'
import { Monitor, Smartphone, Globe, FileText, Download, type LucideIcon } from 'lucide-react'
import { Badge, Button } from '@/components/ui'
import { PageTitle } from '@/components/portal/PageTitle'
import { useToast } from '@/context/ToastContext'
import { downloads } from '@/mock/data'
import { fadeUp, staggerContainer } from '@/lib/motion'

const iconMap: Record<string, LucideIcon> = {
  desktop: Monitor,
  mobile: Smartphone,
  web: Globe,
  doc: FileText,
}

export default function DownloadsPage() {
  const toast = useToast()

  return (
    <>
      <PageTitle
        title="Download Center"
        subtitle="Get the 27 Markets trading platforms and account documents."
      />

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        {downloads.map((d) => {
          const Icon = iconMap[d.icon]
          const isDoc = d.icon === 'doc'
          const isWeb = d.icon === 'web'
          return (
            <motion.div key={d.id} variants={fadeUp} className="glass-panel card-lift flex flex-col p-5">
              <div className="flex items-center justify-between">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500/10 text-brand-400 ring-1 ring-brand-500/20">
                  <Icon className="h-6 w-6" />
                </span>
                <Badge tone="neutral">{d.version}</Badge>
              </div>
              <h3 className="mt-4 font-display text-base font-semibold text-white">{d.name}</h3>
              <p className="mt-1 flex-1 text-sm leading-relaxed text-gray-400">{d.description}</p>
              <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
                <span>{d.platform}</span>
                <span>{d.size}</span>
              </div>
              <Button
                variant={isWeb ? 'primary' : 'outline'}
                fullWidth
                className="mt-4 gap-1.5"
                onClick={() =>
                  toast.info(
                    isWeb ? 'Launching WebTrader' : 'Download started',
                    isDoc ? 'Your document is downloading.' : `${d.name} is downloading.`
                  )
                }
              >
                <Download className="h-4 w-4" />
                {isWeb ? 'Launch' : isDoc ? 'Download PDF' : 'Download'}
              </Button>
            </motion.div>
          )
        })}
      </motion.div>
    </>
  )
}
