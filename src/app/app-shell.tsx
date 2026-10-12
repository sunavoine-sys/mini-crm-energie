import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Outlet, useMatch, useNavigate } from 'react-router'
import { motion } from 'motion/react'
import { Menu, Search, Zap } from 'lucide-react'
import type { Client } from '@/lib/types'
import { daysFromToday } from '@/lib/format'
import { pushRecent } from '@/lib/recents'
import { spring } from '@/lib/motion'
import { useHotkeys } from '@/hooks/use-hotkeys'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { useClients } from '@/features/clients/api'
import { ClientFormDialog } from '@/features/clients/client-form-dialog'
import { useOpenTasks } from '@/features/tasks/api'
import { AppActionsContext, type AppActions } from './app-context'
import { CommandMenu, type CommandPage } from './command-menu'
import { NAV_ITEMS } from './nav'
import { ShortcutsDialog } from './shortcuts-dialog'
import { Sidebar } from './sidebar'

const COLLAPSE_KEY = 'dms-sidebar-collapsed'

export function AppShell() {
  const navigate = useNavigate()
  const clients = useClients()
  const openTasks = useOpenTasks()
  const clientMatch = useMatch('/clients/:clientId')
  const activeId = clientMatch?.params.clientId ?? null
  const activeClient = useMemo(() => clients.data?.find((c) => c.id === activeId) ?? null, [clients.data, activeId])

  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === '1'
    } catch {
      return false
    }
  })
  const [mobileNav, setMobileNav] = useState(false)
  const [commandOpen, setCommandOpen] = useState(false)
  const [commandPage, setCommandPage] = useState<CommandPage>({ type: 'root' })
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Client | null>(null)
  const searchRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (activeId) pushRecent(activeId)
  }, [activeId])

  const toggleCollapsed = useCallback(() => {
    setCollapsed((v) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, v ? '0' : '1')
      } catch {
        /* préférence non mémorisée */
      }
      return !v
    })
  }, [])

  const actions = useMemo<AppActions>(
    () => ({
      openClientForm: (client) => {
        setEditing(client ?? null)
        setFormOpen(true)
      },
      openCommand: (opts) => {
        setCommandPage(opts?.stageFor ? { type: 'stage', client: opts.stageFor } : { type: 'root' })
        setCommandOpen(true)
      },
      openShortcuts: () => setShortcutsOpen(true),
      registerSearch: (focus) => {
        searchRef.current = focus
      },
    }),
    [],
  )

  // ⌘K / Ctrl+K fonctionne partout, y compris pendant la saisie
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setCommandPage({ type: 'root' })
        setCommandOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useHotkeys({
    '/': () => (searchRef.current ? searchRef.current() : actions.openCommand()),
    n: () => actions.openClientForm(null),
    '?': () => setShortcutsOpen(true),
    '[': toggleCollapsed,
    e: () => activeClient && actions.openClientForm(activeClient),
    s: () => activeClient && actions.openCommand({ stageFor: activeClient }),
    ...Object.fromEntries(NAV_ITEMS.map((n) => [`g ${n.key}`, () => navigate(n.to)])),
  })

  const badges = useMemo(() => {
    const tasks = openTasks.data ?? []
    const late = tasks.filter((t) => daysFromToday(t.due_date) < 0).length
    const today = tasks.filter((t) => daysFromToday(t.due_date) === 0).length
    return { '/agenda': late ? { value: late, tone: 'danger' as const } : today ? { value: today } : undefined }
  }, [openTasks.data])

  return (
    <AppActionsContext.Provider value={actions}>
      <div className="flex h-dvh overflow-hidden bg-background">
        <motion.aside
          initial={false}
          animate={{ width: collapsed ? 56 : 232 }}
          transition={spring.smooth}
          className="hidden shrink-0 overflow-hidden border-r border-border bg-subtle md:block"
        >
          <Sidebar collapsed={collapsed} onToggle={toggleCollapsed} onSearch={() => actions.openCommand()} badges={badges} />
        </motion.aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border bg-background/80 px-3 backdrop-blur-md md:hidden">
            <Button size="icon-sm" variant="ghost" onClick={() => setMobileNav(true)} aria-label="Ouvrir le menu">
              <Menu />
            </Button>
            <div className="flex items-center gap-2">
              <div className="flex size-6 items-center justify-center rounded-md bg-foreground text-background">
                <Zap className="size-3 fill-current" />
              </div>
              <span className="text-sm font-semibold tracking-tight">DMS CRM</span>
            </div>
            <Button size="icon-sm" variant="ghost" className="ml-auto" onClick={() => actions.openCommand()} aria-label="Rechercher">
              <Search />
            </Button>
          </header>
          <main className="min-h-0 flex-1">
            <Outlet />
          </main>
        </div>
      </div>

      <Sheet open={mobileNav} onOpenChange={setMobileNav}>
        <SheetContent side="left" hideClose className="bg-subtle">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <Sidebar collapsed={false} onSearch={() => (setMobileNav(false), actions.openCommand())} badges={badges} onNavigate={() => setMobileNav(false)} />
        </SheetContent>
      </Sheet>

      <CommandMenu
        open={commandOpen}
        onOpenChange={setCommandOpen}
        initialPage={commandPage}
        activeClient={activeClient}
        onNewClient={() => actions.openClientForm(null)}
        onEditClient={(c) => actions.openClientForm(c)}
        onShortcuts={() => setShortcutsOpen(true)}
      />
      <ShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
      <ClientFormDialog open={formOpen} onOpenChange={setFormOpen} client={editing} onSaved={(c) => !editing && navigate(`/clients/${c.id}`)} />
    </AppActionsContext.Provider>
  )
}
