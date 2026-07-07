import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { AuthShell } from '@/layouts/AuthShell'
import { Button } from '@/components/ui'
import { api, ApiError } from '@/lib/api'
import { useT } from '@/i18n/LanguageContext'

export default function VerifyEmailPage() {
  const t = useT()
  const [params] = useSearchParams()
  const token = params.get('token')
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) {
      setState('error')
      setMessage(t('auth.verify.missingToken'))
      return
    }
    api
      .post('/auth/verify-email', { token })
      .then(() => setState('ok'))
      .catch((e) => {
        setState('error')
        setMessage(e instanceof ApiError ? e.message : t('auth.verify.couldNot'))
      })
  }, [token, t])

  return (
    <AuthShell>
      <div className="text-center">
        {state === 'loading' && (
          <>
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-brand-400" />
            <h1 className="mt-4 font-display text-2xl font-bold text-white">{t('auth.verify.loading')}</h1>
          </>
        )}
        {state === 'ok' && (
          <>
            <CheckCircle2 className="mx-auto h-12 w-12 text-success" />
            <h1 className="mt-4 font-display text-2xl font-bold text-white">{t('auth.verify.okTitle')}</h1>
            <p className="mt-2 text-sm text-gray-400">{t('auth.verify.okBody')}</p>
            <Link to="/portal/dashboard" className="mt-6 inline-block">
              <Button>{t('auth.verify.goDashboard')}</Button>
            </Link>
          </>
        )}
        {state === 'error' && (
          <>
            <XCircle className="mx-auto h-12 w-12 text-danger" />
            <h1 className="mt-4 font-display text-2xl font-bold text-white">{t('auth.verify.failTitle')}</h1>
            <p className="mt-2 text-sm text-gray-400">{message} {t('auth.verify.failSuffix')}</p>
            <Link to="/login" className="mt-6 inline-block">
              <Button variant="outline">{t('auth.backToLogin')}</Button>
            </Link>
          </>
        )}
      </div>
    </AuthShell>
  )
}
