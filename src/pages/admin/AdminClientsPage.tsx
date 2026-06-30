import { useCallback, useEffect, useState } from 'react'
import { Search, Users, Pin } from 'lucide-react'
import { Badge, Button, Input, Modal, Textarea } from '@/components/ui'
import { PageTitle } from '@/components/portal/PageTitle'
import { kycSummary } from '@/components/admin/adminMaps'
import { useToast } from '@/context/ToastContext'
import { formatCurrency, formatDate, initials } from '@/lib/format'
import { ApiError } from '@/lib/api'
import { adminApi, type ClientDetail, type ClientListItem } from '@/lib/adminApi'
import { DataTable, type Column } from '@/components/admin/table'

export default function AdminClientsPage() {
  const toast = useToast()
  const [search, setSearch] = useState('')
  const [clients, setClients] = useState<ClientListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [active, setActive] = useState<ClientDetail | null>(null)

  const load = useCallback(async (q?: string) => {
    setLoading(true)
    setError(null)
    try {
      setClients(await adminApi.listClients(q))
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load clients')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  // Debounced search.
  useEffect(() => {
    const t = setTimeout(() => void load(search || undefined), 300)
    return () => clearTimeout(t)
  }, [search, load])

  const openClient = async (id: string) => {
    try {
      setActive(await adminApi.getClient(id))
    } catch (e) {
      toast.error('Could not open client', (e as Error).message)
    }
  }

  const columns: Column<ClientListItem>[] = [
    {
      key: 'name', header: 'Client', filter: 'text', sortable: true,
      accessor: (c) => `${c.firstName} ${c.lastName}`,
      render: (c) => (
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-500/15 text-xs font-semibold text-brand-300 ring-1 ring-brand-500/30">
            {initials(`${c.firstName} ${c.lastName}`)}
          </span>
          <div>
            <div className="font-medium text-white">{c.firstName} {c.lastName}</div>
            <div className="text-xs text-gray-500">{c.email}</div>
          </div>
        </div>
      ),
    },
    { key: 'email', header: 'Email', filter: 'text', accessor: (c) => c.email },
    { key: 'country', header: 'Country', filter: 'select', accessor: (c) => c.country ?? '', render: (c) => c.country ?? '—' },
    { key: 'accounts', header: 'Accounts', align: 'center', accessor: (c) => c._count.tradingAccounts },
    {
      key: 'kyc', header: 'KYC', filter: 'select', accessor: (c) => kycSummary(c.kycProfile).label,
      render: (c) => { const k = kycSummary(c.kycProfile); return <Badge tone={k.tone} dot>{k.label}</Badge> },
    },
    { key: 'joined', header: 'Joined', filter: 'date', sortable: true, accessor: (c) => c.createdAt, render: (c) => formatDate(c.createdAt) },
  ]

  return (
    <>
      <PageTitle title="Clients" subtitle="Search and manage client accounts." />

      <div className="mb-4 max-w-sm">
        <Input
          placeholder="Search name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          icon={<Search className="h-4 w-4" />}
          aria-label="Search clients"
        />
      </div>

      <DataTable
        columns={columns}
        rows={clients}
        rowKey={(c) => c.id}
        onRowClick={(c) => openClient(c.id)}
        loading={loading}
        error={error}
        onRetry={() => load(search || undefined)}
        emptyIcon={Users}
        emptyTitle="No clients found"
        emptyDescription="Try a different search."
        minWidthClass="min-w-[640px]"
      />

      <ClientDetailModal
        client={active}
        onClose={() => setActive(null)}
        onNoteAdded={(updated) => setActive(updated)}
      />
    </>
  )
}

function ClientDetailModal({
  client,
  onClose,
  onNoteAdded,
}: {
  client: ClientDetail | null
  onClose: () => void
  onNoteAdded: (c: ClientDetail) => void
}) {
  const toast = useToast()
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  const addNote = async () => {
    if (!client || note.trim().length === 0) return
    setSaving(true)
    try {
      const updated = await adminApi.addClientNote(client.id, note.trim())
      setNote('')
      onNoteAdded(updated)
      toast.success('Note added')
    } catch (e) {
      toast.error('Could not add note', (e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={!!client} onClose={onClose} title={client?.name} description={client?.email} className="max-w-2xl">
      {client && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <Field label="Phone" value={client.phone ?? '—'} />
            <Field label="Country" value={client.country ?? '—'} />
            <Field label="Status" value={client.status} />
            <Field label="Joined" value={formatDate(client.joinedAt)} />
          </div>

          <div>
            <h4 className="mb-2 text-sm font-semibold text-white">Accounts</h4>
            {client.accounts.length === 0 ? (
              <p className="text-sm text-gray-500">No accounts.</p>
            ) : (
              <div className="space-y-2">
                {client.accounts.map((a) => (
                  <div key={a.id} className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-ink-800/50 px-4 py-2.5 text-sm">
                    <span className="text-gray-300">
                      {a.number} · {a.type} <Badge tone={a.mode === 'DEMO' ? 'info' : 'brand'}>{a.mode}</Badge>
                    </span>
                    <span className="font-medium text-white">{formatCurrency(Number(a.balance))}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h4 className="mb-2 text-sm font-semibold text-white">Notes</h4>
            <div className="flex items-end gap-2">
              <Textarea label="" placeholder="Add an internal note…" value={note} onChange={(e) => setNote(e.target.value)} className="min-h-[56px]" />
              <Button onClick={addNote} loading={saving} className="mb-0.5">
                Add
              </Button>
            </div>
            <div className="mt-3 space-y-2">
              {client.notes.length === 0 ? (
                <p className="text-sm text-gray-500">No notes yet.</p>
              ) : (
                client.notes.map((n) => (
                  <div key={n.id} className="rounded-lg border border-white/[0.06] bg-ink-800/40 p-3 text-sm">
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span className="flex items-center gap-1.5">
                        {n.pinned && <Pin className="h-3 w-3 text-brand-400" />}
                        {n.author.firstName} {n.author.lastName}
                      </span>
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

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-ink-800/40 p-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-0.5 font-medium text-white">{value}</p>
    </div>
  )
}
