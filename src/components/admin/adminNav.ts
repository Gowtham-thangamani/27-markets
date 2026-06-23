import {
  LayoutDashboard,
  Users,
  UserPlus,
  LifeBuoy,
  ShieldCheck,
  Newspaper,
  type LucideIcon,
} from 'lucide-react'

export interface AdminNavItem {
  label: string
  to: string
  icon: LucideIcon
}

export const adminNav: AdminNavItem[] = [
  { label: 'Dashboard', to: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Clients', to: '/admin/clients', icon: Users },
  { label: 'Leads', to: '/admin/leads', icon: UserPlus },
  { label: 'Support', to: '/admin/support', icon: LifeBuoy },
  { label: 'KYC Review', to: '/admin/kyc', icon: ShieldCheck },
  { label: 'Blog', to: '/admin/blog', icon: Newspaper },
]
