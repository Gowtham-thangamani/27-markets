import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Mail, Lock, KeyRound } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AuthShell } from '@/layouts/AuthShell'
import { Button, Input } from '@/components/ui'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { zodResolver } from '@/lib/zodResolver'
import { loginSchema, type LoginValues } from '@/lib/validation'
import { isStaffRole, landingPathForRole } from '@/lib/roles'
import { ApiError } from '@/lib/api'
import { useSeo } from '@/lib/useSeo'
import { useT } from '@/i18n/LanguageContext'

export default function LoginPage() {
  useSeo({ title: 'Log In — 27 Markets' })
  const { login } = useAuth()
  const toast = useToast()
  const t = useT()
  const navigate = useNavigate()
  const location = useLocation()
  const explicitFrom = (location.state as { from?: string })?.from

  const [needTotp, setNeedTotp] = useState(false)
  const [totp, setTotp] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) })

  const onSubmit = async (values: LoginValues) => {
    if (needTotp && !/^\d{6}$/.test(totp)) {
      toast.warning(t('auth.login.enterCode'), t('auth.login.enterCodeBody'))
      return
    }
    try {
      const user = await login(values.email, values.password, needTotp ? totp : undefined)
      const dest = explicitFrom ?? landingPathForRole(user.role)
      toast.success(t('auth.login.welcomeToast'), isStaffRole(user.role) ? t('auth.login.crm') : t('auth.login.portal'))
      navigate(dest, { replace: true })
    } catch (err) {
      const e = err as ApiError
      if (e.code === 'TwoFactorRequired') {
        setNeedTotp(true)
        toast.info(t('auth.login.twoFa'), t('auth.login.twoFaBody'))
      } else {
        toast.error(t('auth.login.failed'), e.message || t('auth.login.failedBody'))
      }
    }
  }

  return (
    <AuthShell>
      <h1 className="font-display text-3xl font-bold text-white">{t('auth.login.welcome')}</h1>
      <p className="mt-2 text-sm text-gray-400">{t('auth.login.sub')}</p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4" noValidate>
        <Input
          label={t('auth.email')}
          type="email"
          placeholder="you@example.com"
          icon={<Mail className="h-4 w-4" />}
          error={errors.email?.message}
          {...register('email')}
        />
        <Input
          label={t('auth.password')}
          type="password"
          placeholder="••••••••"
          icon={<Lock className="h-4 w-4" />}
          error={errors.password?.message}
          {...register('password')}
        />
        {needTotp && (
          <Input
            label={t('auth.login.authCode')}
            inputMode="numeric"
            placeholder="123456"
            autoFocus
            icon={<KeyRound className="h-4 w-4" />}
            value={totp}
            onChange={(e) => setTotp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            hint={t('auth.login.authHint')}
          />
        )}
        <div className="flex justify-end">
          <Link to="/forgot-password" className="text-sm font-medium text-brand-400 hover:text-brand-300">
            {t('auth.login.forgot')}
          </Link>
        </div>
        <Button type="submit" fullWidth size="lg" loading={isSubmitting}>
          {needTotp ? t('auth.login.verifyBtn') : t('auth.login.btn')}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-400">
        {t('auth.login.noAccount')}{' '}
        <Link to="/register" className="font-semibold text-brand-400 hover:text-brand-300">
          {t('auth.registerWord')}
        </Link>
      </p>

      {import.meta.env.DEV && (
        <div className="mt-6 rounded-lg border border-white/[0.06] bg-ink-800/50 p-3 text-center text-xs text-gray-500">
          <p className="font-medium text-gray-400">Demo logins (dev only)</p>
          <p className="mt-1">client@27markets.io · admin@27markets.io · agent@27markets.io</p>
          <p>passwords: Client123! / Admin123! / Agent123!</p>
        </div>
      )}
    </AuthShell>
  )
}
