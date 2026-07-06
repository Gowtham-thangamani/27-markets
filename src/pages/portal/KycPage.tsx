import { motion } from 'framer-motion'
import { ShieldCheck, ShieldAlert, Clock, CircleDashed, Info, Lock, Unlock } from 'lucide-react'
import { Badge, Button, FileUpload, ProgressBar } from '@/components/ui'
import { PageTitle } from '@/components/portal/PageTitle'
import { statusTone } from '@/components/portal/statusTone'
import { usePortalData } from '@/context/PortalDataContext'
import { useToast } from '@/context/ToastContext'
import { fadeUp, staggerContainer } from '@/lib/motion'
import type { KycStatus, KycStep } from '@/lib/types'

const statusIcon: Record<KycStatus, typeof ShieldCheck> = {
  Approved: ShieldCheck,
  Pending: Clock,
  Rejected: ShieldAlert,
  'Not Submitted': CircleDashed,
}

/** What each verification level unlocks — mirrors the tiered "features unlocked /
 * trading limit" model. Limits are indicative and can be tuned per policy. */
const UNLOCKS: Record<KycStep['id'], { level: string; feature: string; limit: string }> = {
  identity: { level: 'Level 1', feature: 'Open a live trading account', limit: 'Up to $2,000' },
  address: { level: 'Level 2', feature: 'Deposits & higher trading limits', limit: 'Up to $50,000' },
  selfie: { level: 'Level 3', feature: 'Full withdrawals & unlimited trading', limit: 'Unlimited' },
}

export default function KycPage() {
  const { kyc, kycProgress, submitKyc } = usePortalData()
  const toast = useToast()

  const allApproved = kyc.every((k) => k.status === 'Approved')

  return (
    <>
      <PageTitle
        title="KYC Verification"
        subtitle="Complete the steps below to fully verify your account."
      />

      {/* Progress + compliance message */}
      <div className="glass-panel mb-6 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold text-white">Verification progress</h2>
            <p className="mt-1 text-sm text-gray-400">
              {allApproved
                ? 'Your identity is fully verified. All features are unlocked.'
                : 'Verify your identity to unlock withdrawals and higher limits.'}
            </p>
          </div>
          <Badge tone={allApproved ? 'success' : 'warning'} dot>
            {allApproved ? 'Verified' : 'In Progress'}
          </Badge>
        </div>
        <div className="mt-4">
          <ProgressBar value={kycProgress} showLabel tone={allApproved ? 'success' : 'brand'} />
        </div>
      </div>

      <div className="mb-6 flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-4 text-sm text-gray-300">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-brand-400" />
        <p>
          Your documents are encrypted and handled in line with our AML and data-protection
          policies. Verification is usually completed within 24 hours.
        </p>
      </div>

      {/* Steps */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="space-y-4"
      >
        {kyc.map((step, i) => {
          const Icon = statusIcon[step.status]
          const canUpload = step.status === 'Not Submitted' || step.status === 'Rejected'
          return (
            <motion.div key={step.id} variants={fadeUp} className="glass-panel p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex items-start gap-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink-700 font-display text-sm font-bold text-brand-400 ring-1 ring-brand-500/30">
                    {i + 1}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-gray-400" />
                      <h3 className="font-display text-base font-semibold text-white">{step.title}</h3>
                    </div>
                    <p className="mt-1 max-w-md text-sm text-gray-400">{step.description}</p>
                    {step.fileName && (
                      <p className="mt-1.5 text-xs text-gray-500">Uploaded: {step.fileName}</p>
                    )}
                  </div>
                </div>
                <Badge tone={statusTone(step.status)} dot className="self-start">
                  {step.status}
                </Badge>
              </div>

              {canUpload && (
                <div className="mt-4 lg:ml-14">
                  <FileUpload
                    label={`Upload ${step.title.toLowerCase()}`}
                    onFile={async (file) => {
                      try {
                        await submitKyc(step.id, file)
                        toast.success('Document submitted', `${step.title} is now under review.`)
                      } catch (err) {
                        toast.error('Upload failed', (err as Error).message)
                      }
                    }}
                  />
                </div>
              )}

              {step.status === 'Pending' && (
                <p className="mt-4 text-xs text-gray-500 lg:ml-14">
                  Submitted — our compliance team will review this document, usually within 24 hours.
                </p>
              )}

              {/* Features unlocked at this level */}
              {(() => {
                const u = UNLOCKS[step.id]
                const unlocked = step.status === 'Approved'
                return (
                  <div
                    className={`mt-4 flex items-center gap-3 rounded-xl border p-3 lg:ml-14 ${
                      unlocked
                        ? 'border-success/20 bg-success/[0.05]'
                        : 'border-white/10 bg-white/[0.02]'
                    }`}
                  >
                    <span
                      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                        unlocked ? 'bg-success/15 text-success' : 'bg-white/5 text-gray-500'
                      }`}
                    >
                      {unlocked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 text-sm">
                        <span className="font-semibold text-brand-400">{u.level}</span>
                        <span className={unlocked ? 'text-white' : 'text-gray-300'}>{u.feature}</span>
                      </div>
                      <div className="text-xs text-gray-500">Trading limit: {u.limit}</div>
                    </div>
                    <span
                      className={`shrink-0 text-xs font-medium ${
                        unlocked ? 'text-success' : 'text-gray-500'
                      }`}
                    >
                      {unlocked ? 'Unlocked' : 'Locked'}
                    </span>
                  </div>
                )
              })()}
            </motion.div>
          )
        })}
      </motion.div>

      {allApproved && (
        <div className="mt-6 flex items-center justify-center gap-2 rounded-xl border border-success/20 bg-success/[0.05] p-4 text-success">
          <ShieldCheck className="h-5 w-5" />
          <span className="text-sm font-medium">Your account is fully verified.</span>
        </div>
      )}
    </>
  )
}
