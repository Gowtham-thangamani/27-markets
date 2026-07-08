import { useEffect, useState } from 'react'
import { api } from './api'
import { accountTiers, type AccountTier } from '@/mock/content'

export interface AccountTypeConfig {
  type: 'STANDARD' | 'RAW_SPREAD' | 'VIP'
  displayName: string
  spreadFrom: string
  commission: string
  leverage: string
  minDeposit: number
  popular: boolean
  sortOrder: number
}

const TYPE_TO_NAME: Record<string, AccountTier['name']> = {
  STANDARD: 'Standard',
  RAW_SPREAD: 'Raw Spread',
  VIP: 'VIP',
}

/**
 * Live account-type config for the marketing site, merged over the static
 * tier content. The static copy (audience, features, translation keys) is kept;
 * only the editable numbers (spread, leverage, commission, min deposit, popular)
 * come from the backend. Falls back to fully static content while loading or if
 * the request fails, so the pricing pages never break.
 */
export function useAccountTypes() {
  const [byName, setByName] = useState<Map<string, AccountTypeConfig> | null>(null)

  useEffect(() => {
    let active = true
    api
      .get<AccountTypeConfig[]>('/accounts/types')
      .then((configs) => {
        if (!active) return
        const map = new Map<string, AccountTypeConfig>()
        configs.forEach((c) => map.set(TYPE_TO_NAME[c.type] ?? c.displayName, c))
        setByName(map)
      })
      .catch(() => {
        if (active) setByName(null)
      })
    return () => {
      active = false
    }
  }, [])

  const tiers: AccountTier[] = accountTiers.map((t) => {
    const c = byName?.get(t.name)
    return c ? { ...t, spread: c.spreadFrom, leverage: c.leverage, popular: c.popular } : t
  })

  return { tiers, byName, loaded: byName != null }
}
