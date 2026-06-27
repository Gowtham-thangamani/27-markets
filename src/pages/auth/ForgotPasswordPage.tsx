import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, CheckCircle2 } from 'lucide-react'
import { AuthShell } from '@/layouts/AuthShell'
import { Button, Input } from '@/components/ui'
import { api } from '@/lib/api'

export default function ForgotPasswordPage() {
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
          <h1 className="mt-4 font-display text-2xl font-bold text-white">Check your email</h1>
          <p className="mt-2 text-sm text-gray-400">
            If an account exists for <span className="text-white">{email}</span>, we've sent a password‑reset link. It expires in 1 hour.
          </p>
          <Link to="/login" className="mt-6 inline-block">
            <Button variant="outline">Back to login</Button>
          </Link>
        </div>
      ) : (
        <>
          <h1 className="font-display text-3xl font-bold text-white">Forgot password</h1>
          <p className="mt-2 text-sm text-gray-400">Enter your email and we'll send you a reset link.</p>
          <form onSubmit={submit} className="mt-8 space-y-4" noValidate>
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              icon={<Mail className="h-4 w-4" />}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Button type="submit" fullWidth loading={busy}>
              Send reset link
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-gray-400">
            Remembered it?{' '}
            <Link to="/login" className="font-semibold text-brand-400 hover:text-brand-300">
              Login
            </Link>
          </p>
        </>
      )}
    </AuthShell>
  )
}
