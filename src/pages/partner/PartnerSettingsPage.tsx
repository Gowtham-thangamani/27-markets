import { useCallback, useEffect, useState } from 'react'
import { Landmark, Bitcoin, Percent, User, Phone, Globe, Mail } from 'lucide-react'
import { Button, Input, ErrorState, SkeletonCard } from '@/components/ui'
import { PageTitle } from '@/components/portal/PageTitle'
import { SecuritySettings } from '@/components/portal/SecuritySettings'
import { useToast } from '@/context/ToastContext'
import { useAuth } from '@/context/AuthContext'
import { ApiError } from '@/lib/api'
import { partnerApi, type PartnerSettings, type PayoutMethod, type TierProgress } from '@/lib/partnerApi'

const usd = (n: number) => `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`

/** Rank / volume-tier standing: current rate + progress bar to the next tier. */
function RankProgress({ tier }: { tier: TierProgress }) {
  // Progress within the current band: from where this rate began to the next
  // threshold. With no next tier the partner is at the top band (full bar).
  const pct = tier.next
    ? Math.min(100, Math.max(0, (tier.volume / tier.next.threshold) * 100))
    : 100
  return (
    <div className="mt-4 rounded-lg border border-brand-500/20 bg-brand-500/[0.06] p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-white">Your rank</div>
        <div className="font-display text-xl font-bold text-brand-300">{tier.currentRate}%</div>
      </div>
      <div className="mt-1 text-xs text-gray-500">Referred volume: <span className="text-gray-300">{usd(tier.volume)}</span></div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-brand-500" style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-2 text-xs text-gray-400">
        {tier.next
          ? <>Reach <span className="text-white">{usd(tier.next.threshold)}</span> referred volume to earn <span className="text-brand-300">{tier.next.rate}%</span> — {usd(Math.max(0, tier.next.threshold - tier.volume))} to go.</>
          : <>You're at the top commission tier. 🎉</>}
      </div>
    </div>
  )
}

/** Name + contact details, editable by the partner (email is support-only). */
function PartnerProfileCard() {
  const toast = useToast()
  const { user, updateProfile } = useAuth()
  const [name, setName] = useState(user?.name ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [country, setCountry] = useState(user?.country ?? '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setName(user?.name ?? ''); setPhone(user?.phone ?? ''); setCountry(user?.country ?? '')
  }, [user])

  const save = async () => {
    setSaving(true)
    try {
      await updateProfile({ name, phone, country })
      toast.success('Profile updated', 'Your changes have been saved.')
    } catch (e) {
      toast.error('Could not save', e instanceof ApiError ? e.message : 'Please try again.')
    } finally { setSaving(false) }
  }

  return (
    <div className="glass-panel p-6">
      <h3 className="text-sm font-semibold text-white">Profile</h3>
      <p className="mt-0.5 text-xs text-gray-500">Your name and contact details.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Input label="Full name" icon={<User className="h-4 w-4" />} value={name} onChange={(e) => setName(e.target.value)} />
        <Input label="Email" type="email" readOnly icon={<Mail className="h-4 w-4" />} hint="Contact support to change your email" value={user?.email ?? ''} />
        <Input label="Phone" icon={<Phone className="h-4 w-4" />} value={phone} onChange={(e) => setPhone(e.target.value)} />
        <Input label="Country" icon={<Globe className="h-4 w-4" />} value={country} onChange={(e) => setCountry(e.target.value)} />
      </div>
      <div className="mt-4"><Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save profile'}</Button></div>
    </div>
  )
}

const BANK_FIELDS: { key: string; label: string; placeholder: string }[] = [
  { key: 'accountName', label: 'Account holder', placeholder: 'Full name on the account' },
  { key: 'bankName', label: 'Bank name', placeholder: 'e.g. Emirates NBD' },
  { key: 'iban', label: 'IBAN / account number', placeholder: 'AE07 0331 2345 6789 0123 456' },
  { key: 'swift', label: 'SWIFT / BIC', placeholder: 'EBILAEAD' },
]
const CRYPTO_FIELDS: { key: string; label: string; placeholder: string }[] = [
  { key: 'network', label: 'Network', placeholder: 'e.g. USDT (TRC-20)' },
  { key: 'address', label: 'Wallet address', placeholder: 'Your receiving address' },
]

export default function PartnerSettingsPage() {
  const toast = useToast()
  const [data, setData] = useState<PartnerSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [method, setMethod] = useState<PayoutMethod>('BANK')
  const [details, setDetails] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const s = await partnerApi.getSettings()
      setData(s)
      setMethod(s.payoutMethod ?? 'BANK')
      setDetails(s.payoutDetails ?? {})
    } catch (e) { setError(e instanceof ApiError ? e.message : 'Failed to load') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void load() }, [load])

  const fields = method === 'BANK' ? BANK_FIELDS : CRYPTO_FIELDS

  const save = useCallback(async () => {
    setSaving(true)
    try {
      await partnerApi.updatePayoutMethod(method, details)
      toast.success('Saved', 'Your payout method has been updated.')
      await load()
    } catch (e) {
      toast.error('Could not save', e instanceof ApiError ? e.message : 'Please try again.')
    } finally { setSaving(false) }
  }, [method, details, toast, load])

  const switchMethod = (m: PayoutMethod) => {
    setMethod(m)
    // Keep prior values only if they belong to this method's saved record.
    setDetails(data?.payoutMethod === m ? (data.payoutDetails ?? {}) : {})
  }

  return (
    <>
      <PageTitle title="Settings" subtitle="Your profile, security, payout method and commission rates." />

      <div className="mb-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <PartnerProfileCard />
        <div className="glass-panel p-6">
          <h3 className="mb-1 text-sm font-semibold text-white">Security</h3>
          <p className="mb-4 text-xs text-gray-500">Protect your commission account.</p>
          <SecuritySettings />
        </div>
      </div>

      {error ? <ErrorState description={error} onRetry={load} />
        : loading || !data ? <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]"><SkeletonCard /><SkeletonCard /></div>
        : (
          <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <div className="glass-panel p-6">
              <h3 className="text-sm font-semibold text-white">Payout method</h3>
              <p className="mt-0.5 text-xs text-gray-500">Where we send your approved commission. Required before you can request a payout.</p>

              <div className="mt-4 flex gap-2">
                <button onClick={() => switchMethod('BANK')}
                  className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${method === 'BANK' ? 'border-brand-500 bg-brand-500/10 text-white' : 'border-white/10 text-gray-400 hover:bg-white/5'}`}>
                  <Landmark className="h-4 w-4" /> Bank transfer
                </button>
                <button onClick={() => switchMethod('CRYPTO')}
                  className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${method === 'CRYPTO' ? 'border-brand-500 bg-brand-500/10 text-white' : 'border-white/10 text-gray-400 hover:bg-white/5'}`}>
                  <Bitcoin className="h-4 w-4" /> Crypto
                </button>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {fields.map((f) => (
                  <label key={f.key} className={f.key === 'address' ? 'sm:col-span-2' : ''}>
                    <span className="mb-1 block text-xs text-gray-400">{f.label}</span>
                    <Input
                      value={details[f.key] ?? ''}
                      placeholder={f.placeholder}
                      onChange={(e) => setDetails((d) => ({ ...d, [f.key]: e.target.value }))}
                    />
                  </label>
                ))}
              </div>

              <div className="mt-5 flex items-center gap-3">
                <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save payout method'}</Button>
                {data.payoutMethod && <span className="text-xs text-success">✓ {data.payoutMethod === 'BANK' ? 'Bank transfer' : 'Crypto'} on file</span>}
              </div>
            </div>

            <div className="glass-panel p-6">
              <div className="flex items-center gap-2">
                <Percent className="h-5 w-5 text-brand-400" />
                <h3 className="text-sm font-semibold text-white">Your commission rates</h3>
              </div>
              <p className="mt-0.5 text-xs text-gray-500">Set by 27 Markets. Applied to referred clients' deposits.</p>
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between rounded-lg border border-white/10 bg-ink-800/60 px-4 py-3">
                  <div><div className="text-sm text-white">Direct</div><div className="text-xs text-gray-500">Your own referred clients</div></div>
                  <div className="font-display text-xl font-bold text-white">{data.rates.direct}%</div>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-white/10 bg-ink-800/60 px-4 py-3">
                  <div><div className="text-sm text-white">Indirect</div><div className="text-xs text-gray-500">Your sub-partners' clients</div></div>
                  <div className="font-display text-xl font-bold text-white">{data.rates.indirect}%</div>
                </div>
              </div>

              {data.tierProgress.tiered && <RankProgress tier={data.tierProgress} />}
            </div>
          </div>
        )}
    </>
  )
}
