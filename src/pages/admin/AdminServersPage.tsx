import { useCallback, useEffect, useState } from 'react'
import { Pencil, Plus, Server, Trash2 } from 'lucide-react'
import { Badge, Button, EmptyState, ErrorState, Input, Modal, SkeletonRows } from '@/components/ui'
import { PageTitle } from '@/components/portal/PageTitle'
import { useToast } from '@/context/ToastContext'
import { ApiError } from '@/lib/api'
import { adminApi, type TradingServer, type TradingServerInput } from '@/lib/adminApi'

export default function AdminServersPage() {
  const toast = useToast()
  const [rows, setRows] = useState<TradingServer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [editing, setEditing] = useState<TradingServer | 'new' | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setRows(await adminApi.listServers())
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load servers')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const fail = (e: unknown) =>
    toast.error('Action failed', e instanceof ApiError && e.status === 403 ? 'Only admins can manage servers.' : (e as Error).message)

  const toggle = async (s: TradingServer) => {
    setBusy(s.id)
    try {
      await adminApi.updateServer(s.id, { enabled: !s.enabled })
      await load()
    } catch (e) {
      fail(e)
    } finally {
      setBusy(null)
    }
  }

  const remove = async (s: TradingServer) => {
    if (!window.confirm(`Delete server "${s.name}"? This cannot be undone.`)) return
    setBusy(s.id)
    try {
      await adminApi.deleteServer(s.id)
      toast.success('Server deleted')
      await load()
    } catch (e) {
      fail(e)
    } finally {
      setBusy(null)
    }
  }

  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <PageTitle title="Servers" subtitle="Trading servers clients connect to." />
        <Button onClick={() => setEditing('new')} className="gap-1.5">
          <Plus className="h-4 w-4" /> Add server
        </Button>
      </div>

      {error ? (
        <ErrorState description={error} onRetry={load} />
      ) : loading ? (
        <SkeletonRows rows={3} />
      ) : rows.length === 0 ? (
        <EmptyState icon={Server} title="No servers" description="Add a trading server clients can connect to." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((s) => (
            <div key={s.id} className="glass-panel flex flex-col gap-4 p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-white">{s.name}</h3>
                    <Badge tone={s.environment === 'LIVE' ? 'brand' : 'info'}>{s.environment}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">{s.platform} · {s.host}</p>
                </div>
                <Badge tone={s.enabled ? 'success' : 'neutral'} dot>{s.enabled ? 'Enabled' : 'Disabled'}</Badge>
              </div>

              <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-white/[0.06] pt-3">
                <Button size="sm" variant="outline" loading={busy === s.id} onClick={() => toggle(s)}>
                  {s.enabled ? 'Disable' : 'Enable'}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditing(s)} className="gap-1">
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </Button>
                <Button size="sm" variant="outline" onClick={() => remove(s)} className="ml-auto gap-1 border-danger/40 text-danger hover:bg-danger/10">
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ServerModal
        target={editing}
        onClose={() => setEditing(null)}
        onSaved={async (created) => {
          setEditing(null)
          await load()
          toast.success(created ? 'Server added' : 'Server updated')
        }}
        onError={fail}
      />
    </>
  )
}

function ServerModal({
  target,
  onClose,
  onSaved,
  onError,
}: {
  target: TradingServer | 'new' | null
  onClose: () => void
  onSaved: (created: boolean) => void
  onError: (e: unknown) => void
}) {
  const isNew = target === 'new'
  const server = target && target !== 'new' ? target : null
  const [form, setForm] = useState<TradingServerInput>({ name: '', host: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (target === 'new') {
      setForm({ name: '', host: '', platform: 'MT5', environment: 'LIVE', enabled: true, sortOrder: 0 })
    } else if (target) {
      setForm({ name: target.name, host: target.host, platform: target.platform, environment: target.environment, enabled: target.enabled, sortOrder: target.sortOrder })
    }
  }, [target])

  if (!target) return null
  const set = <K extends keyof TradingServerInput>(k: K, v: TradingServerInput[K]) => setForm((f) => ({ ...f, [k]: v }))

  const save = async () => {
    if (!form.name.trim() || !form.host.trim()) {
      onError(new Error('Name and host are required'))
      return
    }
    setSaving(true)
    try {
      if (isNew) await adminApi.createServer(form)
      else if (server) await adminApi.updateServer(server.id, form)
      onSaved(isNew)
    } catch (e) {
      onError(e)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={!!target} onClose={onClose} title={isNew ? 'Add server' : `Edit ${server?.name}`} className="max-w-lg">
      <div className="space-y-4">
        <Input label="Name" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="27Markets-Live" />
        <Input label="Host" value={form.host} onChange={(e) => set('host', e.target.value)} placeholder="live.mt5.27markets.com" />
        <div className="grid grid-cols-2 gap-4">
          <Input label="Platform" value={form.platform ?? ''} onChange={(e) => set('platform', e.target.value)} placeholder="MT5" />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-300">Environment</label>
            <select
              value={form.environment ?? 'LIVE'}
              onChange={(e) => set('environment', e.target.value as 'LIVE' | 'DEMO')}
              className="w-full rounded-lg border border-white/10 bg-ink-800 px-3 py-2.5 text-sm text-white focus:border-brand-500/50 focus:outline-none"
            >
              <option value="LIVE">LIVE</option>
              <option value="DEMO">DEMO</option>
            </select>
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-300">
          <input
            type="checkbox"
            checked={form.enabled ?? true}
            onChange={(e) => set('enabled', e.target.checked)}
            className="h-4 w-4 rounded border-white/20 bg-ink-800 text-brand-500 focus:ring-brand-500/40"
          />
          Enabled
        </label>
        <div className="flex justify-end gap-2 border-t border-white/[0.06] pt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button loading={saving} onClick={save}>{isNew ? 'Add server' : 'Save changes'}</Button>
        </div>
      </div>
    </Modal>
  )
}
