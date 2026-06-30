import { useCallback, useEffect, useState } from 'react'
import { ShieldAlert } from 'lucide-react'
import { Badge, EmptyState } from '@/components/ui'
import { PageTitle } from '@/components/portal/PageTitle'
import { useToast } from '@/context/ToastContext'
import { formatDateTime } from '@/lib/format'
import { ApiError } from '@/lib/api'
import { adminApi, type AuditEntry, type StaffRole, type TeamMember } from '@/lib/adminApi'
import { DataTable, type Column } from '@/components/admin/table'

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

  const teamColumns: Column<TeamMember>[] = [
    {
      key: 'member', header: 'Member', filter: 'text', sortable: true, accessor: (m) => `${m.firstName} ${m.lastName}`,
      render: (m) => (<div><div className="text-white">{m.firstName} {m.lastName}</div><div className="text-xs text-gray-500">{m.email}</div></div>),
    },
    { key: 'email', header: 'Email', filter: 'text', accessor: (m) => m.email },
    {
      key: 'role', header: 'Role', filter: 'select', accessor: (m) => m.role,
      render: (m) => (
        <select
          value={m.role}
          aria-label={`Role for ${m.email}`}
          onChange={(e) => changeRole(m, e.target.value as StaffRole)}
          className="rounded-md border border-white/10 bg-ink-800 px-2 py-1 text-sm text-gray-200"
        >
          <option value="ADMIN">Admin</option>
          <option value="AGENT">Agent</option>
        </select>
      ),
    },
    {
      key: 'status', header: 'Status', filter: 'select', accessor: (m) => m.status,
      render: (m) => <Badge tone={m.status === 'ACTIVE' ? 'success' : 'neutral'} dot>{m.status}</Badge>,
    },
  ]

  return (
    <>
      <PageTitle title="Staff & Settings" subtitle="Manage staff access and review the audit log." />

      <div className="space-y-8">
        <section>
          <h3 className="mb-3 text-sm font-semibold text-white">Team</h3>
          <DataTable columns={teamColumns} rows={team} rowKey={(m) => m.id} loading={loading} error={error} onRetry={load} minWidthClass="min-w-[560px]" />
        </section>

        <section>
          <h3 className="mb-3 text-sm font-semibold text-white">Audit Log</h3>
          {loading ? null : error ? null : audit.length === 0 ? (
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
    </>
  )
}
