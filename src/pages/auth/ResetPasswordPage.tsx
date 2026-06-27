import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Lock, CheckCircle2 } from 'lucide-react'
import { AuthShell } from '@/layouts/AuthShell'
import { Button, Input } from '@/components/ui'
import { useToast } from '@/context/ToastContext'
import { api, ApiError } from '@/lib/api'

export default function ResetPasswordPage() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const navigate = useNavigate()
  const toast = useToast()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      toast.warning('Weak password', 'Use at least 8 characters with a letter and a number.')
      return
    }
    if (password !== confirm) {
      toast.warning('Passwords differ', 'Both passwords must match.')
      return
    }
    setBusy(true)
    try {
      await api.post('/auth/reset-password', { token, newPassword: password })
      setDone(true)
      setTimeout(() => navigate('/login', { replace: true }), 1800)
    } catch (e) {
      toast.error('Reset failed', e instanceof ApiError ? e.message : 'The link may be invalid or expired.')
    } finally {
      setBusy(false)
    }
  }

  if (!token) {
    return (
      <AuthShell>
        <div className="text-center">
          <h1 className="font-display text-2xl font-bold text-white">Invalid reset link</h1>
          <p className="mt-2 text-sm text-gray-400">This link is missing its token. Request a new one.</p>
          <Link to="/forgot-password" className="mt-6 inline-block">
            <Button variant="outline">Request reset link</Button>
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
          <h1 className="mt-4 font-display text-2xl font-bold text-white">Password updated</h1>
          <p className="mt-2 text-sm text-gray-400">Redirecting you to login…</p>
        </div>
      ) : (
        <>
          <h1 className="font-display text-3xl font-bold text-white">Set a new password</h1>
          <p className="mt-2 text-sm text-gray-400">Choose a strong password for your account.</p>
          <form onSubmit={submit} className="mt-8 space-y-4" noValidate>
            <Input label="New password" type="password" icon={<Lock className="h-4 w-4" />} value={password} onChange={(e) => setPassword(e.target.value)} />
            <Input label="Confirm password" type="password" icon={<Lock className="h-4 w-4" />} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            <Button type="submit" fullWidth loading={busy}>
              Update password
            </Button>
          </form>
        </>
      )}
    </AuthShell>
  )
}
