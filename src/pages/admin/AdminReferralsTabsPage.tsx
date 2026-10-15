import { useState } from 'react'
import { Tabs } from '@/components/ui'
import AdminReferralsPage from './AdminReferralsPage'
import AdminUserReferralsPage from './AdminUserReferralsPage'

/**
 * Two views of one dataset: the clients who arrived through a referral, and the
 * people who referred them. They were separate sidebar rows under a group whose
 * only purpose was to hold them.
 */
const TABS = [
  { id: 'clients', label: 'Referred Clients' },
  { id: 'referrers', label: 'Top Referrers' },
]

export default function AdminReferralsTabsPage() {
  const [tab, setTab] = useState<'clients' | 'referrers'>('clients')
  return (
    <>
      <Tabs tabs={TABS} active={tab} onChange={(id) => setTab(id as 'clients' | 'referrers')} className="mb-4" />
      {tab === 'clients' ? <AdminReferralsPage /> : <AdminUserReferralsPage />}
    </>
  )
}
