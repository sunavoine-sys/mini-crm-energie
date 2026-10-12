import { useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { MousePointerClick, Plus, Search, Zap } from 'lucide-react'
import type { Client, Task } from '@/lib/types'
import { spring } from '@/lib/motion'
import { cn } from '@/lib/utils'
import { useHotkeys } from '@/hooks/use-hotkeys'
import { useUrlParam } from '@/hooks/use-url-state'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Kbd } from '@/components/ui/kbd'
import { Skeleton } from '@/components/ui/skeleton'
import { ThemeToggle } from '@/components/app/theme-toggle'
import { UserMenu } from '@/components/app/user-menu'
import { Agenda } from '@/features/tasks/agenda'
import { useOpenTasks } from '@/features/tasks/api'
import { useClients, useSitesIndex } from './api'
import { ClientDetail } from './client-detail'
import { ClientFormDialog } from './client-form-dialog'
import { ClientList, type StageFilter } from './client-list'

export function ClientsWorkspace() {
  const clients = useClients()
  const sitesIndex = useSitesIndex()
  const openTasks = useOpenTasks()
  const [selectedId, setSelectedId] = useUrlParam('client')
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<StageFilter>('active')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Client | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const selected = useMemo(() => clients.data?.find((c) => c.id === selectedId) ?? null, [clients.data, selectedId])

  const tasksByClient = useMemo(() => {
    const map = new Map<string, Task>()
    for (const t of openTasks.data ?? []) if (t.client_id && !map.has(t.client_id)) map.set(t.client_id, t)
    return map
  }, [openTasks.data])

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }
  const openEdit = () => {
    setEditing(selected)
    setFormOpen(true)
  }

  useHotkeys({
    '/': () => searchRef.current?.focus(),
    n: openCreate,
    e: () => selected && openEdit(),
    escape: () => selectedId && setSelectedId(null),
  })

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background">
      {/* Barre supérieure */}
      <header className="relative z-20 flex h-12 shrink-0 items-center gap-3 border-b border-border bg-background/80 px-3 backdrop-blur-md sm:px-4">
        <div className="flex items-center gap-2.5">
          <div className="flex size-7 items-center justify-center rounded-lg bg-foreground text-background shadow-sm">
            <Zap className="size-3.5 fill-current" />
          </div>
          <span className="text-sm font-semibold tracking-tight">DMS CRM</span>
          <span className="hidden text-sm text-muted-foreground/60 sm:inline">/</span>
          <span className="hidden text-sm text-muted-foreground sm:inline">Clients</span>
        </div>

        <button
          onClick={() => searchRef.current?.focus()}
          className="mx-auto hidden h-8 w-full max-w-sm items-center gap-2 rounded-md border border-border bg-muted/50 px-2.5 text-[13px] text-muted-foreground transition-colors hover:bg-muted md:flex"
        >
          <Search className="size-3.5" />
          <span className="flex-1 text-left">Rechercher un client…</span>
          <Kbd>/</Kbd>
        </button>

        <div className="ml-auto flex items-center gap-1.5 md:ml-0">
          <Button size="sm" onClick={openCreate} className="hidden sm:inline-flex">
            <Plus /> Nouveau client
            <Kbd className="ml-0.5 border-white/20 bg-white/15 text-primary-foreground/80">N</Kbd>
          </Button>
          <Button size="icon-sm" onClick={openCreate} className="sm:hidden" aria-label="Nouveau client">
            <Plus />
          </Button>
          <ThemeToggle />
          <UserMenu />
        </div>
      </header>

      {/* Espace de travail : liste · fiche · agenda */}
      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)_300px]">
        <aside className={cn('min-h-0 border-r border-border bg-subtle', selected ? 'hidden lg:block' : 'block')}>
          <ClientList
            ref={searchRef}
            clients={clients.data}
            isLoading={clients.isPending}
            error={clients.error}
            sitesIndex={sitesIndex.data}
            tasksByClient={tasksByClient}
            query={query}
            onQueryChange={setQuery}
            filter={filter}
            onFilterChange={setFilter}
            selectedId={selectedId}
            onSelect={(id) => setSelectedId(id)}
            onCreate={openCreate}
          />
        </aside>

        <main className={cn('min-h-0 overflow-y-auto', !selected && 'hidden lg:block')}>
          <AnimatePresence mode="wait">
            {clients.isPending && selectedId ? (
              <DetailSkeleton key="skeleton" />
            ) : selected ? (
              <ClientDetail
                key={selected.id}
                client={selected}
                sites={sitesIndex.data?.get(selected.id)}
                onEdit={openEdit}
                onDeleted={() => setSelectedId(null, { replace: true })}
                onBack={() => setSelectedId(null)}
              />
            ) : (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={spring.smooth} className="flex h-full items-center justify-center p-6">
                <EmptyState
                  icon={MousePointerClick}
                  title="Sélectionne un dossier"
                  description="Choisis un client dans le portefeuille pour afficher ses sites, documents et prochaines actions."
                  action={
                    <div className="flex flex-col items-center gap-3">
                      <Button size="sm" variant="outline" onClick={openCreate}>
                        <Plus /> Nouveau client
                      </Button>
                      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Kbd>/</Kbd> rechercher <span aria-hidden>·</span> <Kbd>N</Kbd> nouveau <span aria-hidden>·</span> <Kbd>E</Kbd> modifier
                      </p>
                    </div>
                  }
                />
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        <aside className="hidden min-h-0 border-l border-border bg-subtle xl:block">
          <Agenda tasks={openTasks.data} isLoading={openTasks.isPending} selectedClientId={selectedId} onSelectClient={(id) => setSelectedId(id)} />
        </aside>
      </div>

      <ClientFormDialog open={formOpen} onOpenChange={setFormOpen} client={editing} onSaved={(c) => !editing && setSelectedId(c.id)} />
    </div>
  )
}

function DetailSkeleton() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-5 px-6 py-6" aria-label="Chargement du dossier">
      <div className="flex items-center gap-3">
        <Skeleton className="size-11 rounded-xl" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-56" />
          <Skeleton className="h-3.5 w-40" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-[92px] rounded-xl" />
        ))}
        <Skeleton className="col-span-2 h-36 rounded-xl" />
        <Skeleton className="col-span-2 h-36 rounded-xl" />
      </div>
      <Skeleton className="h-8 w-72 rounded-lg" />
      <div className="grid gap-3 md:grid-cols-2">
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
    </div>
  )
}
