import { useEffect, useState } from 'react'
import { api } from './api'

export interface PublicSettings {
  companyName: string
  supportEmail: string
  supportHours: string
  minDeposit: number
  maintenanceMode: boolean
  maintenanceMessage: string
  liveAccountsEnabled: boolean
}

const DEFAULTS: PublicSettings = {
  companyName: '27 Markets Ltd',
  supportEmail: 'info@27markets.com',
  supportHours: '24/5',
  minDeposit: 50,
  maintenanceMode: false,
  maintenanceMessage: '',
  liveAccountsEnabled: false,
}

// Shared across all consumers so the public settings are fetched once.
let cache: Promise<PublicSettings> | null = null
function fetchSettings(): Promise<PublicSettings> {
  if (!cache) cache = api.get<PublicSettings>('/settings/public').catch(() => DEFAULTS)
  return cache
}

/** Public platform settings (min deposit, support email, maintenance, …). Returns sensible defaults until loaded. */
export function useAppSettings(): PublicSettings {
  const [settings, setSettings] = useState<PublicSettings>(DEFAULTS)
  useEffect(() => {
    let active = true
    void fetchSettings().then((s) => {
      if (active) setSettings(s)
    })
    return () => {
      active = false
    }
  }, [])
  return settings
}
