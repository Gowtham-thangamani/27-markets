import { useState } from 'react'
import { Tabs } from '@/components/ui'
import AdminPaymentMethodTypesPage from './AdminPaymentMethodTypesPage'

/**
 * Credit Card Types and E-Wallet Types were two sidebar rows rendering the same
 * component with a different `category`. One page, two tabs.
 */
const TABS = [
  { id: 'CARD', label: 'Credit Card Types' },
  { id: 'EWALLET', label: 'E-Wallet Types' },
]

const COPY = {
  CARD: { title: 'Credit Card Types', subtitle: 'Card brands accepted for deposits.' },
  EWALLET: { title: 'E-Wallet Types', subtitle: 'E-wallet providers accepted for deposits.' },
} as const

export default function AdminPaymentMethodTypesTabsPage() {
  const [tab, setTab] = useState<'CARD' | 'EWALLET'>('CARD')
  return (
    <>
      <Tabs tabs={TABS} active={tab} onChange={(id) => setTab(id as 'CARD' | 'EWALLET')} className="mb-4" />
      <AdminPaymentMethodTypesPage category={tab} title={COPY[tab].title} subtitle={COPY[tab].subtitle} />
    </>
  )
}
