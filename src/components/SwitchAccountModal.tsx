import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Modal, Button, Input } from '@/components/ui'
import { useAuth, type SwitchTargetRole } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { ApiError } from '@/lib/api'

interface SwitchAccountModalProps {
  open: boolean
  onClose: () => void
  targetRole: SwitchTargetRole
}

const LABEL: Record<SwitchTargetRole, string> = { CLIENT: 'Client', PARTNER: 'IB Partner' }
const DASHBOARD: Record<SwitchTargetRole, string> = { CLIENT: '/portal/dashboard', PARTNER: '/partner/dashboard' }

/** Step-up verified switch between a client's own trading account and their linked IB partner account. */
export function SwitchAccountModal({ open, onClose, targetRole }: SwitchAccountModalProps) {
  const { requestSwitch, confirmSwitch } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [step, setStep] = useState<'confirm' | 'code'>('confirm')
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const reset = () => {
    setStep('confirm')
    setCode('')
    setError(null)
    setSubmitting(false)
  }
  const close = () => {
    reset()
    onClose()
  }

  const sendCode = async () => {
    setSubmitting(true)
    setError(null)
    try {
      await requestSwitch(targetRole)
      setStep('code')
      toast.success('Code sent', 'Check your email for the verification code.')
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not send a code. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const verify = async () => {
    if (code.length !== 6) return
    setSubmitting(true)
    setError(null)
    try {
      await confirmSwitch(targetRole, code)
      toast.success('Switched', `You're now viewing your ${LABEL[targetRole]} account.`)
      close()
      navigate(DASHBOARD[targetRole], { replace: true })
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Invalid or expired code.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} onClose={close} title={`Switch to ${LABEL[targetRole]}`}>
      {step === 'confirm' ? (
        <div className="space-y-4">
          <p className="text-sm text-gray-400">
            For security, switching to your {LABEL[targetRole]} view needs a quick verification code sent to your
            email.
          </p>
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button fullWidth loading={submitting} onClick={sendCode}>
            Send verification code
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-400">Enter the 6-digit code we emailed you.</p>
          <Input
            label="Verification code"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            inputMode="numeric"
            maxLength={6}
            autoFocus
            error={error ?? undefined}
          />
          <div className="flex gap-3">
            <Button variant="outline" onClick={sendCode} disabled={submitting}>
              Resend
            </Button>
            <Button fullWidth loading={submitting} disabled={code.length !== 6} onClick={verify}>
              Switch to {LABEL[targetRole]}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
