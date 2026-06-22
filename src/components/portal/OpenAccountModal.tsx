import { useState } from 'react'
import { Modal, Button, Select } from '@/components/ui'
import { usePortalData } from '@/context/PortalDataContext'
import { useToast } from '@/context/ToastContext'
import { cn } from '@/lib/cn'
import type { AccountType } from '@/lib/types'

const types: AccountType[] = ['Standard', 'Raw Spread', 'VIP']

export function OpenAccountModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { openAccount } = usePortalData()
  const toast = useToast()
  const [type, setType] = useState<AccountType>('Raw Spread')
  const [mode, setMode] = useState<'Live' | 'Demo'>('Live')
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    setLoading(true)
    try {
      await openAccount(type, mode)
      toast.success('Account created', `Your ${mode} ${type} account is ready.`)
      onClose()
    } catch (err) {
      toast.error('Could not create account', (err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Open a new account" description="Choose your account type and mode.">
      <div className="space-y-5">
        <div>
          <p className="mb-1.5 text-sm font-medium text-gray-300">Account type</p>
          <div className="grid grid-cols-3 gap-2">
            {types.map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={cn(
                  'rounded-xl border px-2 py-3 text-sm font-medium transition-colors',
                  type === t
                    ? 'border-brand-500/60 bg-brand-500/10 text-white'
                    : 'border-white/10 text-gray-400 hover:border-white/20'
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <Select
          label="Mode"
          value={mode}
          onChange={(e) => setMode(e.target.value as 'Live' | 'Demo')}
          options={[
            { value: 'Live', label: 'Live — trade with real funds' },
            { value: 'Demo', label: 'Demo — $50,000 virtual balance' },
          ]}
        />

        <div className="flex gap-3 pt-1">
          <Button variant="outline" onClick={onClose} fullWidth>
            Cancel
          </Button>
          <Button onClick={submit} loading={loading} fullWidth>
            Create Account
          </Button>
        </div>
      </div>
    </Modal>
  )
}
