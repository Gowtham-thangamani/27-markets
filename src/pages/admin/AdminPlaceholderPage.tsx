import { useLocation } from 'react-router-dom'
import { Construction } from 'lucide-react'
import { PageTitle } from '@/components/portal/PageTitle'
import { navLabelFor } from '@/components/admin/adminNav'

export default function AdminPlaceholderPage() {
  const { pathname } = useLocation()
  const label = navLabelFor(pathname) ?? 'This section'

  return (
    <>
      <PageTitle title={label} subtitle="Centroid-parity section — not built yet." />
      <div className="glass-panel flex flex-col items-center justify-center gap-3 p-12 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-gray-400 ring-1 ring-white/10">
          <Construction className="h-7 w-7" />
        </span>
        <h3 className="text-lg font-semibold text-white">{label} is coming soon</h3>
        <p className="max-w-md text-sm text-gray-400">
          This section mirrors Centroid FXCRM and is on the roadmap. The navigation is in place so the
          structure is ready; the page itself hasn’t been built yet.
        </p>
      </div>
    </>
  )
}
