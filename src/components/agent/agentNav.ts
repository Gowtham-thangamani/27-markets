import { LayoutDashboard, UserPlus, LifeBuoy, type LucideIcon } from 'lucide-react'

export interface AgentNavItem {
  label: string
  to: string
  icon: LucideIcon
}

export const agentNav: AgentNavItem[] = [
  { label: 'Dashboard', to: '/agent/dashboard', icon: LayoutDashboard },
  { label: 'My Leads', to: '/agent/leads', icon: UserPlus },
  { label: 'My Tickets', to: '/agent/tickets', icon: LifeBuoy },
]
