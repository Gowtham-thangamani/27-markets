import { useCallback, useEffect, useState } from 'react'
import { UserPlus } from 'lucide-react'
import { Badge, Button, Input, Modal, Select, Textarea } from '@/components/ui'
import { PageTitle } from '@/components/portal/PageTitle'
import { leadSourceLabel, leadStatusLabel, leadStatusTone } from '@/components/admin/adminMaps'
import { useToast } from '@/context/ToastContext'
import { formatDate } from '@/lib/format'
import { ApiError } from '@/lib/api'
import {
  adminApi,
  type Lead,
  type LeadDetail,
  type LeadStatus,
  type StaffMember,
} from '@/lib/adminApi'
import { cn } from '@/lib/cn'
import { DataTable, type Column } from '@/components/admin/table'

const STATUSES: (LeadStatus | 'ALL')[] = ['ALL', 'NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'LOST']

const columns: Column<Lead>[] = [
  {
    key: 'name', header: 'Lead', filter: 'text', sortable: true, accessor: (l) => l.name,
    render: (l) => (
      <div><div className="font-medium text-white">{l.name}</div><div className="text-xs text-gray-500">{l.email}</div></div>
    ),
  },
  { key: 'email', header: 'Email', filter: 'text', accessor: (l) => l.email },
  { key: 'source', header: 'Source', filter: 'select', accessor: (l) => leadSourceLabel[l.source] },
  {
    key: 'assigned', header: 'Assigned', filter: 'select',
    accessor: (l) => (l.assignedTo ? `${l.assignedTo.firstName} ${l.assignedTo.lastName}` : 'Unassigned'),
    render: (l) => l.assignedTo ? `${l.assignedTo.firstName} ${l.assignedTo.lastName}` : <span className="text-gray-600">Unassigned</span>,
  },
  {
    key: 'status', header: 'Status', filter: 'select', accessor: (l) => leadStatusLabel[l.status],
    render: (l) => <Badge tone={leadStatusTone[l.status]} dot>{leadStatusLabel[l.status]}</Badge>,
  },
  { key: 'created', header: 'Created', filter: 'date', sortable: true, accessor: (l) => l.createdAt, render: (l) => formatDate(l.createdAt) },
]

export default function AdminLeadsPage() {
  const toast = useToast()
  const [filter, setFilter] = useState<LeadStatus | 'ALL'>('ALL')
  const [leads, setLeads] = useState<Lead[]>([])
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [active, setActive] = useState<LeadDetail | null>(null)

  const load = useCallback(async (status: LeadStatus | 'ALL') => {
    setLoading(true)
    setError(null)
    try {
      const [l, s] = await Promise.all([
        adminApi.listLeads(status === 'ALL' ? undefined : status),
        adminApi.getStaff(),
      ])
      setLeads(l)
      setStaff(s)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load leads')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load(filter)
  }, [filter, load])

  return (
    <>
      <PageTitle title="Leads" subtitle="Track and convert prospective clients." />

      <div className="no-scrollbar mb-4 flex gap-2 overflow-x-auto">
        {STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={cn(
              'shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors',
              filter === s
                ? 'border-brand-500/50 bg-brand-500/15 text-brand-200'
                : 'border-white/10 text-gray-400 hover:border-white/20 hover:text-white',
            )}
          >
            {s === 'ALL' ? 'All' : leadStatusLabel[s]}
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        rows={leads}
        rowKey={(l) => l.id}
        onRowClick={async (l) => { try { setActive(await adminApi.getLead(l.id)) } catch (e) { toast.error('Could not open lead', (e as Error).message) } }}
        loading={loading}
        error={error}
        onRetry={() => load(filter)}
        emptyIcon={UserPlus}
        emptyTitle="No leads"
        emptyDescription="No leads in this status."
        minWidthClass="min-w-[680px]"
      />

      <LeadDetailModal
        lead={active}
        staff={staff}
        onClose={() => setActive(null)}
        onChanged={(updated) => {
          setActive(updated)
          void load(filter)
        }}
      />
    </>
  )
}

function LeadDetailModal({
  lead,
  staff,
  onClose,
  onChanged,
}: {
  lead: LeadDetail | null
  staff: StaffMember[]
  onClose: () => void
  onChanged: (l: LeadDetail) => void
}) {
  const toast = useToast()
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  const patch = async (p: { status?: LeadStatus; assignedToId?: string | null }) => {
    if (!lead) return
    try {
      onChanged(await adminApi.updateLead(lead.id, p))
      toast.success('Lead updated')
    } catch (e) {
      toast.error('Update failed', (e as Error).message)
    }
  }

  const addNote = async () => {
    if (!lead || note.trim().length === 0) return
    setSaving(true)
    try {
      onChanged(await adminApi.addLeadNote(lead.id, note.trim()))
      setNote('')
    } catch (e) {
      toast.error('Could not add note', (e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={!!lead} onClose={onClose} title={lead?.name} description={lead?.email} className="max-w-xl">
      {lead && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Status"
              value={lead.status}
              options={(['NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'LOST'] as LeadStatus[]).map((s) => ({
                value: s,
                label: leadStatusLabel[s],
              }))}
              onChange={(e) => patch({ status: e.target.value as LeadStatus })}
            />
            <Select
              label="Assigned to"
              value={lead.assignedToId ?? ''}
              options={[
                { value: '', label: 'Unassigned' },
                ...staff.map((s) => ({ value: s.id, label: `${s.firstName} ${s.lastName} (${s.role})` })),
              ]}
              onChange={(e) => patch({ assignedToId: e.target.value || null })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <Info label="Phone" value={lead.phone ?? '—'} />
            <Info label="Country" value={lead.country ?? '—'} />
          </div>

          {lead.message && (
            <div>
              <h4 className="mb-1 text-sm font-semibold text-white">
                Enquiry{lead.subject ? ` — ${lead.subject}` : ''}
              </h4>
              <p className="whitespace-pre-wrap rounded-lg bg-white/[0.04] p-3 text-sm text-gray-200">
                {lead.message}
              </p>
            </div>
          )}

          <div>
            <h4 className="mb-2 text-sm font-semibold text-white">Notes</h4>
            <div className="flex items-end gap-2">
              <Textarea label="" placeholder="Log a call or note…" value={note} onChange={(e) => setNote(e.target.value)} className="min-h-[56px]" />
              <Button onClick={addNote} loading={saving} className="mb-0.5">
                Add
              </Button>
            </div>
            <div className="mt-3 space-y-2">
              {lead.notes.length === 0 ? (
                <p className="text-sm text-gray-500">No notes yet.</p>
              ) : (
                lead.notes.map((n) => (
                  <div key={n.id} className="rounded-lg border border-white/[0.06] bg-ink-800/40 p-3 text-sm">
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{n.author.firstName} {n.author.lastName}</span>
                      <span>{formatDate(n.createdAt)}</span>
                    </div>
                    <p className="mt-1 text-gray-200">{n.body}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-ink-800/40 p-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-0.5 font-medium text-white">{value}</p>
    </div>
  )
}
