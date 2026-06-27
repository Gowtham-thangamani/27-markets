import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { AuthShell } from '@/layouts/AuthShell'
import { Button } from '@/components/ui'
import { api, ApiError } from '@/lib/api'

export default function VerifyEmailPage() {
  const [params] = useSearchParams()
  const token = params.get('token')
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) {
      setState('error')
      setMessage('This verification link is missing its token.')
      return
    }
    api
      .post('/auth/verify-email', { token })
      .then(() => setState('ok'))
      .catch((e) => {
        setState('error')
        setMessage(e instanceof ApiError ? e.message : 'Could not verify your email.')
      })
  }, [token])

  return (
    <AuthShell>
      <div className="text-center">
        {state === 'loading' && (
          <>
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-brand-400" />
            <h1 className="mt-4 font-display text-2xl font-bold text-white">Verifying your email…</h1>
          </>
        )}
        {state === 'ok' && (
          <>
            <CheckCircle2 className="mx-auto h-12 w-12 text-success" />
            <h1 className="mt-4 font-display text-2xl font-bold text-white">Email verified</h1>
            <p className="mt-2 text-sm text-gray-400">Your email is confirmed. You're all set.</p>
            <Link to="/portal/dashboard" className="mt-6 inline-block">
              <Button>Go to dashboard</Button>
            </Link>
          </>
        )}
        {state === 'error' && (
          <>
            <XCircle className="mx-auto h-12 w-12 text-danger" />
            <h1 className="mt-4 font-display text-2xl font-bold text-white">Verification failed</h1>
            <p className="mt-2 text-sm text-gray-400">{message} You can request a new link from your profile.</p>
            <Link to="/login" className="mt-6 inline-block">
              <Button variant="outline">Back to login</Button>
            </Link>
          </>
        )}
      </div>
    </AuthShell>
  )
}
