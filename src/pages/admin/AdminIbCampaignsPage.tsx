import { useCallback, useEffect, useState } from 'react'
import { Megaphone, Pencil, Plus, Trash2 } from 'lucide-react'
import { Badge, Button, EmptyState, ErrorState, Input, Modal, SkeletonRows, Textarea } from '@/components/ui'
import { PageTitle } from '@/components/portal/PageTitle'
import { useToast } from '@/context/ToastContext'
import { ApiError } from '@/lib/api'
import { adminApi, type IbCampaign, type IbCampaignInput } from '@/lib/adminApi'

export default function AdminIbCampaignsPage() {
  const toast = useToast()
  const [rows, setRows] = useState<IbCampaign[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [editing, setEditing] = useState<IbCampaign | 'new' | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setRows(await adminApi.listIbCampaigns())
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const fail = (e: unknown) =>
    toast.error('Action failed', e instanceof ApiError && e.status === 403 ? 'Only admins can manage IB campaigns.' : (e as Error).message)

  const toggle = async (c: IbCampaign) => {
    setBusy(c.id)
    try {
      await adminApi.updateIbCampaign(c.id, { enabled: !c.enabled })
      await load()
    } catch (e) {
      fail(e)
    } finally {
      setBusy(null)
    }
  }

  const remove = async (c: IbCampaign) => {
    if (!window.confirm(`Delete IB campaign "${c.name}"?`)) return
    setBusy(c.id)
    try {
      await adminApi.deleteIbCampaign(c.id)
      toast.success('Deleted')
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
        <PageTitle title="IB Campaigns" subtitle="Introducing-broker campaigns and tracking codes." />
        <Button onClick={() => setEditing('new')} className="gap-1.5"><Plus className="h-4 w-4" /> New campaign</Button>
      </div>

      {error ? (
        <ErrorState description={error} onRetry={load} />
      ) : loading ? (
        <SkeletonRows rows={3} />
      ) : rows.length === 0 ? (
        <EmptyState icon={Megaphone} title="No IB campaigns" description="Create your first IB campaign." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((c) => (
            <div key={c.id} className="glass-panel flex flex-col gap-3 p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-white">{c.name}</h3>
                  <code className="mt-0.5 inline-block rounded bg-white/5 px-1.5 py-0.5 text-xs text-brand-300">{c.code}</code>
                </div>
                <Badge tone={c.enabled ? 'success' : 'neutral'} dot>{c.enabled ? 'Enabled' : 'Disabled'}</Badge>
              </div>
              {c.description && <p className="line-clamp-2 text-xs text-gray-500">{c.description}</p>}
              <div className="mt-auto flex items-center gap-2 border-t border-white/[0.06] pt-3">
                <Button size="sm" variant="outline" loading={busy === c.id} onClick={() => toggle(c)}>{c.enabled ? 'Disable' : 'Enable'}</Button>
                <Button size="sm" variant="outline" onClick={() => setEditing(c)} className="gap-1"><Pencil className="h-3.5 w-3.5" /> Edit</Button>
                <Button size="sm" variant="outline" loading={busy === c.id} onClick={() => remove(c)} className="ml-auto gap-1 border-danger/40 text-danger hover:bg-danger/10"><Trash2 className="h-3.5 w-3.5" /> Delete</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <IbCampaignModal
        target={editing}
        onClose={() => setEditing(null)}
        onSaved={async (created) => { setEditing(null); await load(); toast.success(created ? 'Campaign created' : 'Campaign updated') }}
        onError={fail}
      />
    </>
  )
}

function IbCampaignModal({
  target,
  onClose,
  onSaved,
  onError,
}: {
  target: IbCampaign | 'new' | null
  onClose: () => void
  onSaved: (created: boolean) => void
  onError: (e: unknown) => void
}) {
  const isNew = target === 'new'
  const campaign = target && target !== 'new' ? target : null
  const [form, setForm] = useState<IbCampaignInput>({ name: '', code: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (target === 'new') setForm({ name: '', code: '', description: '', enabled: true })
    else if (target) setForm({ name: target.name, code: target.code, description: target.description ?? '', enabled: target.enabled })
  }, [target])

  if (!target) return null
  const set = <K extends keyof IbCampaignInput>(k: K, v: IbCampaignInput[K]) => setForm((f) => ({ ...f, [k]: v }))

  const save = async () => {
    if (!form.name.trim() || !form.code.trim()) { onError(new Error('Name and code are required')); return }
    setSaving(true)
    try {
      if (isNew) await adminApi.createIbCampaign(form)
      else if (campaign) await adminApi.updateIbCampaign(campaign.id, form)
      onSaved(isNew)
    } catch (e) {
      onError(e)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={!!target} onClose={onClose} title={isNew ? 'New IB campaign' : `Edit ${campaign?.name}`} className="max-w-lg">
      <div className="space-y-4">
        <Input label="Name" value={form.name} onChange={(e) => set('name', e.target.value)} />
        <Input label="Tracking code" value={form.code} onChange={(e) => set('code', e.target.value)} placeholder="IB-YT" />
        <Textarea label="Description" rows={3} value={form.description ?? ''} onChange={(e) => set('description', e.target.value)} />
        <label className="flex items-center gap-2 text-sm text-gray-300">
          <input type="checkbox" checked={form.enabled ?? true} onChange={(e) => set('enabled', e.target.checked)} className="h-4 w-4 rounded border-white/20 bg-ink-800 text-brand-500 focus:ring-brand-500/40" />
          Enabled
        </label>
        <div className="flex justify-end gap-2 border-t border-white/[0.06] pt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button loading={saving} onClick={save}>{isNew ? 'Create' : 'Save changes'}</Button>
        </div>
      </div>
    </Modal>
  )
}
