import { useCallback, useEffect, useState } from 'react'
import { ListChecks } from 'lucide-react'
import { Button, Input } from '@/components/ui'
import { useToast } from '@/context/ToastContext'
import { api, ApiError } from '@/lib/api'

interface KycField {
  id: string
  kind: 'QUESTION' | 'EXTENDED'
  label: string
  fieldType: 'TEXT' | 'NUMBER' | 'DATE' | 'SELECT' | 'BOOLEAN'
  required: boolean
}

const INPUT_TYPE: Record<string, string> = { NUMBER: 'number', DATE: 'date' }

/** Renders the admin-configured KYC questions + extended fields for the client to complete. */
export function KycFieldsForm() {
  const toast = useToast()
  const [fields, setFields] = useState<KycField[]>([])
  const [values, setValues] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [f, a] = await Promise.all([
        api.get<KycField[]>('/kyc/fields'),
        api.get<Record<string, string>>('/kyc/answers'),
      ])
      setFields(f)
      setValues(a)
    } catch {
      // Non-fatal — the section just won't render.
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  if (loading || fields.length === 0) return null

  const set = (id: string, v: string) => setValues((prev) => ({ ...prev, [id]: v }))

  const save = async () => {
    const missing = fields.filter((f) => f.required && !(values[f.id] ?? '').trim())
    if (missing.length) {
      toast.warning('Required fields', `Please complete: ${missing.map((m) => m.label).join(', ')}`)
      return
    }
    setSaving(true)
    try {
      const answers = fields
        .filter((f) => values[f.id] !== undefined)
        .map((f) => ({ fieldId: f.id, value: values[f.id] ?? '' }))
      await api.post('/kyc/answers', { answers })
      toast.success('Saved', 'Your information has been submitted.')
    } catch (e) {
      toast.error('Save failed', e instanceof ApiError ? e.message : (e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="glass-panel p-6">
      <div className="flex items-center gap-2">
        <ListChecks className="h-5 w-5 text-brand-400" />
        <h2 className="font-display text-lg font-semibold text-white">Additional information</h2>
      </div>
      <p className="mt-1 text-sm text-gray-400">Complete the following to help us verify your account.</p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {fields.map((f) => (
          <div key={f.id} className={f.fieldType === 'BOOLEAN' ? 'sm:col-span-2' : ''}>
            {f.fieldType === 'BOOLEAN' ? (
              <label className="flex items-center gap-2 text-sm text-gray-300">
                <input
                  type="checkbox"
                  checked={values[f.id] === 'true'}
                  onChange={(e) => set(f.id, e.target.checked ? 'true' : 'false')}
                  className="h-4 w-4 rounded border-white/20 bg-ink-800 text-brand-500 focus:ring-brand-500/40"
                />
                {f.label}{f.required && <span className="text-brand-400"> *</span>}
              </label>
            ) : (
              <Input
                label={f.required ? `${f.label} *` : f.label}
                type={INPUT_TYPE[f.fieldType] ?? 'text'}
                value={values[f.id] ?? ''}
                onChange={(e) => set(f.id, e.target.value)}
              />
            )}
          </div>
        ))}
      </div>

      <div className="mt-5 flex justify-end">
        <Button loading={saving} onClick={save}>Save information</Button>
      </div>
    </div>
  )
}
