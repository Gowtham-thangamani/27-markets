import { useCallback, useEffect, useState } from 'react'
import { Megaphone, Pencil, Plus, Trash2 } from 'lucide-react'
import { Badge, Button, EmptyState, ErrorState, Input, Modal, SkeletonRows, Textarea } from '@/components/ui'
import { PageTitle } from '@/components/portal/PageTitle'
import { useToast } from '@/context/ToastContext'
import { formatDateTime } from '@/lib/format'
import { ApiError } from '@/lib/api'
import { adminApi, type Campaign, type CampaignChannel, type CampaignInput, type CampaignStatus } from '@/lib/adminApi'

const CHANNELS: CampaignChannel[] = ['EMAIL', 'SMS', 'PUSH']
const STATUSES: CampaignStatus[] = ['DRAFT', 'SCHEDULED', 'SENT']
const STATUS_TONE: Record<CampaignStatus, 'neutral' | 'warning' | 'success'> = { DRAFT: 'neutral', SCHEDULED: 'warning', SENT: 'success' }

export default function AdminCampaignsPage() {
  const toast = useToast()
  const [rows, setRows] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [editing, setEditing] = useState<Campaign | 'new' | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setRows(await adminApi.listCampaigns())
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
    toast.error('Action failed', e instanceof ApiError && e.status === 403 ? 'Only admins can manage campaigns.' : (e as Error).message)

  const remove = async (c: Campaign) => {
    if (!window.confirm(`Delete campaign "${c.name}"?`)) return
    setBusy(c.id)
    try {
      await adminApi.deleteCampaign(c.id)
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
        <PageTitle title="Campaigns" subtitle="Marketing & notification campaigns." />
        <Button onClick={() => setEditing('new')} className="gap-1.5"><Plus className="h-4 w-4" /> New campaign</Button>
      </div>

      {error ? (
        <ErrorState description={error} onRetry={load} />
      ) : loading ? (
        <SkeletonRows rows={3} />
      ) : rows.length === 0 ? (
        <EmptyState icon={Megaphone} title="No campaigns" description="Create your first campaign." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((c) => (
            <div key={c.id} className="glass-panel flex flex-col gap-3 p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-white">{c.name}</h3>
                  <p className="mt-0.5 text-xs text-gray-500">{c.channel} · {c.audience}</p>
                </div>
                <Badge tone={STATUS_TONE[c.status]} dot>{c.status}</Badge>
              </div>
              {c.subject && <p className="text-sm font-medium text-gray-300">{c.subject}</p>}
              <p className="line-clamp-2 text-xs text-gray-500">{c.message}</p>
              <p className="text-[11px] text-gray-600">Created {formatDateTime(c.createdAt)}</p>
              <div className="mt-auto flex items-center gap-2 border-t border-white/[0.06] pt-3">
                <Button size="sm" variant="outline" onClick={() => setEditing(c)} className="gap-1"><Pencil className="h-3.5 w-3.5" /> Edit</Button>
                <Button size="sm" variant="outline" loading={busy === c.id} onClick={() => remove(c)} className="ml-auto gap-1 border-danger/40 text-danger hover:bg-danger/10"><Trash2 className="h-3.5 w-3.5" /> Delete</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <CampaignModal
        target={editing}
        onClose={() => setEditing(null)}
        onSaved={async (created) => { setEditing(null); await load(); toast.success(created ? 'Campaign created' : 'Campaign updated') }}
        onError={fail}
      />
    </>
  )
}

function CampaignModal({
  target,
  onClose,
  onSaved,
  onError,
}: {
  target: Campaign | 'new' | null
  onClose: () => void
  onSaved: (created: boolean) => void
  onError: (e: unknown) => void
}) {
  const isNew = target === 'new'
  const campaign = target && target !== 'new' ? target : null
  const [form, setForm] = useState<CampaignInput>({ name: '', message: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (target === 'new') setForm({ name: '', channel: 'EMAIL', audience: 'All clients', subject: '', message: '', status: 'DRAFT' })
    else if (target) setForm({ name: target.name, channel: target.channel, audience: target.audience, subject: target.subject ?? '', message: target.message, status: target.status })
  }, [target])

  if (!target) return null
  const set = <K extends keyof CampaignInput>(k: K, v: CampaignInput[K]) => setForm((f) => ({ ...f, [k]: v }))

  const save = async () => {
    if (!form.name.trim() || !form.message.trim()) { onError(new Error('Name and message are required')); return }
    setSaving(true)
    try {
      if (isNew) await adminApi.createCampaign(form)
      else if (campaign) await adminApi.updateCampaign(campaign.id, form)
      onSaved(isNew)
    } catch (e) {
      onError(e)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={!!target} onClose={onClose} title={isNew ? 'New campaign' : `Edit ${campaign?.name}`} className="max-w-xl">
      <div className="space-y-4">
        <Input label="Name" value={form.name} onChange={(e) => set('name', e.target.value)} />
        <div className="grid grid-cols-3 gap-4">
          <Select label="Channel" value={form.channel ?? 'EMAIL'} options={CHANNELS} onChange={(v) => set('channel', v as CampaignChannel)} />
          <Select label="Status" value={form.status ?? 'DRAFT'} options={STATUSES} onChange={(v) => set('status', v as CampaignStatus)} />
          <Input label="Audience" value={form.audience ?? ''} onChange={(e) => set('audience', e.target.value)} />
        </div>
        <Input label="Subject" value={form.subject ?? ''} onChange={(e) => set('subject', e.target.value)} placeholder="Email subject (optional)" />
        <Textarea label="Message" rows={5} value={form.message} onChange={(e) => set('message', e.target.value)} />
        <div className="flex justify-end gap-2 border-t border-white/[0.06] pt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button loading={saving} onClick={save}>{isNew ? 'Create' : 'Save changes'}</Button>
        </div>
      </div>
    </Modal>
  )
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-300">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-white/10 bg-ink-800 px-3 py-2.5 text-sm text-white focus:border-brand-500/50 focus:outline-none"
      >
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}
