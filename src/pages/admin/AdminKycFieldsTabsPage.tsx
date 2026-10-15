import { useState } from 'react'
import { Tabs } from '@/components/ui'
import AdminKycFieldsPage from './AdminKycFieldsPage'

/**
 * KYC Questions and Extended Fields were two sidebar rows rendering the same
 * component with a different `kind`. One page, two tabs.
 */
const TABS = [
  { id: 'QUESTION', label: 'KYC Questions' },
  { id: 'EXTENDED', label: 'Extended Fields' },
] as const

const COPY = {
  QUESTION: { title: 'KYC Questions', subtitle: 'Questions asked during KYC onboarding.' },
  EXTENDED: { title: 'Extended Fields', subtitle: 'Additional profile fields collected from clients.' },
} as const

export default function AdminKycFieldsTabsPage() {
  const [tab, setTab] = useState<'QUESTION' | 'EXTENDED'>('QUESTION')
  return (
    <>
      <Tabs tabs={TABS as unknown as { id: string; label: string }[]} active={tab} onChange={(id) => setTab(id as 'QUESTION' | 'EXTENDED')} className="mb-4" />
      <AdminKycFieldsPage kind={tab} title={COPY[tab].title} subtitle={COPY[tab].subtitle} />
    </>
  )
}
