import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, CheckCircle2 } from 'lucide-react'
import { AuthShell } from '@/layouts/AuthShell'
import { Button, Input } from '@/components/ui'
import { api } from '@/lib/api'
import { useT } from '@/i18n/LanguageContext'

export default function ForgotPasswordPage() {
  const t = useT()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      await api.post('/auth/forgot-password', { email })
      setSent(true) // always succeeds (no account enumeration)
    } catch {
      setSent(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell>
      {sent ? (
        <div className="text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-success" />
          <h1 className="mt-4 font-display text-2xl font-bold text-white">{t('auth.forgot.checkEmail')}</h1>
          <p className="mt-2 text-sm text-gray-400">
            {t('auth.forgot.checkBody1')} <span className="text-white">{email}</span>{t('auth.forgot.checkBody2')}
          </p>
          <Link to="/login" className="mt-6 inline-block">
            <Button variant="outline">{t('auth.backToLogin')}</Button>
          </Link>
        </div>
      ) : (
        <>
          <h1 className="font-display text-3xl font-bold text-white">{t('auth.forgot.title')}</h1>
          <p className="mt-2 text-sm text-gray-400">{t('auth.forgot.sub')}</p>
          <form onSubmit={submit} className="mt-8 space-y-4" noValidate>
            <Input
              label={t('auth.email')}
              type="email"
              placeholder="you@example.com"
              icon={<Mail className="h-4 w-4" />}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Button type="submit" fullWidth loading={busy}>
              {t('auth.forgot.send')}
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-gray-400">
            {t('auth.forgot.remembered')}{' '}
            <Link to="/login" className="font-semibold text-brand-400 hover:text-brand-300">
              {t('auth.loginWord')}
            </Link>
          </p>
        </>
      )}
    </AuthShell>
  )
}
