import { NavLink } from 'react-router'
import { motion } from 'motion/react'
import { PanelLeftClose, PanelLeftOpen, Search, Zap } from 'lucide-react'
import { spring } from '@/lib/motion'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Kbd } from '@/components/ui/kbd'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ThemeToggle } from '@/components/app/theme-toggle'
import { UserMenu } from '@/components/app/user-menu'
import { useAuth } from '@/features/auth/auth-context'
import { NAV_ITEMS } from './nav'
import { MOD } from '@/lib/platform'

interface SidebarProps {
  collapsed: boolean
  onToggle?: () => void
  onSearch: () => void
  badges: Record<string, { value: number; tone?: 'danger' } | undefined>
  onNavigate?: () => void
}

export function Sidebar({ collapsed, onToggle, onSearch, badges, onNavigate }: SidebarProps) {
  const { profile, session } = useAuth()

  return (
    <div className="flex h-full flex-col gap-1 px-2.5 py-3">
      <div className={cn('mb-2 flex h-8 items-center', collapsed ? 'justify-center' : 'justify-between pl-1.5')}>
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-foreground text-background shadow-sm">
            <Zap className="size-3.5 fill-current" />
          </div>
          {!collapsed && (
            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="truncate text-sm font-semibold tracking-tight">
              DMS CRM
            </motion.span>
          )}
        </div>
        {!collapsed && onToggle && (
          <Button size="icon-xs" variant="ghost" onClick={onToggle} aria-label="Replier la barre latérale">
            <PanelLeftClose />
          </Button>
        )}
      </div>

      <SidebarButton collapsed={collapsed} onClick={onSearch} label="Rechercher" hint={<><Kbd>{MOD}</Kbd><Kbd>K</Kbd></>}>
        <Search />
      </SidebarButton>

      <nav className="mt-2 flex flex-col gap-0.5" aria-label="Navigation principale">
        {NAV_ITEMS.map((item) => {
          const badge = badges[item.to]
          const link = (
            <NavLink
              to={item.to}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  'group relative flex h-8 items-center gap-2.5 rounded-md text-[13px] font-medium transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30',
                  collapsed ? 'justify-center' : 'px-2',
                  isActive ? 'text-foreground' : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && <motion.span layoutId="sidebar-active" transition={spring.snappy} className="absolute inset-0 rounded-md bg-accent ring-1 ring-border" />}
                  <item.icon className="relative size-4 shrink-0" />
                  {!collapsed && <span className="relative flex-1 truncate">{item.label}</span>}
                  {badge && badge.value > 0 && (
                    <span
                      className={cn(
                        'tabular relative rounded-full text-[10px] font-semibold',
                        collapsed ? 'absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center' : 'px-1.5 py-px',
                        badge.tone === 'danger' ? 'bg-destructive text-white' : 'bg-muted text-muted-foreground',
                      )}
                    >
                      {badge.value}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          )
          return collapsed ? (
            <Tooltip key={item.to}>
              <TooltipTrigger asChild>{link}</TooltipTrigger>
              <TooltipContent side="right">
                {item.label}
                <span className="flex gap-0.5 opacity-70">
                  <Kbd className="border-background/20 bg-background/10 text-background">G</Kbd>
                  <Kbd className="border-background/20 bg-background/10 text-background">{item.key.toUpperCase()}</Kbd>
                </span>
              </TooltipContent>
            </Tooltip>
          ) : (
            <div key={item.to}>{link}</div>
          )
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-1.5">
        {collapsed && onToggle && (
          <Button size="icon-sm" variant="ghost" className="mx-auto" onClick={onToggle} aria-label="Déplier la barre latérale">
            <PanelLeftOpen />
          </Button>
        )}
        <div className={cn('flex items-center gap-2 rounded-lg', collapsed ? 'flex-col' : 'border border-border bg-card/60 p-1.5 pl-2')}>
          <UserMenu />
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] leading-tight font-medium">{profile?.full_name ?? session?.user.email}</p>
              <p className="truncate text-[11px] text-muted-foreground">{profile?.role === 'admin' ? 'Administrateur' : 'Commercial'}</p>
            </div>
          )}
          <ThemeToggle />
        </div>
      </div>
    </div>
  )
}

function SidebarButton({ collapsed, onClick, label, hint, children }: { collapsed: boolean; onClick: () => void; label: string; hint?: React.ReactNode; children: React.ReactNode }) {
  const btn = (
    <button
      onClick={onClick}
      className={cn(
        'flex h-8 items-center gap-2.5 rounded-md border border-border bg-card/60 text-[13px] text-muted-foreground shadow-xs transition-colors hover:bg-accent hover:text-foreground [&_svg]:size-4',
        collapsed ? 'justify-center' : 'px-2',
      )}
      aria-label={label}
    >
      {children}
      {!collapsed && (
        <>
          <span className="flex-1 text-left">{label}…</span>
          <span className="flex gap-0.5">{hint}</span>
        </>
      )}
    </button>
  )
  return collapsed ? (
    <Tooltip>
      <TooltipTrigger asChild>{btn}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  ) : (
    btn
  )
}
