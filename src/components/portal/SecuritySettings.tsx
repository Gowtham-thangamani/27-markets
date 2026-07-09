import { useCallback, useEffect, useState } from 'react'
import { Lock, ShieldCheck, ShieldOff } from 'lucide-react'
import { Badge, Button, Input, Modal } from '@/components/ui'
import { useToast } from '@/context/ToastContext'
import { authApi, type TwoFactorSetup } from '@/lib/authApi'
import { ApiError } from '@/lib/api'

/** Real security controls: change password + TOTP two-factor enrolment. */
export function SecuritySettings() {
  const toast = useToast()
  const [twoFactor, setTwoFactor] = useState<boolean | null>(null)
  const [pwOpen, setPwOpen] = useState(false)
  const [disableOpen, setDisableOpen] = useState(false)
  const [setupData, setSetupData] = useState<TwoFactorSetup | null>(null)

  const refresh = useCallback(async () => {
    try {
      const me = await authApi.me()
      setTwoFactor(me.twoFactorEnabled)
    } catch {
      setTwoFactor(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const startSetup = async () => {
    try {
      setSetupData(await authApi.setup2fa())
    } catch (e) {
      toast.error('Could not start 2FA setup', (e as Error).message)
    }
  }


  return (
    <div className="glass-panel p-6">
      <div className="flex items-center gap-2">
        <Lock className="h-5 w-5 text-brand-400" />
        <h3 className="font-display text-base font-semibold text-white">Security</h3>
      </div>

      <div className="mt-4 space-y-3">
        <Button variant="outline" fullWidth onClick={() => setPwOpen(true)}>
          Change password
        </Button>

        <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-ink-800/50 p-3">
          <div className="flex items-center gap-2">
            {twoFactor ? (
              <ShieldCheck className="h-4 w-4 text-success" />
            ) : (
              <ShieldOff className="h-4 w-4 text-gray-500" />
            )}
            <span className="text-sm text-gray-300">Two-factor auth</span>
            {twoFactor !== null && (
              <Badge tone={twoFactor ? 'success' : 'neutral'}>{twoFactor ? 'On' : 'Off'}</Badge>
            )}
          </div>
          {twoFactor ? (
            <Button size="sm" variant="ghost" onClick={() => setDisableOpen(true)}>
              Disable
            </Button>
          ) : (
            <Button size="sm" variant="ghost" onClick={startSetup}>
              Enable
            </Button>
          )}
        </div>
      </div>

      <ChangePasswordModal open={pwOpen} onClose={() => setPwOpen(false)} />
      <Enable2faModal
        data={setupData}
        onClose={() => setSetupData(null)}
        onEnabled={() => {
          setSetupData(null)
          void refresh()
        }}
      />
      <Disable2faModal
        open={disableOpen}
        onClose={() => setDisableOpen(false)}
        onDisabled={() => {
          setDisableOpen(false)
          void refresh()
        }}
      />
    </div>
  )
}

function Disable2faModal({ open, onClose, onDisabled }: { open: boolean; onClose: () => void; onDisabled: () => void }) {
  const toast = useToast()
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    setError(null)
    if (!password) return setError('Enter your current password')
    if (!/^\d{6}$/.test(code)) return setError('Enter the 6-digit code from your authenticator')
    setSaving(true)
    try {
      await authApi.disable2fa(password, code)
      toast.info('2FA disabled', 'Two-factor authentication has been turned off.')
      setPassword('')
      setCode('')
      onDisabled()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not disable 2FA')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Disable two-factor authentication" description="Confirm your identity to turn off 2FA — this removes an account-protection layer.">
      <div className="space-y-4">
        <Input label="Current password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <Input
          label="Authentication code"
          inputMode="numeric"
          placeholder="123456"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          error={error ?? undefined}
        />
        <div className="flex gap-3">
          <Button variant="outline" fullWidth onClick={onClose}>
            Cancel
          </Button>
          <Button fullWidth loading={saving} onClick={submit}>
            Disable 2FA
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function ChangePasswordModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    setError(null)
    if (next.length < 8) return setError('New password must be at least 8 characters')
    if (next !== confirm) return setError('Passwords do not match')
    setSaving(true)
    try {
      await authApi.changePassword(current, next)
      toast.success('Password changed', 'Use your new password next time you sign in.')
      setCurrent('')
      setNext('')
      setConfirm('')
      onClose()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not change password')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Change password">
      <div className="space-y-4">
        <Input label="Current password" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} />
        <Input label="New password" type="password" value={next} onChange={(e) => setNext(e.target.value)} hint="At least 8 characters, with a letter and a number" />
        <Input label="Confirm new password" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} error={error ?? undefined} />
        <div className="flex gap-3">
          <Button variant="outline" fullWidth onClick={onClose}>
            Cancel
          </Button>
          <Button fullWidth loading={saving} onClick={submit}>
            Update password
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function Enable2faModal({
  data,
  onClose,
  onEnabled,
}: {
  data: TwoFactorSetup | null
  onClose: () => void
  onEnabled: () => void
}) {
  const toast = useToast()
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    setError(null)
    if (!/^\d{6}$/.test(code)) return setError('Enter the 6-digit code')
    setSaving(true)
    try {
      await authApi.enable2fa(code)
      toast.success('2FA enabled', 'Two-factor authentication is now protecting your account.')
      setCode('')
      onEnabled()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Invalid code')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={!!data} onClose={onClose} title="Enable two-factor authentication" description="Scan the QR code with an authenticator app (Google Authenticator, Authy, 1Password), then enter the 6-digit code.">
      {data && (
        <div className="space-y-4">
          <div className="flex justify-center">
            <img src={data.qrDataUrl} alt="2FA QR code" className="h-44 w-44 rounded-xl bg-white p-2" />
          </div>
          <Input
            label="Authentication code"
            inputMode="numeric"
            placeholder="123456"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            error={error ?? undefined}
          />
          <div className="flex gap-3">
            <Button variant="outline" fullWidth onClick={onClose}>
              Cancel
            </Button>
            <Button fullWidth loading={saving} onClick={submit}>
              Verify & enable
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
