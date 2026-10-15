import { useState } from 'react'
import { Tabs } from '@/components/ui'
import AdminTextTemplatesPage from './AdminTextTemplatesPage'

/**
 * PDF and comment templates were two sidebar rows rendering the same component
 * with a different `kind` — under a group also called 'Templates', which the
 * notification templates row collided with. One page, two tabs.
 */
const TABS = [
  { id: 'PDF', label: 'PDF Templates' },
  { id: 'COMMENT', label: 'Comment Templates' },
]

const COPY = {
  PDF: { title: 'PDF Templates', subtitle: 'Document templates for statements, receipts, etc.' },
  COMMENT: { title: 'Comment Templates', subtitle: 'Canned replies staff can reuse.' },
} as const

export default function AdminTemplatesTabsPage() {
  const [tab, setTab] = useState<'PDF' | 'COMMENT'>('PDF')
  return (
    <>
      <Tabs tabs={TABS} active={tab} onChange={(id) => setTab(id as 'PDF' | 'COMMENT')} className="mb-4" />
      <AdminTextTemplatesPage kind={tab} title={COPY[tab].title} subtitle={COPY[tab].subtitle} />
    </>
  )
}
