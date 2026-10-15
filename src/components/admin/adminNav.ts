import {
  LayoutDashboard, Users, ShieldCheck, Banknote, CandlestickChart, Handshake,
  ClipboardList, Share2, Bell, LayoutTemplate, Newspaper, Settings, LifeBuoy,
  type LucideIcon,
} from 'lucide-react'

export interface AdminNavLink {
  label: string
  to: string
  placeholder?: boolean
}

export interface AdminNavGroup {
  label: string
  icon: LucideIcon
  children: AdminNavLink[]
}

export interface AdminNavSingle extends AdminNavLink {
  icon: LucideIcon
}

export type AdminNavEntry = AdminNavGroup | AdminNavSingle

export function isGroup(e: AdminNavEntry): e is AdminNavGroup {
  return 'children' in e
}

export const adminNav: AdminNavEntry[] = [
  {
    label: 'General', icon: LayoutDashboard, children: [
      { label: 'Dashboard', to: '/admin/dashboard' },
      { label: 'Reports', to: '/admin/reports' },
    ],
  },
  {
    label: 'User Management', icon: Users, children: [
      { label: 'Staff & Permissions', to: '/admin/staff' },
      { label: 'Clients', to: '/admin/clients' },
      { label: 'Leads', to: '/admin/leads' },
      { label: 'Blocked Users', to: '/admin/blocked-users' },
    ],
  },
  {
    label: 'KYC & Compliance', icon: ShieldCheck, children: [
      // Two genuinely different pages, previously named as if one were a subset
      // of the other: KYC Review is the approve/reject queue; Document Tracker
      // is a read-only inventory of every uploaded file, with no status or
      // actions. Renamed from 'Pending Documents' to say what it does.
      { label: 'KYC Review', to: '/admin/kyc' },
      { label: 'Document Tracker', to: '/admin/document-tracker' },
      { label: 'AML Screening', to: '/admin/aml' },
      { label: 'KYC Forms', to: '/admin/kyc-forms' },
      // One page, tabbed: KYC questions and extended profile fields were the
      // same component with a different `kind`.
      { label: 'KYC Fields', to: '/admin/kyc-fields' },
      // Renamed from 'Users KYC Forms', which read as a sibling of 'KYC Forms'
      // but is per-client status, not form definitions.
      { label: 'Client KYC Status', to: '/admin/users-kyc-forms' },
      { label: 'Staff Forms Assignments', to: '/admin/staff-forms-assignments' },
      { label: 'Consents', to: '/admin/consents' },
    ],
  },
  {
    label: 'Finance', icon: Banknote, children: [
      // 'Transactions' (/admin/finance) was subtitled "approve withdrawals and
      // review deposits" — exactly what these two pages do. The route still
      // works; it is no longer a third way in.
      { label: 'Deposit Requests', to: '/admin/deposit-requests' },
      { label: 'Withdrawal Requests', to: '/admin/withdrawal-requests' },
      { label: 'All Wallets', to: '/admin/wallets' },
      { label: 'Payment Gateways', to: '/admin/payment-gateways' },
      { label: 'Exchange Rates', to: '/admin/exchange-rates' },
      // One page, tabbed: card and e-wallet types were the same component with
      // a different `category`.
      { label: 'Payment Method Types', to: '/admin/payment-method-types' },
    ],
  },
  {
    label: 'Trading', icon: CandlestickChart, children: [
      { label: 'Accounts', to: '/admin/accounts' },
      { label: 'Account Types', to: '/admin/account-types' },
      // Moved from KYC & Compliance: dormancy is an account concern.
      { label: 'Dormant Accounts', to: '/admin/dormant-accounts' },
      { label: 'Instruments', to: '/admin/instruments' },
      { label: 'Economic Calendar', to: '/admin/economic-calendar' },
      { label: 'Servers', to: '/admin/servers' },
    ],
  },
  {
    label: 'Introducing Brokers', icon: Handshake, children: [
      { label: 'IBs List', to: '/admin/partners' },
      { label: 'Partner Applications', to: '/admin/partner-applications' },
      { label: 'IB Campaigns', to: '/admin/ib-campaigns' },
    ],
  },
  {
    label: 'Requests', icon: ClipboardList, children: [
      { label: 'Account Requests', to: '/admin/account-requests' },
      { label: 'Data Change Requests', to: '/admin/data-change-requests' },
    ],
  },
  // One page, tabbed: referred clients and the referrer leaderboard are two
  // views of the same data. A group with a single child is just noise.
  { label: 'Referrals', to: '/admin/referrals', icon: Share2 },
  {
    label: 'Notifications', icon: Bell, children: [
      // Named explicitly: there used to be a second, unrelated 'Templates'.
      { label: 'Notification Templates', to: '/admin/notification-templates' },
      { label: 'Campaigns', to: '/admin/campaigns' },
      { label: 'Logs', to: '/admin/notification-logs' },
    ],
  },
  // One page, tabbed: PDF and comment templates were the same component with a
  // different `kind`.
  { label: 'Document Templates', to: '/admin/templates', icon: LayoutTemplate },
  {
    label: 'Contents', icon: Newspaper, children: [
      { label: 'Blog', to: '/admin/blog' },
      { label: 'Downloads', to: '/admin/downloads' },
      { label: 'Marketing Content', to: '/admin/site-content' },
    ],
  },
  {
    label: 'Settings', icon: Settings, children: [
      { label: 'General Settings', to: '/admin/settings' },
    ],
  },
  { label: 'Support', to: '/admin/support', icon: LifeBuoy },
]

/** All placeholder links flattened — used to generate placeholder routes. */
export function placeholderLinks(): AdminNavLink[] {
  return adminNav.flatMap((e) => (isGroup(e) ? e.children : [e])).filter((l) => l.placeholder)
}

/** Look up a link's label by its `to` path (for the placeholder page title). */
export function navLabelFor(pathname: string): string | undefined {
  for (const e of adminNav) {
    if (isGroup(e)) {
      const hit = e.children.find((c) => c.to === pathname)
      if (hit) return hit.label
    } else if (e.to === pathname) {
      return e.label
    }
  }
  return undefined
}
