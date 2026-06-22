import { motion } from 'framer-motion'
import { cn } from '@/lib/cn'

export interface TabItem {
  id: string
  label: string
  icon?: React.ReactNode
}

interface TabsProps {
  tabs: TabItem[]
  active: string
  onChange: (id: string) => void
  className?: string
  layoutId?: string
}

export function Tabs({ tabs, active, onChange, className, layoutId = 'tab-pill' }: TabsProps) {
  return (
    <div
      role="tablist"
      className={cn(
        'no-scrollbar inline-flex max-w-full gap-1 overflow-x-auto rounded-xl border border-white/[0.06] bg-ink-800/70 p-1',
        className
      )}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === active
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={cn(
              'relative inline-flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
              isActive ? 'text-white' : 'text-gray-400 hover:text-gray-200'
            )}
          >
            {isActive && (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 rounded-lg bg-brand-500/90 shadow-[0_4px_20px_-4px_rgba(225,29,46,0.6)]"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              {tab.icon}
              {tab.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
