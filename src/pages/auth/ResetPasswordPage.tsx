import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Lock, CheckCircle2 } from 'lucide-react'
import { AuthShell } from '@/layouts/AuthShell'
import { Button, Input } from '@/components/ui'
import { useToast } from '@/context/ToastContext'
import { api, ApiError } from '@/lib/api'
import { useT } from '@/i18n/LanguageContext'

export default function ResetPasswordPage() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const navigate = useNavigate()
  const toast = useToast()
  const t = useT()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      toast.warning(t('auth.reset.weak'), t('auth.reset.weakBody'))
      return
    }
    if (password !== confirm) {
      toast.warning(t('auth.reset.differ'), t('auth.reset.differBody'))
      return
    }
    setBusy(true)
    try {
      await api.post('/auth/reset-password', { token, newPassword: password })
      setDone(true)
      setTimeout(() => navigate('/login', { replace: true }), 1800)
    } catch (e) {
      toast.error(t('auth.reset.failed'), e instanceof ApiError ? e.message : t('auth.reset.failedBody'))
    } finally {
      setBusy(false)
    }
  }

  if (!token) {
    return (
      <AuthShell>
        <div className="text-center">
          <h1 className="font-display text-2xl font-bold text-white">{t('auth.reset.invalidTitle')}</h1>
          <p className="mt-2 text-sm text-gray-400">{t('auth.reset.invalidBody')}</p>
          <Link to="/forgot-password" className="mt-6 inline-block">
            <Button variant="outline">{t('auth.reset.requestLink')}</Button>
          </Link>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell>
      {done ? (
        <div className="text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-success" />
          <h1 className="mt-4 font-display text-2xl font-bold text-white">{t('auth.reset.doneTitle')}</h1>
          <p className="mt-2 text-sm text-gray-400">{t('auth.reset.doneBody')}</p>
        </div>
      ) : (
        <>
          <h1 className="font-display text-3xl font-bold text-white">{t('auth.reset.title')}</h1>
          <p className="mt-2 text-sm text-gray-400">{t('auth.reset.sub')}</p>
          <form onSubmit={submit} className="mt-8 space-y-4" noValidate>
            <Input label={t('auth.reset.newPassword')} type="password" icon={<Lock className="h-4 w-4" />} value={password} onChange={(e) => setPassword(e.target.value)} />
            <Input label={t('auth.confirmPassword')} type="password" icon={<Lock className="h-4 w-4" />} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            <Button type="submit" fullWidth loading={busy}>
              {t('auth.reset.update')}
            </Button>
          </form>
        </>
      )}
    </AuthShell>
  )
}
