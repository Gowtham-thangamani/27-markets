import { useCallback, useEffect, useState } from 'react'
import { Plus, Trash2, Users } from 'lucide-react'
import { Badge, Button, EmptyState, ErrorState, SkeletonRows } from '@/components/ui'
import { PageTitle } from '@/components/portal/PageTitle'
import { useToast } from '@/context/ToastContext'
import { ApiError } from '@/lib/api'
import { adminApi, type KycForm, type StaffFormAssignment, type StaffMember } from '@/lib/adminApi'

export default function AdminStaffFormAssignmentsPage() {
  const toast = useToast()
  const [rows, setRows] = useState<StaffFormAssignment[]>([])
  const [forms, setForms] = useState<KycForm[]>([])
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [formId, setFormId] = useState('')
  const [staffId, setStaffId] = useState('')
  const [adding, setAdding] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [a, f, s] = await Promise.all([adminApi.listStaffFormAssignments(), adminApi.listKycForms(), adminApi.getStaff()])
      setRows(a)
      setForms(f)
      setStaff(s)
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
    toast.error('Action failed', e instanceof ApiError && e.status === 403 ? 'Only admins can manage assignments.' : (e as Error).message)

  const add = async () => {
    if (!formId || !staffId) return
    setAdding(true)
    try {
      await adminApi.createStaffFormAssignment({ kycFormId: formId, staffId })
      setFormId(''); setStaffId('')
      await load()
      toast.success('Assigned')
    } catch (e) {
      fail(e)
    } finally {
      setAdding(false)
    }
  }

  const remove = async (a: StaffFormAssignment) => {
    if (!window.confirm(`Unassign "${a.formName}" from ${a.staffName}?`)) return
    setBusy(a.id)
    try {
      await adminApi.deleteStaffFormAssignment(a.id)
      toast.success('Unassigned')
      await load()
    } catch (e) {
      fail(e)
    } finally {
      setBusy(null)
    }
  }

  return (
    <>
      <PageTitle title="Staff Forms Assignments" subtitle="Which staff member reviews which KYC form." />

      <div className="mb-5 flex flex-wrap items-end gap-3">
        <Select label="KYC form" value={formId} onChange={setFormId} placeholder="Select a form" options={forms.map((f) => ({ value: f.id, label: f.name }))} />
        <Select label="Staff member" value={staffId} onChange={setStaffId} placeholder="Select staff" options={staff.map((s) => ({ value: s.id, label: `${s.firstName} ${s.lastName} (${s.role})` }))} />
        <Button onClick={add} loading={adding} disabled={!formId || !staffId} className="gap-1.5"><Plus className="h-4 w-4" /> Assign</Button>
      </div>

      {error ? (
        <ErrorState description={error} onRetry={load} />
      ) : loading ? (
        <SkeletonRows rows={4} />
      ) : rows.length === 0 ? (
        <EmptyState icon={Users} title="No assignments" description="Assign a KYC form to a staff member above." />
      ) : (
        <div className="glass-panel divide-y divide-white/[0.04] p-0">
          {rows.map((a) => (
            <div key={a.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-white">{a.formName}</span>
                <span className="text-gray-500">→</span>
                <span className="text-gray-200">{a.staffName}</span>
                {a.staffRole && <Badge tone="neutral">{a.staffRole}</Badge>}
              </div>
              <Button size="sm" variant="outline" loading={busy === a.id} onClick={() => remove(a)} className="gap-1 border-danger/40 text-danger hover:bg-danger/10">
                <Trash2 className="h-3.5 w-3.5" /> Remove
              </Button>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

function Select({ label, value, onChange, options, placeholder }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; placeholder: string }) {
  return (
    <div className="w-full max-w-xs">
      <label className="mb-1.5 block text-sm font-medium text-gray-300">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-white/10 bg-ink-800 px-3 py-2.5 text-sm text-white focus:border-brand-500/50 focus:outline-none"
      >
        <option value="">{placeholder}</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}
