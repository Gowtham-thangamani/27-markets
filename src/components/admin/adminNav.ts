import { LayoutDashboard, type LucideIcon } from 'lucide-react'

export interface AdminNavItem {
  label: string
  to: string
  icon: LucideIcon
}

// Phase 2 ships only the Dashboard. Later phases append Clients, Leads, KYC,
// Finance, Accounts, Support, Partners, Reports, and Staff here.
export const adminNav: AdminNavItem[] = [
  { label: 'Dashboard', to: '/admin/dashboard', icon: LayoutDashboard },
]
