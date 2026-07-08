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

interface ConsentItem {
  id: string
  label: string
  body: string
  required: boolean
  accepted: boolean
}

const INPUT_TYPE: Record<string, string> = { NUMBER: 'number', DATE: 'date' }

/** Renders admin-configured KYC questions, extended fields, and consents for the client. */
export function KycFieldsForm() {
  const toast = useToast()
  const [fields, setFields] = useState<KycField[]>([])
  const [consents, setConsents] = useState<ConsentItem[]>([])
  const [values, setValues] = useState<Record<string, string>>({})
  const [accepted, setAccepted] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [f, a, c] = await Promise.all([
        api.get<KycField[]>('/kyc/fields'),
        api.get<Record<string, string>>('/kyc/answers'),
        api.get<ConsentItem[]>('/kyc/consents'),
      ])
      setFields(f)
      setValues(a)
      setConsents(c)
      setAccepted(Object.fromEntries(c.map((x) => [x.id, x.accepted])))
    } catch {
      // Non-fatal — the section just won't render.
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  if (loading || (fields.length === 0 && consents.length === 0)) return null

  const set = (id: string, v: string) => setValues((prev) => ({ ...prev, [id]: v }))

  const save = async () => {
    const missingFields = fields.filter((f) => f.required && !(values[f.id] ?? '').trim())
    if (missingFields.length) {
      toast.warning('Required fields', `Please complete: ${missingFields.map((m) => m.label).join(', ')}`)
      return
    }
    const missingConsents = consents.filter((c) => c.required && !accepted[c.id])
    if (missingConsents.length) {
      toast.warning('Required consents', `Please accept: ${missingConsents.map((m) => m.label).join(', ')}`)
      return
    }
    setSaving(true)
    try {
      const answers = fields.filter((f) => values[f.id] !== undefined).map((f) => ({ fieldId: f.id, value: values[f.id] ?? '' }))
      const consentIds = consents.filter((c) => accepted[c.id]).map((c) => c.id)
      await Promise.all([
        answers.length ? api.post('/kyc/answers', { answers }) : Promise.resolve(),
        api.post('/kyc/consents', { consentIds }),
      ])
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

      {fields.length > 0 && (
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
      )}

      {consents.length > 0 && (
        <div className="mt-6 space-y-3 border-t border-white/[0.06] pt-5">
          <h3 className="text-sm font-semibold text-white">Consents</h3>
          {consents.map((c) => (
            <label key={c.id} className="flex items-start gap-2.5 text-sm text-gray-300">
              <input
                type="checkbox"
                checked={accepted[c.id] ?? false}
                onChange={(e) => setAccepted((prev) => ({ ...prev, [c.id]: e.target.checked }))}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-white/20 bg-ink-800 text-brand-500 focus:ring-brand-500/40"
              />
              <span>
                <span className="font-medium text-white">{c.label}</span>
                {c.required && <span className="text-brand-400"> *</span>}
                <span className="block text-xs text-gray-500">{c.body}</span>
              </span>
            </label>
          ))}
        </div>
      )}

      <div className="mt-5 flex justify-end">
        <Button loading={saving} onClick={save}>Save information</Button>
      </div>
    </div>
  )
}
