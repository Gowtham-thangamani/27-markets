import { Activity } from 'lucide-react'
import type { AdminDashboard } from '@/lib/adminApi'
import { relativeTime } from '@/lib/format'

const LABELS: Record<string, string> = {
  'funds.deposit': 'recorded a deposit',
  'funds.withdraw': 'requested a withdrawal',
  'finance.withdrawal.approve': 'approved a withdrawal',
  'finance.withdrawal.reject': 'rejected a withdrawal',
  'kyc.review': 'reviewed a KYC document',
}

export function ActivityFeed({ items }: { items: AdminDashboard['recentActivity'] }) {
  return (
    <div className="glass-panel p-5">
      <h3 className="mb-4 text-sm font-semibold text-white">Recent Activity</h3>
      {items.length === 0 ? (
        <p className="text-sm text-gray-500">No recent activity.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((a) => (
            <li key={a.id} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-brand-500/10 text-brand-400">
                <Activity className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-gray-300">
                  <span className="font-medium text-white">{a.actor ?? 'System'}</span>{' '}
                  {LABELS[a.action] ?? a.action}
                </p>
                <p className="text-xs text-gray-500">{relativeTime(a.createdAt)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
