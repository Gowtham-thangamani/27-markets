import { useCallback, useEffect, useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { PageTitle } from '@/components/portal/PageTitle'
import { Button, Badge, Input, Textarea, Modal, Tabs, SkeletonRows, ErrorState } from '@/components/ui'
import {
  siteContentApi,
  type Testimonial,
  type DfmSymbol,
  type SaveTestimonialInput,
  type SaveDfmSymbolInput,
} from '@/lib/siteContentApi'
import { ApiError } from '@/lib/api'
import { useToast } from '@/context/ToastContext'

// ───────────────────────── Testimonials ─────────────────────────

const EMPTY_T: SaveTestimonialInput = { name: '', initials: '', quote: '', sortOrder: 0, enabled: true }

function TestimonialsSection() {
  const toast = useToast()
  const [rows, setRows] = useState<Testimonial[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<Testimonial | null>(null)
  const [form, setForm] = useState<SaveTestimonialInput | null>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setError(null)
    try {
      setRows(await siteContentApi.adminTestimonials())
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load testimonials')
    }
  }, [])
  useEffect(() => {
    void load()
  }, [load])

  const patch = (p: Partial<SaveTestimonialInput>) => setForm((f) => (f ? { ...f, ...p } : f))

  const save = async () => {
    if (!form) return
    if (!form.name.trim() || !form.initials.trim() || !form.quote.trim()) {
      toast.error('Missing fields', 'Name, initials and quote are required.')
      return
    }
    setSaving(true)
    try {
      if (editing) await siteContentApi.updateTestimonial(editing.id, form)
      else await siteContentApi.createTestimonial(form)
      toast.success('Saved', 'Testimonial saved.')
      setForm(null)
      setEditing(null)
      void load()
    } catch (e) {
      toast.error('Save failed', e instanceof ApiError ? e.message : 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  const toggle = async (r: Testimonial) => {
    try {
      await siteContentApi.updateTestimonial(r.id, { enabled: !r.enabled })
      void load()
    } catch {
      toast.error('Update failed', 'Could not update')
    }
  }

  const remove = async (r: Testimonial) => {
    if (!window.confirm(`Delete testimonial from “${r.name}”?`)) return
    try {
      await siteContentApi.removeTestimonial(r.id)
      void load()
    } catch {
      toast.error('Delete failed', 'Could not delete')
    }
  }

  return (
    <div className="mt-4">
      <div className="mb-3 flex justify-end">
        <Button className="gap-1.5" onClick={() => { setEditing(null); setForm({ ...EMPTY_T }) }}>
          <Plus className="h-4 w-4" /> New testimonial
        </Button>
      </div>
      {error ? (
        <ErrorState description={error} onRetry={load} />
      ) : !rows ? (
        <SkeletonRows />
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.06] bg-ink-800/40 p-8 text-center text-gray-400">
          No testimonials yet.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/[0.06]">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="bg-ink-800/60 text-left text-gray-400">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Quote</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3.5">
                    <span className="mr-2 inline-grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-brand-400 to-brand-700 text-[11px] font-bold text-onaccent">
                      {r.initials}
                    </span>
                    <span className="font-medium text-white">{r.name}</span>
                  </td>
                  <td className="px-4 py-3.5 text-gray-300">“{r.quote}”</td>
                  <td className="px-4 py-3.5">
                    <button type="button" onClick={() => toggle(r)} aria-label="Toggle visibility">
                      <Badge tone={r.enabled ? 'success' : 'neutral'}>{r.enabled ? 'Visible' : 'Hidden'}</Badge>
                    </button>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" className="gap-1" onClick={() => { setEditing(r); setForm({ name: r.name, initials: r.initials, quote: r.quote, sortOrder: r.sortOrder, enabled: r.enabled }) }}>
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </Button>
                      <Button variant="ghost" size="sm" className="gap-1 text-danger" onClick={() => remove(r)} aria-label="Delete testimonial">
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

      <Modal open={!!form} onClose={() => { setForm(null); setEditing(null) }} title={editing ? 'Edit testimonial' : 'New testimonial'}>
        {form && (
          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
              <Input label="Name" value={form.name} onChange={(e) => patch({ name: e.target.value })} placeholder="Ahmed R." />
              <Input label="Initials" value={form.initials} onChange={(e) => patch({ initials: e.target.value.toUpperCase().slice(0, 4) })} placeholder="AR" />
            </div>
            <Textarea label="Quote" value={form.quote} onChange={(e) => patch({ quote: e.target.value })} rows={2} />
            <Input label="Sort order" type="number" value={String(form.sortOrder ?? 0)} onChange={(e) => patch({ sortOrder: Number(e.target.value) || 0 })} />
            <label className="flex items-center gap-2 text-sm text-gray-300">
              <input type="checkbox" checked={form.enabled ?? true} onChange={(e) => patch({ enabled: e.target.checked })} className="h-4 w-4 rounded border-white/20 bg-transparent" />
              Visible on marketing pages
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => { setForm(null); setEditing(null) }} disabled={saving}>Cancel</Button>
              <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Create'}</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

// ───────────────────────── DFM symbols ─────────────────────────

const EMPTY_D: SaveDfmSymbolInput = { symbol: '', name: '', sortOrder: 0, enabled: true }

function DfmSection() {
  const toast = useToast()
  const [rows, setRows] = useState<DfmSymbol[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<DfmSymbol | null>(null)
  const [form, setForm] = useState<SaveDfmSymbolInput | null>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setError(null)
    try {
      setRows(await siteContentApi.adminDfmSymbols())
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load symbols')
    }
  }, [])
  useEffect(() => {
    void load()
  }, [load])

  const patch = (p: Partial<SaveDfmSymbolInput>) => setForm((f) => (f ? { ...f, ...p } : f))

  const save = async () => {
    if (!form) return
    if (!form.symbol.trim() || !form.name.trim()) {
      toast.error('Missing fields', 'Symbol and name are required.')
      return
    }
    setSaving(true)
    try {
      if (editing) await siteContentApi.updateDfmSymbol(editing.id, form)
      else await siteContentApi.createDfmSymbol(form)
      toast.success('Saved', 'Symbol saved.')
      setForm(null)
      setEditing(null)
      void load()
    } catch (e) {
      toast.error('Save failed', e instanceof ApiError ? e.message : 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  const toggle = async (r: DfmSymbol) => {
    try {
      await siteContentApi.updateDfmSymbol(r.id, { enabled: !r.enabled })
      void load()
    } catch {
      toast.error('Update failed', 'Could not update')
    }
  }

  const remove = async (r: DfmSymbol) => {
    if (!window.confirm(`Delete “${r.symbol}”?`)) return
    try {
      await siteContentApi.removeDfmSymbol(r.id)
      void load()
    } catch {
      toast.error('Delete failed', 'Could not delete')
    }
  }

  return (
    <div className="mt-4">
      <p className="mb-3 text-xs text-gray-500">
        DFM real-time prices require a licensed vendor feed — these symbols show as a labeled placeholder until it's connected.
      </p>
      <div className="mb-3 flex justify-end">
        <Button className="gap-1.5" onClick={() => { setEditing(null); setForm({ ...EMPTY_D }) }}>
          <Plus className="h-4 w-4" /> New symbol
        </Button>
      </div>
      {error ? (
        <ErrorState description={error} onRetry={load} />
      ) : !rows ? (
        <SkeletonRows />
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.06] bg-ink-800/40 p-8 text-center text-gray-400">
          No symbols yet.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/[0.06]">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="bg-ink-800/60 text-left text-gray-400">
                <th className="px-4 py-3 font-medium">Symbol</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3.5 font-medium text-white">{r.symbol}</td>
                  <td className="px-4 py-3.5 text-gray-300">{r.name}</td>
                  <td className="px-4 py-3.5">
                    <button type="button" onClick={() => toggle(r)} aria-label="Toggle visibility">
                      <Badge tone={r.enabled ? 'success' : 'neutral'}>{r.enabled ? 'Visible' : 'Hidden'}</Badge>
                    </button>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" className="gap-1" onClick={() => { setEditing(r); setForm({ symbol: r.symbol, name: r.name, sortOrder: r.sortOrder, enabled: r.enabled }) }}>
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </Button>
                      <Button variant="ghost" size="sm" className="gap-1 text-danger" onClick={() => remove(r)} aria-label="Delete symbol">
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

      <Modal open={!!form} onClose={() => { setForm(null); setEditing(null) }} title={editing ? 'Edit symbol' : 'New symbol'}>
        {form && (
          <div className="grid gap-4">
            <Input label="Symbol" value={form.symbol} onChange={(e) => patch({ symbol: e.target.value.toUpperCase() })} placeholder="EMAAR" />
            <Input label="Name" value={form.name} onChange={(e) => patch({ name: e.target.value })} placeholder="Emaar Properties" />
            <Input label="Sort order" type="number" value={String(form.sortOrder ?? 0)} onChange={(e) => patch({ sortOrder: Number(e.target.value) || 0 })} />
            <label className="flex items-center gap-2 text-sm text-gray-300">
              <input type="checkbox" checked={form.enabled ?? true} onChange={(e) => patch({ enabled: e.target.checked })} className="h-4 w-4 rounded border-white/20 bg-transparent" />
              Visible on the DFM board
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => { setForm(null); setEditing(null) }} disabled={saving}>Cancel</Button>
              <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Create'}</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default function AdminSiteContentPage() {
  const [tab, setTab] = useState<'testimonials' | 'dfm'>('testimonials')
  return (
    <>
      <PageTitle title="Marketing Content" subtitle="Manage testimonials and the DFM board shown on the public site." />
      <Tabs
        tabs={[
          { id: 'testimonials', label: 'Testimonials' },
          { id: 'dfm', label: 'DFM Board' },
        ]}
        active={tab}
        onChange={(id) => setTab(id as 'testimonials' | 'dfm')}
      />
      {tab === 'testimonials' ? <TestimonialsSection /> : <DfmSection />}
    </>
  )
}
