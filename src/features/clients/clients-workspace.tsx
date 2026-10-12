import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { AnimatePresence, motion } from 'motion/react'
import { MousePointerClick, Plus } from 'lucide-react'
import type { Task } from '@/lib/types'
import { spring } from '@/lib/motion'
import { cn } from '@/lib/utils'
import { MOD } from '@/lib/platform'
import { useHotkeys } from '@/hooks/use-hotkeys'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Kbd } from '@/components/ui/kbd'
import { Skeleton } from '@/components/ui/skeleton'
import { useAppActions } from '@/app/app-context'
import { Agenda } from '@/features/tasks/agenda'
import { useOpenTasks } from '@/features/tasks/api'
import { useClients, useSitesIndex } from './api'
import { ClientDetail } from './client-detail'
import { ClientList, type StageFilter } from './client-list'

export function ClientsWorkspace() {
  const clients = useClients()
  const sitesIndex = useSitesIndex()
  const openTasks = useOpenTasks()
  const { clientId } = useParams()
  const navigate = useNavigate()
  const actions = useAppActions()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<StageFilter>('active')
  const searchRef = useRef<HTMLInputElement>(null)

  const selectedId = clientId ?? null
  const selected = useMemo(() => clients.data?.find((c) => c.id === selectedId) ?? null, [clients.data, selectedId])
  const select = (id: string | null, replace = false) => navigate(id ? `/clients/${id}` : '/clients', { replace })

  const tasksByClient = useMemo(() => {
    const map = new Map<string, Task>()
    for (const t of openTasks.data ?? []) if (t.client_id && !map.has(t.client_id)) map.set(t.client_id, t)
    return map
  }, [openTasks.data])

  // « / » focalise la recherche du portefeuille tant que cette page est affichée
  useEffect(() => {
    actions.registerSearch(() => searchRef.current?.focus())
    return () => actions.registerSearch(null)
  }, [actions])

  useHotkeys({
    escape: () => selectedId && select(null),
  })

  return (
    <div className="grid h-full min-h-0 grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)_300px]">
      <aside className={cn('min-h-0 border-r border-border', selected ? 'hidden lg:block' : 'block')}>
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
          onSelect={(id) => select(id)}
          onCreate={() => actions.openClientForm(null)}
        />
      </aside>

      <section className={cn('min-h-0 overflow-y-auto bg-background', !selected && !(clients.isPending && selectedId) && 'hidden lg:block')}>
        <AnimatePresence mode="wait">
          {clients.isPending && selectedId ? (
            <DetailSkeleton key="skeleton" />
          ) : selected ? (
            <ClientDetail
              key={selected.id}
              client={selected}
              sites={sitesIndex.data?.get(selected.id)}
              onEdit={() => actions.openClientForm(selected)}
              onDeleted={() => select(null, true)}
              onBack={() => select(null)}
            />
          ) : (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={spring.smooth} className="flex h-full items-center justify-center p-6">
              <EmptyState
                icon={MousePointerClick}
                title={selectedId && !clients.isPending ? 'Dossier introuvable' : 'Sélectionne un dossier'}
                description={
                  selectedId && !clients.isPending
                    ? "Ce client n'existe plus ou n'est pas dans ton portefeuille."
                    : 'Choisis un client dans le portefeuille pour afficher ses sites, documents et prochaines actions.'
                }
                action={
                  <div className="flex flex-col items-center gap-3">
                    <Button size="sm" variant="outline" onClick={() => actions.openClientForm(null)}>
                      <Plus /> Nouveau client
                    </Button>
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Kbd>{MOD}</Kbd>
                      <Kbd>K</Kbd> palette <span aria-hidden>·</span> <Kbd>/</Kbd> rechercher <span aria-hidden>·</span> <Kbd>?</Kbd> raccourcis
                    </p>
                  </div>
                }
              />
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      <aside className="hidden min-h-0 border-l border-border xl:block">
        <Agenda tasks={openTasks.data} isLoading={openTasks.isPending} selectedClientId={selectedId} onSelectClient={(id) => select(id)} />
      </aside>
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
