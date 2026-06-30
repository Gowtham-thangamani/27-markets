import { useCallback, useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Copy, Share2 } from 'lucide-react'
import { PageTitle } from '@/components/portal/PageTitle'
import { SkeletonRows, ErrorState } from '@/components/ui'
import { useToast } from '@/context/ToastContext'
import { ApiError } from '@/lib/api'
import { partnerApi, type PartnerProfile } from '@/lib/partnerApi'

export default function PartnerReferralToolsPage() {
  const toast = useToast()
  const [profile, setProfile] = useState<PartnerProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try { setProfile(await partnerApi.getProfile()) }
    catch (e) { setError(e instanceof ApiError ? e.message : 'Failed to load') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void load() }, [load])

  if (error) return (<><PageTitle title="Referral Tools" subtitle="Share your link and grow your network." /><ErrorState description={error} onRetry={load} /></>)
  if (loading || !profile) return (<><PageTitle title="Referral Tools" subtitle="Share your link and grow your network." /><SkeletonRows rows={4} /></>)

  const shareText = `Join me on 27 Markets — trade 100+ global markets. Sign up with my link: ${profile.referralLink}`
  const copy = (text: string, what: string) => { void navigator.clipboard?.writeText(text); toast.success('Copied', `${what} copied.`) }

  return (
    <>
      <PageTitle title="Referral Tools" subtitle="Share your link and grow your network." />
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-4">
          <div className="glass-panel p-5">
            <h3 className="mb-3 text-sm font-semibold text-white">Referral link</h3>
            <div className="flex items-center gap-2">
              <code className="flex-1 truncate rounded-lg border border-white/10 bg-ink-800/60 px-3 py-2 text-xs text-brand-300">{profile.referralLink}</code>
              <button onClick={() => copy(profile.referralLink, 'Link')} className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-3 py-2 text-xs text-gray-300 hover:bg-white/10 hover:text-white"><Copy className="h-3.5 w-3.5" /> Copy</button>
            </div>
            <p className="mt-2 text-xs text-gray-500">Referral code: <span className="font-mono text-brand-300">{profile.referralCode}</span></p>
          </div>
          <div className="glass-panel p-5">
            <h3 className="mb-3 text-sm font-semibold text-white">Share message</h3>
            <p className="rounded-lg border border-white/10 bg-ink-800/60 p-3 text-sm text-gray-300">{shareText}</p>
            <button onClick={() => copy(shareText, 'Message')} className="mt-3 inline-flex items-center gap-1 rounded-lg border border-white/10 px-3 py-2 text-xs text-gray-300 hover:bg-white/10 hover:text-white"><Share2 className="h-3.5 w-3.5" /> Copy message</button>
          </div>
        </div>
        <div className="glass-panel flex flex-col items-center justify-center p-5">
          <h3 className="mb-4 text-sm font-semibold text-white">Scan to refer</h3>
          <div className="rounded-xl bg-white p-3"><QRCodeSVG value={profile.referralLink} size={168} /></div>
          <p className="mt-3 text-center text-xs text-gray-500">Point a phone camera at this code to open your referral link.</p>
        </div>
      </div>
    </>
  )
}
