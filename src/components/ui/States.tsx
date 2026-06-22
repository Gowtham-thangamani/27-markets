import { AlertTriangle, Inbox, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from './Button'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ icon: Icon = Inbox, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-ink-800/40 px-6 py-14 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-400">
        <Icon className="h-7 w-7" />
      </div>
      <h3 className="font-display text-lg font-semibold text-white">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm text-gray-400">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

interface ErrorStateProps {
  title?: string
  description?: string
  onRetry?: () => void
}

export function ErrorState({
  title = 'Something went wrong',
  description = 'We could not load this content. Please try again.',
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-danger/20 bg-danger/[0.04] px-6 py-14 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-danger/10 text-danger">
        <AlertTriangle className="h-7 w-7" />
      </div>
      <h3 className="font-display text-lg font-semibold text-white">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-gray-400">{description}</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-5" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  )
}
