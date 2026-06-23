import { useCallback, useEffect, useState } from 'react'
import { LifeBuoy, Send, Lock } from 'lucide-react'
import { Badge, Button, Modal, Select, Textarea, EmptyState, ErrorState, SkeletonRows } from '@/components/ui'
import { PageTitle } from '@/components/portal/PageTitle'
import { useToast } from '@/context/ToastContext'
import { formatDate, formatDateTime } from '@/lib/format'
import { ApiError } from '@/lib/api'
import {
  ticketPriorityLabel,
  ticketPriorityTone,
  ticketStatusLabel,
  ticketStatusTone,
  type TicketPriority,
  type TicketStatus,
} from '@/lib/supportApi'
import { adminApi, type AdminTicketDetail, type AdminTicketListItem, type StaffMember } from '@/lib/adminApi'
import { cn } from '@/lib/cn'

const FILTERS: (TicketStatus | 'ALL')[] = ['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED']

export default function AdminSupportPage() {
  const toast = useToast()
  const [filter, setFilter] = useState<TicketStatus | 'ALL'>('ALL')
  const [tickets, setTickets] = useState<AdminTicketListItem[]>([])
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [active, setActive] = useState<AdminTicketDetail | null>(null)

  const load = useCallback(async (status: TicketStatus | 'ALL') => {
    setLoading(true)
    setError(null)
    try {
      const [t, s] = await Promise.all([
        adminApi.listTickets(status === 'ALL' ? undefined : status),
        adminApi.getStaff(),
      ])
      setTickets(t)
      setStaff(s)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load tickets')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load(filter)
  }, [filter, load])

  return (
    <>
      <PageTitle title="Support" subtitle="Client tickets across the desk." />

      <div className="no-scrollbar mb-4 flex gap-2 overflow-x-auto">
        {FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={cn(
              'shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors',
              filter === s
                ? 'border-brand-500/50 bg-brand-500/15 text-brand-200'
                : 'border-white/10 text-gray-400 hover:border-white/20 hover:text-white',
            )}
          >
            {s === 'ALL' ? 'All' : ticketStatusLabel[s]}
          </button>
        ))}
      </div>

      {error ? (
        <ErrorState description={error} onRetry={() => load(filter)} />
      ) : loading ? (
        <SkeletonRows rows={5} />
      ) : tickets.length === 0 ? (
        <EmptyState icon={LifeBuoy} title="No tickets" description="Nothing in this queue." />
      ) : (
        <div className="glass-panel overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="px-5 py-3 font-medium">Subject</th>
                  <th className="px-5 py-3 font-medium">Client</th>
                  <th className="px-5 py-3 font-medium">Priority</th>
                  <th className="px-5 py-3 font-medium">Assigned</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04] text-sm">
                {tickets.map((t) => (
                  <tr
                    key={t.id}
                    onClick={async () => {
                      try {
                        setActive(await adminApi.getTicket(t.id))
                      } catch (e) {
                        toast.error('Could not open ticket', (e as Error).message)
                      }
                    }}
                    className="cursor-pointer transition-colors hover:bg-white/[0.02]"
                  >
                    <td className="px-5 py-3.5 font-medium text-white">{t.subject}</td>
                    <td className="px-5 py-3.5 text-gray-300">
                      {t.user.firstName} {t.user.lastName}
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge tone={ticketPriorityTone[t.priority]}>{ticketPriorityLabel[t.priority]}</Badge>
                    </td>
                    <td className="px-5 py-3.5 text-gray-300">
                      {t.assignedTo ? `${t.assignedTo.firstName} ${t.assignedTo.lastName}` : <span className="text-gray-600">—</span>}
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge tone={ticketStatusTone[t.status]} dot>
                        {ticketStatusLabel[t.status]}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 text-gray-400">{formatDate(t.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AdminTicketModal
        ticket={active}
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

function AdminTicketModal({
  ticket,
  staff,
  onClose,
  onChanged,
}: {
  ticket: AdminTicketDetail | null
  staff: StaffMember[]
  onClose: () => void
  onChanged: (t: AdminTicketDetail) => void
}) {
  const toast = useToast()
  const [body, setBody] = useState('')
  const [internal, setInternal] = useState(false)
  const [sending, setSending] = useState(false)

  const patch = async (p: { status?: TicketStatus; priority?: TicketPriority; assignedToId?: string | null }) => {
    if (!ticket) return
    try {
      onChanged(await adminApi.updateTicket(ticket.id, p))
    } catch (e) {
      toast.error('Update failed', (e as Error).message)
    }
  }

  const send = async () => {
    if (!ticket || body.trim().length === 0) return
    setSending(true)
    try {
      onChanged(await adminApi.replyTicket(ticket.id, body.trim(), internal))
      setBody('')
    } catch (e) {
      toast.error('Could not send', (e as Error).message)
    } finally {
      setSending(false)
    }
  }

  return (
    <Modal open={!!ticket} onClose={onClose} title={ticket?.subject} description={ticket ? `${ticket.user.firstName} ${ticket.user.lastName} · ${ticket.category}` : undefined} className="max-w-2xl">
      {ticket && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <Select
              label="Status"
              value={ticket.status}
              options={(['OPEN', 'IN_PROGRESS', 'RESOLVED'] as TicketStatus[]).map((s) => ({ value: s, label: ticketStatusLabel[s] }))}
              onChange={(e) => patch({ status: e.target.value as TicketStatus })}
            />
            <Select
              label="Priority"
              value={ticket.priority}
              options={(['LOW', 'MEDIUM', 'HIGH'] as TicketPriority[]).map((p) => ({ value: p, label: ticketPriorityLabel[p] }))}
              onChange={(e) => patch({ priority: e.target.value as TicketPriority })}
            />
            <Select
              label="Assigned"
              value={ticket.assignedTo ? staff.find((s) => `${s.firstName} ${s.lastName}` === `${ticket.assignedTo!.firstName} ${ticket.assignedTo!.lastName}`)?.id ?? '' : ''}
              options={[{ value: '', label: 'Unassigned' }, ...staff.map((s) => ({ value: s.id, label: `${s.firstName} ${s.lastName}` }))]}
              onChange={(e) => patch({ assignedToId: e.target.value || null })}
            />
          </div>

          <div className="max-h-64 space-y-3 overflow-y-auto rounded-xl border border-white/[0.06] bg-ink-800/40 p-3">
            {ticket.messages.map((m) => {
              const staffMsg = m.author.role !== 'CLIENT'
              return (
                <div key={m.id} className={cn('rounded-lg p-2.5 text-sm', m.internal ? 'bg-warning/10 ring-1 ring-warning/20' : staffMsg ? 'bg-brand-500/10' : 'bg-ink-700')}>
                  <div className="mb-1 flex items-center gap-2 text-[11px] text-gray-400">
                    <span className="font-medium">{m.author.firstName} {m.author.lastName}</span>
                    {staffMsg && <span className="text-brand-300">Staff</span>}
                    {m.internal && <span className="flex items-center gap-0.5 text-warning"><Lock className="h-2.5 w-2.5" /> Internal</span>}
                    <span className="ml-auto">{formatDateTime(m.createdAt)}</span>
                  </div>
                  <p className="text-gray-200">{m.body}</p>
                </div>
              )
            })}
          </div>

          <div>
            <Textarea label="Reply" placeholder="Write a reply…" value={body} onChange={(e) => setBody(e.target.value)} className="min-h-[64px]" />
            <div className="mt-2 flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-gray-400">
                <input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} className="h-4 w-4 rounded border-white/20 bg-ink-800 accent-brand-500" />
                Internal note (hidden from client)
              </label>
              <Button onClick={send} loading={sending} className="gap-1.5">
                <Send className="h-4 w-4" /> Send
              </Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}
