import { useForm } from 'react-hook-form'
import { Mail, Phone, User, Globe, Bell, Lock, ShieldCheck, FileEdit } from 'lucide-react'
import { Button, Input } from '@/components/ui'
import { api, ApiError } from '@/lib/api'
import { PageTitle } from '@/components/portal/PageTitle'
import { SecuritySettings } from '@/components/portal/SecuritySettings'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { zodResolver } from '@/lib/zodResolver'
import { profileSchema } from '@/lib/validation'
import { initials, formatDate } from '@/lib/format'
import { z } from 'zod'
import { useEffect, useState } from 'react'

type ProfileValues = z.infer<typeof profileSchema>

export default function ProfilePage() {
  const { user, updateProfile } = useAuth()
  const toast = useToast()
  const [prefs, setPrefs] = useState({
    marketing: user?.notifyMarketing ?? true,
    security: user?.notifySecurity ?? true,
    product: user?.notifyProduct ?? false,
  })
  // Keep the toggles in sync with the persisted user (initial load + after save).
  useEffect(() => {
    if (user) {
      setPrefs({ marketing: user.notifyMarketing, security: user.notifySecurity, product: user.notifyProduct })
    }
  }, [user])
  const [cr, setCr] = useState<{ field: 'phone' | 'address' | 'city' | 'postalCode'; value: string }>({ field: 'phone', value: '' })
  const [crBusy, setCrBusy] = useState(false)

  const submitChangeRequest = async () => {
    if (!cr.value.trim()) return
    setCrBusy(true)
    try {
      await api.post('/users/me/change-requests', { field: cr.field, requestedValue: cr.value.trim() })
      setCr((c) => ({ ...c, value: '' }))
      toast.success('Request submitted', 'An admin will review your change shortly.')
    } catch (err) {
      toast.error('Request failed', err instanceof ApiError ? err.message : (err as Error).message)
    } finally {
      setCrBusy(false)
    }
  }

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name ?? '',
      email: user?.email ?? '',
      phone: user?.phone ?? '',
      country: user?.country ?? '',
    },
  })

  const onSubmit = async (values: ProfileValues) => {
    try {
      await updateProfile({ name: values.name, phone: values.phone, country: values.country })
      toast.success('Profile updated', 'Your changes have been saved.')
    } catch (err) {
      toast.error('Update failed', (err as Error).message)
    }
  }

  const toggle = async (key: keyof typeof prefs) => {
    const next = { ...prefs, [key]: !prefs[key] }
    const prev = prefs
    setPrefs(next) // optimistic
    try {
      await updateProfile({
        notifyMarketing: next.marketing,
        notifySecurity: next.security,
        notifyProduct: next.product,
      })
    } catch (err) {
      setPrefs(prev) // rollback on failure
      toast.error('Could not save preference', err instanceof ApiError ? err.message : (err as Error).message)
    }
  }

  return (
    <>
      <PageTitle title="Profile" subtitle="Manage your personal information and preferences." />

      {/* Identity header */}
      <div className="glass-panel mb-6 flex flex-col items-center gap-4 p-6 sm:flex-row">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-500/15 font-display text-xl font-bold text-brand-300 ring-1 ring-brand-500/30">
          {initials(user?.name ?? '27 Trader')}
        </span>
        <div className="text-center sm:text-left">
          <h2 className="font-display text-xl font-bold text-white">{user?.name}</h2>
          <p className="text-sm text-gray-400">{user?.email}</p>
          <p className="mt-1 text-xs text-gray-500">
            Member since {user ? formatDate(user.joinedAt) : '—'} · ID {user?.id}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* Personal info form */}
        <form onSubmit={handleSubmit(onSubmit)} className="glass-panel p-6" noValidate>
          <h3 className="font-display text-lg font-semibold text-white">Personal information</h3>
          <div className="mt-5 space-y-4">
            <Input label="Full name" icon={<User className="h-4 w-4" />} error={errors.name?.message} {...register('name')} />
            <Input label="Email" type="email" readOnly icon={<Mail className="h-4 w-4" />} hint="Contact support to change your email" error={errors.email?.message} {...register('email')} />
            <Input label="Phone" icon={<Phone className="h-4 w-4" />} error={errors.phone?.message} {...register('phone')} />
            <Input label="Country" icon={<Globe className="h-4 w-4" />} error={errors.country?.message} {...register('country')} />
            <Button type="submit" loading={isSubmitting}>
              Save changes
            </Button>
          </div>
        </form>

        {/* Side: security + notifications */}
        <div className="space-y-6">
          <SecuritySettings />

          <div className="glass-panel p-6">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-brand-400" />
              <h3 className="font-display text-base font-semibold text-white">Notifications</h3>
            </div>
            <div className="mt-4 space-y-3">
              {[
                { key: 'security' as const, label: 'Security alerts' },
                { key: 'product' as const, label: 'Product updates' },
                { key: 'marketing' as const, label: 'Marketing emails' },
              ].map((row) => (
                <label key={row.key} className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">{row.label}</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={prefs[row.key]}
                    onClick={() => toggle(row.key)}
                    className={`relative h-6 w-11 rounded-full transition-colors ${
                      prefs[row.key] ? 'bg-brand-500' : 'bg-ink-400'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                        prefs[row.key] ? 'translate-x-[22px]' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </label>
              ))}
            </div>
          </div>

          {/* Request a change that needs approval */}
          <div className="glass-panel p-6">
            <div className="flex items-center gap-2">
              <FileEdit className="h-5 w-5 text-brand-400" />
              <h3 className="font-display text-base font-semibold text-white">Request a change</h3>
            </div>
            <p className="mt-1 text-xs text-gray-500">Some changes need admin approval before they take effect.</p>
            <div className="mt-4 space-y-3">
              <select
                aria-label="Field to change"
                value={cr.field}
                onChange={(e) => setCr((c) => ({ ...c, field: e.target.value as typeof c.field }))}
                className="w-full rounded-lg border border-white/10 bg-ink-800 px-3 py-2.5 text-sm text-white focus:border-brand-500/50 focus:outline-none"
              >
                <option value="phone">Phone</option>
                <option value="address">Address</option>
                <option value="city">City</option>
                <option value="postalCode">Postal code</option>
              </select>
              <Input placeholder="New value" value={cr.value} onChange={(e) => setCr((c) => ({ ...c, value: e.target.value }))} />
              <Button type="button" fullWidth loading={crBusy} disabled={!cr.value.trim()} onClick={submitChangeRequest}>
                Submit request
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
