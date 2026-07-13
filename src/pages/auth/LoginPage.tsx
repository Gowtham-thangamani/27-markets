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
  const [needEmailOtp, setNeedEmailOtp] = useState(false)
  const [code, setCode] = useState('')
  const needCode = needTotp || needEmailOtp

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) })

  const onSubmit = async (values: LoginValues) => {
    if (needCode && !/^\d{6}$/.test(code)) {
      toast.warning(t('auth.login.enterCode'), t('auth.login.enterCodeBody'))
      return
    }
    try {
      const user = await login(
        values.email,
        values.password,
        needTotp ? code : undefined,
        needEmailOtp ? code : undefined,
      )
      const dest = explicitFrom ?? landingPathForRole(user.role)
      toast.success(t('auth.login.welcomeToast'), isStaffRole(user.role) ? t('auth.login.crm') : t('auth.login.portal'))
      navigate(dest, { replace: true })
    } catch (err) {
      const e = err as ApiError
      if (e.code === 'TwoFactorRequired') {
        setNeedTotp(true)
        toast.info(t('auth.login.twoFa'), t('auth.login.twoFaBody'))
      } else if (e.code === 'EmailOtpRequired') {
        setNeedEmailOtp(true)
        toast.info(t('auth.login.emailOtp'), t('auth.login.emailOtpBody'))
      } else {
        toast.error(t('auth.login.failed'), e.message || t('auth.login.failedBody'))
      }
    }
  }

  // Re-submit without a code to have the backend email a fresh one.
  const resendCode = async () => {
    const { email, password } = getValues()
    try {
      await login(email, password)
    } catch (err) {
      const e = err as ApiError
      if (e.code === 'EmailOtpRequired') {
        setCode('')
        toast.info(t('auth.login.emailOtpResent'), t('auth.login.emailOtpBody'))
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
        {needCode && (
          <div>
            <Input
              label={needEmailOtp ? t('auth.login.emailCode') : t('auth.login.authCode')}
              inputMode="numeric"
              placeholder="123456"
              autoFocus
              icon={<KeyRound className="h-4 w-4" />}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              hint={needEmailOtp ? t('auth.login.emailCodeHint') : t('auth.login.authHint')}
            />
            {needEmailOtp && (
              <button
                type="button"
                onClick={resendCode}
                className="mt-1.5 text-xs font-medium text-brand-400 hover:text-brand-300"
              >
                {t('auth.login.resend')}
              </button>
            )}
          </div>
        )}
        <div className="flex justify-end">
          <Link to="/forgot-password" className="text-sm font-medium text-brand-400 hover:text-brand-300">
            {t('auth.login.forgot')}
          </Link>
        </div>
        <Button type="submit" fullWidth size="lg" loading={isSubmitting}>
          {needCode ? t('auth.login.verifyBtn') : t('auth.login.btn')}
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
