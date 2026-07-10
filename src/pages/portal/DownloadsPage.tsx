import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Monitor, Smartphone, Globe, FileText, Download, type LucideIcon } from 'lucide-react'
import { Badge, Button } from '@/components/ui'
import { PageTitle } from '@/components/portal/PageTitle'
import { useToast } from '@/context/ToastContext'
import { downloadsApi, type DownloadItem } from '@/lib/downloadsApi'
import { fadeUp, staggerContainer } from '@/lib/motion'

const iconMap: Record<string, LucideIcon> = {
  desktop: Monitor,
  mobile: Smartphone,
  web: Globe,
  doc: FileText,
}

export default function DownloadsPage() {
  const toast = useToast()
  const [items, setItems] = useState<DownloadItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    downloadsApi
      .list()
      .then((rows) => {
        if (active) setItems(rows)
      })
      .catch(() => {
        if (active) setItems([])
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  return (
    <>
      <PageTitle
        title="Download Center"
        subtitle="Get the 27 Markets trading platforms and account documents."
      />

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="glass-panel h-52 animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="glass-panel p-8 text-center text-sm text-gray-400">
          No downloads are available right now. Please check back soon.
        </div>
      ) : (
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {items.map((d) => {
            const Icon = iconMap[d.icon] ?? Monitor
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
                {d.url ? (
                  <a
                    href={d.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="mt-4 block"
                  >
                    <Button variant="outline" fullWidth className="gap-1.5">
                      <Download className="h-4 w-4" /> Download
                    </Button>
                  </a>
                ) : (
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
                )}
              </motion.div>
            )
          })}
        </motion.div>
      )}
    </>
  )
}
