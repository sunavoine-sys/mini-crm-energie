import { CalendarDays, LayoutDashboard, Users, type LucideIcon } from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  /** Touche après « G » */
  key: string
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, key: 'd' },
  { to: '/clients', label: 'Clients', icon: Users, key: 'c' },
  { to: '/agenda', label: 'Agenda', icon: CalendarDays, key: 'a' },
]
