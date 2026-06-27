import { useState } from 'react'
import { MailWarning } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { api } from '@/lib/api'

/** Prompts unverified users to confirm their email; lets them resend the link. */
export function VerifyEmailBanner() {
  const { user } = useAuth()
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const [hidden, setHidden] = useState(false)

  if (!user || user.emailVerified || hidden) return null

  const resend = async () => {
    setBusy(true)
    try {
      await api.post('/auth/resend-verification')
      toast.success('Verification sent', 'Check your inbox for the confirmation link.')
    } catch {
      toast.error('Could not send', 'Please try again shortly.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3">
      <div className="flex items-center gap-2 text-sm text-warning">
        <MailWarning className="h-4 w-4 shrink-0" />
        Verify your email to fully secure your account.
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={resend}
          disabled={busy}
          className="rounded-lg border border-warning/40 px-3 py-1.5 text-xs font-medium text-warning transition-colors hover:bg-warning/15 disabled:opacity-60"
        >
          {busy ? 'Sending…' : 'Resend email'}
        </button>
        <button type="button" onClick={() => setHidden(true)} className="text-xs text-gray-400 hover:text-white">
          Dismiss
        </button>
      </div>
    </div>
  )
}
