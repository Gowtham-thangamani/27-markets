import { useCallback, useEffect, useState } from 'react'
import { Copy, Code } from 'lucide-react'
import { PageTitle } from '@/components/portal/PageTitle'
import { SkeletonRows, ErrorState } from '@/components/ui'
import { useToast } from '@/context/ToastContext'
import { ApiError } from '@/lib/api'
import { partnerApi, type PartnerProfile } from '@/lib/partnerApi'

interface BannerSpec { id: string; label: string; w: number; h: number }
const BANNERS: BannerSpec[] = [
  { id: 'leaderboard', label: 'Leaderboard', w: 728, h: 90 },
  { id: 'rectangle', label: 'Medium rectangle', w: 300, h: 250 },
  { id: 'skyscraper', label: 'Wide skyscraper', w: 300, h: 120 },
]

/** A self-contained HTML banner (inline styles, no external assets) wrapping the
 * partner's referral link — ready to paste into a website or email. */
function bannerHtml(spec: BannerSpec, link: string): string {
  return `<a href="${link}" target="_blank" rel="noopener" style="display:flex;flex-direction:column;justify-content:center;align-items:center;width:${spec.w}px;height:${spec.h}px;background:linear-gradient(135deg,#0b0d12,#1a0e12);border:1px solid rgba(225,29,46,.4);border-radius:12px;font-family:Arial,sans-serif;text-decoration:none;color:#fff;text-align:center;padding:8px;box-sizing:border-box">
  <span style="font-size:18px;font-weight:800;letter-spacing:.5px">27 Markets</span>
  <span style="font-size:12px;color:#e11d2e;font-weight:700;margin-top:2px">Trade 100+ global markets</span>
  <span style="font-size:11px;color:#9ca3af;margin-top:4px">Open your account today</span>
</a>`
}

function BannerCard({ spec, link, onCopy }: { spec: BannerSpec; link: string; onCopy: (t: string, w: string) => void }) {
  const html = bannerHtml(spec, link)
  return (
    <div className="glass-panel p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">{spec.label} <span className="text-xs font-normal text-gray-500">{spec.w}×{spec.h}</span></h3>
        <button onClick={() => onCopy(html, `${spec.label} embed code`)} className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-gray-300 hover:bg-white/10 hover:text-white">
          <Code className="h-3.5 w-3.5" /> Copy embed
        </button>
      </div>
      <div className="overflow-x-auto rounded-lg bg-ink-800/40 p-4">
        {/* Live preview, rendered from the same markup the partner will embed. */}
        <div dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </div>
  )
}

export default function PartnerMarketingPage() {
  const toast = useToast()
  const [profile, setProfile] = useState<PartnerProfile | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try { setProfile(await partnerApi.getProfile()) }
    catch (e) { setError(e instanceof ApiError ? e.message : 'Failed to load') }
  }, [])
  useEffect(() => { void load() }, [load])

  const copy = (text: string, what: string) => { void navigator.clipboard?.writeText(text); toast.success('Copied', `${what} copied.`) }

  return (
    <>
      <PageTitle title="Marketing Materials" subtitle="Ready-to-use banners with your referral link built in." />
      {error ? <ErrorState description={error} onRetry={load} />
        : !profile ? <SkeletonRows rows={3} />
        : (
          <>
            <div className="glass-panel mb-4 flex flex-wrap items-center justify-between gap-2 p-4">
              <div>
                <div className="text-xs text-gray-500">Every banner links to</div>
                <code className="text-xs text-brand-300">{profile.referralLink}</code>
              </div>
              <button onClick={() => copy(profile.referralLink, 'Referral link')} className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-3 py-2 text-xs text-gray-300 hover:bg-white/10 hover:text-white">
                <Copy className="h-3.5 w-3.5" /> Copy link
              </button>
            </div>
            <div className="grid gap-4">
              {BANNERS.map((b) => <BannerCard key={b.id} spec={b} link={profile.referralLink} onCopy={copy} />)}
            </div>
            <p className="mt-4 text-xs text-gray-500">
              Paste an embed snippet into any website or HTML email. The banner is self-contained — no external images — so it renders anywhere.
            </p>
          </>
        )}
    </>
  )
}
