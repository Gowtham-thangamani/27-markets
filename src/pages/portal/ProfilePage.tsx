import { useForm } from 'react-hook-form'
import { Mail, Phone, User, Globe, Bell, Lock, ShieldCheck } from 'lucide-react'
import { Button, Input } from '@/components/ui'
import { PageTitle } from '@/components/portal/PageTitle'
import { SecuritySettings } from '@/components/portal/SecuritySettings'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { zodResolver } from '@/lib/zodResolver'
import { profileSchema } from '@/lib/validation'
import { initials, formatDate } from '@/lib/format'
import { z } from 'zod'
import { useState } from 'react'

type ProfileValues = z.infer<typeof profileSchema>

export default function ProfilePage() {
  const { user, updateProfile } = useAuth()
  const toast = useToast()
  const [prefs, setPrefs] = useState({ marketing: true, security: true, product: false })

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

  const toggle = (key: keyof typeof prefs) => setPrefs((p) => ({ ...p, [key]: !p[key] }))

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
        </div>
      </div>
    </>
  )
}
