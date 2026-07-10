import { useCallback, useEffect, useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { PageTitle } from '@/components/portal/PageTitle'
import { Button, Badge, Input, Select, Textarea, Modal, SkeletonRows, ErrorState } from '@/components/ui'
import { downloadsApi, type DownloadItem, type SaveDownloadInput, type DownloadIcon } from '@/lib/downloadsApi'
import { ApiError } from '@/lib/api'
import { useToast } from '@/context/ToastContext'

const ICON_OPTIONS: { value: DownloadIcon; label: string }[] = [
  { value: 'desktop', label: 'Desktop app' },
  { value: 'mobile', label: 'Mobile app' },
  { value: 'web', label: 'Web / browser' },
  { value: 'doc', label: 'Document' },
]

const EMPTY: SaveDownloadInput = {
  name: '',
  platform: '',
  description: '',
  size: '',
  version: '',
  icon: 'desktop',
  url: '',
  sortOrder: 0,
  enabled: true,
}

export default function AdminDownloadsPage() {
  const toast = useToast()
  const [rows, setRows] = useState<DownloadItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<DownloadItem | null>(null)
  const [form, setForm] = useState<SaveDownloadInput | null>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setError(null)
    try {
      setRows(await downloadsApi.adminList())
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load downloads')
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const openNew = () => {
    setEditing(null)
    setForm({ ...EMPTY })
  }

  const openEdit = (row: DownloadItem) => {
    setEditing(row)
    setForm({
      name: row.name,
      platform: row.platform,
      description: row.description,
      size: row.size,
      version: row.version,
      icon: row.icon,
      url: row.url ?? '',
      sortOrder: row.sortOrder,
      enabled: row.enabled,
    })
  }

  const close = () => {
    setForm(null)
    setEditing(null)
  }

  const patch = (partial: Partial<SaveDownloadInput>) =>
    setForm((f) => (f ? { ...f, ...partial } : f))

  const save = async () => {
    if (!form) return
    if (!form.name.trim() || !form.platform.trim() || !form.description.trim()) {
      toast.error('Missing fields', 'Name, platform and description are required.')
      return
    }
    setSaving(true)
    try {
      // Send url as-is: '' clears it on the backend, a real URL sets it.
      const payload: SaveDownloadInput = { ...form, url: form.url ?? '' }
      if (editing) {
        await downloadsApi.update(editing.id, payload)
        toast.success('Saved', 'Download updated.')
      } else {
        await downloadsApi.create(payload)
        toast.success('Created', 'Download added.')
      }
      close()
      void load()
    } catch (e) {
      toast.error('Save failed', e instanceof ApiError ? e.message : 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  const toggleEnabled = async (row: DownloadItem) => {
    try {
      await downloadsApi.update(row.id, { enabled: !row.enabled })
      void load()
    } catch (e) {
      toast.error('Update failed', e instanceof ApiError ? e.message : 'Could not update')
    }
  }

  const remove = async (row: DownloadItem) => {
    if (!window.confirm(`Delete “${row.name}”? This cannot be undone.`)) return
    try {
      await downloadsApi.remove(row.id)
      toast.success('Deleted', 'Download removed.')
      void load()
    } catch (e) {
      toast.error('Delete failed', e instanceof ApiError ? e.message : 'Could not delete')
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageTitle
          title="Downloads"
          subtitle="Manage the platform installers and documents shown in the client Download Center."
        />
        <Button className="gap-1.5" onClick={openNew}>
          <Plus className="h-4 w-4" /> New download
        </Button>
      </div>

      {error ? (
        <ErrorState description={error} onRetry={load} />
      ) : !rows ? (
        <SkeletonRows />
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.06] bg-ink-800/40 p-10 text-center text-gray-400">
          No downloads yet — add your first.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/[0.06]">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="bg-ink-800/60 text-left text-gray-400">
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Platform</th>
                <th className="px-5 py-3 font-medium">Version</th>
                <th className="px-5 py-3 font-medium">Link</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-white/[0.02]">
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-white">{r.name}</p>
                    <p className="text-xs text-gray-500 capitalize">{r.icon}</p>
                  </td>
                  <td className="px-5 py-3.5 text-gray-400">{r.platform}</td>
                  <td className="px-5 py-3.5 text-gray-400">{r.version || '—'}</td>
                  <td className="px-5 py-3.5 text-gray-400">
                    {r.url ? (
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="text-brand-400 hover:underline"
                      >
                        Link
                      </a>
                    ) : (
                      <span className="text-gray-600">Client action</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <button type="button" onClick={() => toggleEnabled(r)} aria-label="Toggle visibility">
                      <Badge tone={r.enabled ? 'success' : 'neutral'}>
                        {r.enabled ? 'Visible' : 'Hidden'}
                      </Badge>
                    </button>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" className="gap-1" onClick={() => openEdit(r)}>
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => remove(r)}
                        className="gap-1 text-danger"
                        aria-label="Delete download"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={!!form}
        onClose={close}
        title={editing ? 'Edit download' : 'New download'}
        description="Web and document tiles can be left without a URL — they trigger a client-side action."
      >
        {form && (
          <div className="grid gap-4">
            <Input
              label="Name"
              value={form.name}
              onChange={(e) => patch({ name: e.target.value })}
              placeholder="MetaTrader 5 — Windows"
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Platform"
                value={form.platform}
                onChange={(e) => patch({ platform: e.target.value })}
                placeholder="Windows 10/11"
              />
              <Select
                label="Type"
                options={ICON_OPTIONS}
                value={form.icon}
                onChange={(e) => patch({ icon: e.target.value as DownloadIcon })}
              />
            </div>
            <Textarea
              label="Description"
              value={form.description}
              onChange={(e) => patch({ description: e.target.value })}
              rows={2}
            />
            <div className="grid gap-4 sm:grid-cols-3">
              <Input
                label="Size"
                value={form.size ?? ''}
                onChange={(e) => patch({ size: e.target.value })}
                placeholder="23 MB"
              />
              <Input
                label="Version"
                value={form.version ?? ''}
                onChange={(e) => patch({ version: e.target.value })}
                placeholder="5.00"
              />
              <Input
                label="Sort order"
                type="number"
                value={String(form.sortOrder ?? 0)}
                onChange={(e) => patch({ sortOrder: Number(e.target.value) || 0 })}
              />
            </div>
            <Input
              label="Download URL"
              value={form.url ?? ''}
              onChange={(e) => patch({ url: e.target.value })}
              placeholder="https://… (leave blank for web/document tiles)"
              hint="Must start with https://. Leave blank for a client-side action."
            />
            <label className="flex items-center gap-2 text-sm text-gray-300">
              <input
                type="checkbox"
                checked={form.enabled ?? true}
                onChange={(e) => patch({ enabled: e.target.checked })}
                className="h-4 w-4 rounded border-white/20 bg-transparent"
              />
              Visible in the client Download Center
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={close} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={save} disabled={saving}>
                {saving ? 'Saving…' : editing ? 'Save changes' : 'Create'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}
