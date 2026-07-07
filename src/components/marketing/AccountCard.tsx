import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui'
import { fadeUp } from '@/lib/motion'
import { cn } from '@/lib/cn'
import { accountFeatureKey, type AccountTier } from '@/mock/content'
import { useT } from '@/i18n/LanguageContext'

export function AccountCard({ tier }: { tier: AccountTier }) {
  const navigate = useNavigate()
  const t = useT()
  return (
    <motion.div
      variants={fadeUp}
      className={cn(
        'glass-panel relative flex flex-col p-7',
        tier.popular
          ? 'border-brand-500/50 shadow-[0_0_0_1px_rgba(225,29,46,0.35),0_0_50px_rgba(225,29,46,0.18)] lg:-mt-4 lg:mb-4'
          : 'card-lift'
      )}
    >
      {tier.popular && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-500 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-[0_4px_20px_rgba(225,29,46,0.5)]">
          {t('accts.popular')}
        </span>
      )}

      <h3 className="font-display text-xl font-bold text-white">{tier.name}</h3>
      <p className="mt-1 text-sm text-gray-400">{t(`accts.aud.${tier.name.replace(/\s/g, '')}`)}</p>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-white/[0.06] bg-ink-800/60 p-4 text-center">
          <div className="font-display text-2xl font-bold text-white">{tier.spread}</div>
          <div className="mt-0.5 text-[11px] text-gray-500">{t('accts.spreadsFrom')}</div>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-ink-800/60 p-4 text-center">
          <div className="font-display text-2xl font-bold text-white">{tier.leverage}</div>
          <div className="mt-0.5 text-[11px] text-gray-500">{t('accts.maxLev')}</div>
        </div>
      </div>

      <ul className="mt-6 flex-1 space-y-3">
        {tier.features.map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-sm text-gray-300">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-500/15 text-brand-400">
              <Check className="h-3 w-3" />
            </span>
            {accountFeatureKey[f] ? t(accountFeatureKey[f]) : f}
          </li>
        ))}
      </ul>

      <Button
        variant={tier.popular ? 'primary' : 'outline'}
        fullWidth
        className="mt-7"
        onClick={() => navigate(`/register?account=${encodeURIComponent(tier.name)}`)}
      >
        {t('accts.choose')}
      </Button>
    </motion.div>
  )
}
