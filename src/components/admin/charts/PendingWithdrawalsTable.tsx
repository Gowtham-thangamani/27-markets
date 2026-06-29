import { Link } from 'react-router-dom'
import type { AdminDashboard } from '@/lib/adminApi'
import { relativeTime } from '@/lib/format'

export function PendingWithdrawalsTable({ items }: { items: AdminDashboard['recentWithdrawals'] }) {
  return (
    <div className="glass-panel p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Pending Withdrawals</h3>
        <Link to="/admin/finance" className="text-xs text-brand-300 hover:text-brand-200">View all</Link>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-gray-500">No pending withdrawals.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-500">
              <th className="pb-2 font-medium">Client</th>
              <th className="pb-2 font-medium">Amount</th>
              <th className="pb-2 text-right font-medium">Age</th>
            </tr>
          </thead>
          <tbody>
            {items.map((w) => (
              <tr key={w.id} className="border-t border-white/[0.05]">
                <td className="py-2 text-gray-300">{w.client ?? '—'}</td>
                <td className="py-2 font-medium text-white">{w.amount}</td>
                <td className="py-2 text-right text-xs text-gray-500">{relativeTime(w.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
