import { useCallback, useEffect, useState } from 'react'
import { ShieldAlert } from 'lucide-react'
import { Badge, EmptyState, ErrorState, SkeletonRows } from '@/components/ui'
import { PageTitle } from '@/components/portal/PageTitle'
import { useToast } from '@/context/ToastContext'
import { formatDateTime } from '@/lib/format'
import { ApiError } from '@/lib/api'
import { adminApi, type AuditEntry, type StaffRole, type TeamMember } from '@/lib/adminApi'

export default function AdminStaffPage() {
  const toast = useToast()
  const [team, setTeam] = useState<TeamMember[]>([])
  const [audit, setAudit] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [t, a] = await Promise.all([adminApi.listTeam(), adminApi.getAuditLog()])
      setTeam(t)
      setAudit(a)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const changeRole = async (m: TeamMember, role: StaffRole) => {
    try {
      await adminApi.setStaffRole(m.id, role)
      toast.success('Role updated', `${m.firstName} ${m.lastName} → ${role}`)
      await load()
    } catch (e) {
      const msg = e instanceof ApiError && e.status === 403 ? 'Only admins can change roles.' : (e as Error).message
      toast.error('Update failed', msg)
    }
  }

  return (
    <>
      <PageTitle title="Staff & Settings" subtitle="Manage staff access and review the audit log." />

      {error ? (
        <ErrorState description={error} onRetry={load} />
      ) : loading ? (
        <SkeletonRows rows={5} />
      ) : (
        <div className="space-y-8">
          <section>
            <h3 className="mb-3 text-sm font-semibold text-white">Team</h3>
            <div className="glass-panel overflow-hidden p-0">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-gray-500">
                    <th className="px-5 py-3 font-medium">Member</th>
                    <th className="px-5 py-3 font-medium">Role</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {team.map((m) => (
                    <tr key={m.id}>
                      <td className="px-5 py-3">
                        <div className="text-white">{m.firstName} {m.lastName}</div>
                        <div className="text-xs text-gray-500">{m.email}</div>
                      </td>
                      <td className="px-5 py-3">
                        <select
                          value={m.role}
                          aria-label={`Role for ${m.email}`}
                          onChange={(e) => changeRole(m, e.target.value as StaffRole)}
                          className="rounded-md border border-white/10 bg-ink-800 px-2 py-1 text-sm text-gray-200"
                        >
                          <option value="ADMIN">Admin</option>
                          <option value="AGENT">Agent</option>
                        </select>
                      </td>
                      <td className="px-5 py-3">
                        <Badge tone={m.status === 'ACTIVE' ? 'success' : 'neutral'} dot>{m.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-sm font-semibold text-white">Audit Log</h3>
            {audit.length === 0 ? (
              <EmptyState icon={ShieldAlert} title="No activity yet" description="State-changing actions will appear here." />
            ) : (
              <div className="glass-panel divide-y divide-white/[0.04] p-0">
                {audit.map((a) => (
                  <div key={a.id} className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm">
                    <span className="min-w-0 truncate text-gray-300">
                      <span className="font-mono text-xs text-brand-300">{a.action}</span>
                      {a.entity ? ` · ${a.entity}` : ''}
                      {a.user ? ` · ${a.user.firstName} ${a.user.lastName}` : ''}
                    </span>
                    <span className="shrink-0 text-xs text-gray-500">{formatDateTime(a.createdAt)}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </>
  )
}
