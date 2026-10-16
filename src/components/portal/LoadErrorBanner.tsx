import { AlertTriangle } from 'lucide-react'
import { usePortalData } from '@/context/PortalDataContext'

/**
 * Says so when part of the portal's data failed to load.
 *
 * Every portal page renders an empty list when it has nothing to show, and no
 * page read the load error — so a failed request was indistinguishable from an
 * account with no accounts, no transactions and no KYC. Mounted once in the
 * layout, this covers every page at once.
 */
export function LoadErrorBanner() {
  const { error, loading, refresh } = usePortalData()

  if (!error || loading) return null

  return (
    <div
      role="alert"
      className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3"
    >
      <div className="flex items-center gap-2 text-sm text-danger">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        Some of your data could not be loaded, so this page may be incomplete. {error}
      </div>
      <button
        type="button"
        onClick={() => void refresh()}
        className="rounded-lg border border-danger/40 px-3 py-1.5 text-xs font-medium text-danger transition-colors hover:bg-danger/15"
      >
        Retry
      </button>
    </div>
  )
}
