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
      { label: 'Pending Documents', to: '/admin/kyc' },
      { label: 'KYC Forms', to: '/admin/kyc-forms', placeholder: true },
      { label: 'KYC Questions', to: '/admin/kyc-questions', placeholder: true },
      { label: 'Extended Fields', to: '/admin/extended-fields', placeholder: true },
      { label: 'Users KYC Forms', to: '/admin/users-kyc-forms', placeholder: true },
      { label: 'Document Tracker', to: '/admin/document-tracker', placeholder: true },
      { label: 'Dormant Accounts', to: '/admin/dormant-accounts' },
      { label: 'Staff Forms Assignments', to: '/admin/staff-forms-assignments', placeholder: true },
      { label: 'Consents', to: '/admin/consents', placeholder: true },
    ],
  },
  {
    label: 'Finance', icon: Banknote, children: [
      { label: 'Transactions', to: '/admin/finance' },
      { label: 'Deposit Requests', to: '/admin/deposit-requests' },
      { label: 'All Wallets', to: '/admin/wallets' },
      { label: 'Payment Gateways', to: '/admin/payment-gateways' },
      { label: 'Exchange Rates', to: '/admin/exchange-rates', placeholder: true },
      { label: 'Credit Card Types', to: '/admin/credit-card-types', placeholder: true },
      { label: 'E-Wallet Types', to: '/admin/ewallet-types', placeholder: true },
    ],
  },
  {
    label: 'Trading', icon: CandlestickChart, children: [
      { label: 'Accounts', to: '/admin/accounts' },
      { label: 'Account Types', to: '/admin/account-types' },
      { label: 'Economic Calendar', to: '/admin/economic-calendar', placeholder: true },
      { label: 'Servers', to: '/admin/servers' },
    ],
  },
  {
    label: 'Introducing Brokers', icon: Handshake, children: [
      { label: 'IBs List', to: '/admin/partners' },
      { label: 'Partner Applications', to: '/admin/partner-applications' },
      { label: 'IB Campaigns', to: '/admin/ib-campaigns', placeholder: true },
    ],
  },
  {
    label: 'Requests', icon: ClipboardList, children: [
      { label: 'Account Requests', to: '/admin/account-requests' },
      { label: 'Data Change Requests', to: '/admin/data-change-requests', placeholder: true },
      { label: 'Withdrawal Requests', to: '/admin/withdrawal-requests' },
    ],
  },
  {
    label: 'Referrals', icon: Share2, children: [
      { label: 'Referrals', to: '/admin/referrals', placeholder: true },
      { label: 'User Referrals', to: '/admin/user-referrals', placeholder: true },
    ],
  },
  {
    label: 'Notifications', icon: Bell, children: [
      { label: 'Templates', to: '/admin/notification-templates' },
      { label: 'Campaigns', to: '/admin/campaigns', placeholder: true },
      { label: 'Logs', to: '/admin/notification-logs', placeholder: true },
    ],
  },
  {
    label: 'Templates', icon: LayoutTemplate, children: [
      { label: 'PDF Templates', to: '/admin/pdf-templates', placeholder: true },
      { label: 'Comment Templates', to: '/admin/comment-templates', placeholder: true },
    ],
  },
  {
    label: 'Contents', icon: Newspaper, children: [
      { label: 'Blog', to: '/admin/blog' },
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
