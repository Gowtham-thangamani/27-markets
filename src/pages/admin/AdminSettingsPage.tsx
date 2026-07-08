import { useCallback, useEffect, useMemo, useState } from 'react'
import { Settings } from 'lucide-react'
import { Button, EmptyState, ErrorState, Input, SkeletonRows } from '@/components/ui'
import { PageTitle } from '@/components/portal/PageTitle'
import { useToast } from '@/context/ToastContext'
import { ApiError } from '@/lib/api'
import { adminApi, type AppSetting } from '@/lib/adminApi'

export default function AdminSettingsPage() {
  const toast = useToast()
  const [rows, setRows] = useState<AppSetting[]>([])
  const [values, setValues] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await adminApi.listSettings()
      setRows(data)
      setValues(Object.fromEntries(data.map((s) => [s.key, s.value])))
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load settings')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const groups = useMemo(() => {
    const byGroup = new Map<string, AppSetting[]>()
    for (const s of rows) {
      const list = byGroup.get(s.group) ?? []
      list.push(s)
      byGroup.set(s.group, list)
    }
    return [...byGroup.entries()]
  }, [rows])

  const dirty = rows.some((s) => values[s.key] !== s.value)

  const save = async () => {
    setSaving(true)
    try {
      const updates = rows.filter((s) => values[s.key] !== s.value).map((s) => ({ key: s.key, value: values[s.key] }))
      const data = await adminApi.updateSettings(updates)
      setRows(data)
      setValues(Object.fromEntries(data.map((s) => [s.key, s.value])))
      toast.success('Settings saved')
    } catch (e) {
      toast.error('Save failed', e instanceof ApiError && e.status === 403 ? 'Only admins can edit settings.' : (e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <PageTitle title="General Settings" subtitle="Platform-wide configuration." />
        <Button loading={saving} disabled={!dirty} onClick={save}>Save changes</Button>
      </div>

      {error ? (
        <ErrorState description={error} onRetry={load} />
      ) : loading ? (
        <SkeletonRows rows={5} />
      ) : rows.length === 0 ? (
        <EmptyState icon={Settings} title="No settings" description="Run the seed to create the default settings." />
      ) : (
        <div className="space-y-6">
          {groups.map(([group, items]) => (
            <section key={group} className="glass-panel p-6">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-brand-300">{group}</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {items.map((s) => (
                  <Input
                    key={s.key}
                    label={s.label}
                    value={values[s.key] ?? ''}
                    onChange={(e) => setValues((v) => ({ ...v, [s.key]: e.target.value }))}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  )
}
