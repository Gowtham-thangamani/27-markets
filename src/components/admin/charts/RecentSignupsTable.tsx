import { Link } from 'react-router-dom'
import type { AdminDashboard } from '@/lib/adminApi'
import { initials, relativeTime } from '@/lib/format'

export function RecentSignupsTable({ items }: { items: AdminDashboard['recentSignups'] }) {
  return (
    <div className="glass-panel p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Recent Signups</h3>
        <Link to="/admin/clients" className="text-xs text-brand-300 hover:text-brand-200">View all</Link>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-gray-500">No signups yet.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((c) => (
            <li key={c.id} className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-500/15 text-xs font-semibold text-brand-300 ring-1 ring-brand-500/30">
                {initials(c.name)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">{c.name}</p>
                <p className="truncate text-xs text-gray-500">{c.email}</p>
              </div>
              <span className="text-xs text-gray-500">{c.country ?? '—'}</span>
              <span className="text-xs text-gray-600">{relativeTime(c.createdAt)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
