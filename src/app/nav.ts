import { CalendarDays, Users, type LucideIcon } from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  /** Touche après « G » */
  key: string
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/clients', label: 'Clients', icon: Users, key: 'c' },
  { to: '/agenda', label: 'Agenda', icon: CalendarDays, key: 'a' },
]
