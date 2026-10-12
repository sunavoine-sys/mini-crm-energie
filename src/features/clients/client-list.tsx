import { forwardRef, useMemo } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { AlertCircle, Plus, Search, SearchX, Users, X } from 'lucide-react'
import type { Client, StageId, Task } from '@/lib/types'
import { STAGES } from '@/lib/stages'
import { contactName, daysFromToday, formatRelativeTime, normalize } from '@/lib/format'
import { spring } from '@/lib/motion'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Kbd } from '@/components/ui/kbd'
import { Skeleton } from '@/components/ui/skeleton'
import { StageDot } from '@/components/app/stage-badge'
import type { SiteSummary } from './api'

export type StageFilter = 'all' | 'active' | StageId

interface ClientListProps {
  clients: Client[] | undefined
  isLoading: boolean
  error: Error | null
  sitesIndex: Map<string, SiteSummary> | undefined
  tasksByClient: Map<string, Task>
  query: string
  onQueryChange: (q: string) => void
  filter: StageFilter
  onFilterChange: (f: StageFilter) => void
  selectedId: string | null
  onSelect: (id: string) => void
  onCreate: () => void
}

export const ClientList = forwardRef<HTMLInputElement, ClientListProps>(function ClientList(
  { clients, isLoading, error, sitesIndex, tasksByClient, query, onQueryChange, filter, onFilterChange, selectedId, onSelect, onCreate },
  searchRef,
) {
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: clients?.length ?? 0, active: 0 }
    for (const cl of clients ?? []) {
      c[cl.stage] = (c[cl.stage] ?? 0) + 1
      if (cl.stage !== 'signe' && cl.stage !== 'perdu') c.active++
    }
    return c
  }, [clients])

  const filtered = useMemo(() => {
    const q = normalize(query.trim())
    return (clients ?? []).filter((c) => {
      if (filter === 'active' && (c.stage === 'signe' || c.stage === 'perdu')) return false
      if (filter !== 'all' && filter !== 'active' && c.stage !== filter) return false
      if (!q) return true
      const hay = normalize([c.company, c.first_name, c.last_name, c.email, c.phone, c.siret, ...(sitesIndex?.get(c.id)?.suppliers ?? [])].filter(Boolean).join(' '))
      return hay.includes(q) || (c.siret ?? '').replace(/\s/g, '').includes(q.replace(/\s/g, ''))
    })
  }, [clients, filter, query, sitesIndex])

  const filters: { id: StageFilter; label: string; dot?: string }[] = [
    { id: 'active', label: 'En cours' },
    { id: 'all', label: 'Tous' },
    ...STAGES.map((s) => ({ id: s.id as StageFilter, label: s.short, dot: s.dot })),
  ]

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="space-y-3 border-b border-border px-4 pt-4 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <h2 className="text-sm font-semibold tracking-tight">Portefeuille</h2>
            <span className="tabular text-xs text-muted-foreground">{isLoading ? '…' : filtered.length}</span>
          </div>
          <Button size="xs" variant="ghost" onClick={onCreate} className="text-foreground">
            <Plus /> Nouveau
          </Button>
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            ref={searchRef}
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && (onQueryChange(''), e.currentTarget.blur())}
            placeholder="Entreprise, contact, SIRET, fournisseur…"
            aria-label="Rechercher un client"
            className="h-8 w-full rounded-md border border-input bg-card pr-8 pl-8 text-[13px] shadow-xs outline-none transition-[box-shadow,border-color] placeholder:text-muted-foreground/70 focus:border-ring focus:ring-[3px] focus:ring-ring/25 dark:bg-input/25"
          />
          {query ? (
            <button onClick={() => onQueryChange('')} aria-label="Effacer" className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground">
              <X className="size-3.5" />
            </button>
          ) : (
            <Kbd className="absolute top-1/2 right-2 -translate-y-1/2">/</Kbd>
          )}
        </div>

        <div className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-0.5 [mask-image:linear-gradient(to_right,transparent,black_16px,black_calc(100%-28px),transparent)] [scrollbar-width:none]">
          {filters.map((f) => {
            const active = filter === f.id
            return (
              <button
                key={f.id}
                onClick={() => onFilterChange(f.id)}
                className={cn(
                  'relative flex h-7 shrink-0 items-center gap-1.5 rounded-md px-2 text-xs font-medium transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30',
                  active ? 'text-foreground' : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
                )}
              >
                {active && <motion.span layoutId="client-filter" transition={spring.snappy} className="absolute inset-0 rounded-md bg-accent ring-1 ring-border" />}
                <span className="relative flex items-center gap-1.5">
                  {f.dot && <span className={cn('size-1.5 rounded-full', f.dot)} />}
                  {f.label}
                  <span className="tabular text-[11px] text-muted-foreground">{counts[f.id] ?? 0}</span>
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2" role="listbox" aria-label="Clients">
        {isLoading ? (
          <ListSkeleton />
        ) : error ? (
          <EmptyState compact icon={AlertCircle} title="Chargement impossible" description={error.message} />
        ) : !clients?.length ? (
          <EmptyState
            icon={Users}
            title="Aucun client pour l'instant"
            description="Ajoute ton premier prospect pour démarrer le pipeline."
            action={<Button size="sm" onClick={onCreate}><Plus /> Nouveau client</Button>}
          />
        ) : !filtered.length ? (
          <EmptyState
            compact
            icon={SearchX}
            title="Aucun résultat"
            description={query ? `Rien ne correspond à « ${query} ».` : 'Aucun dossier à cette étape.'}
            action={
              <Button size="xs" variant="outline" onClick={() => (onQueryChange(''), onFilterChange('all'))}>
                Réinitialiser les filtres
              </Button>
            }
          />
        ) : (
          <motion.ul layout className="space-y-0.5">
            <AnimatePresence initial={false} mode="popLayout">
              {filtered.map((c) => (
                <ClientRow
                  key={c.id}
                  client={c}
                  sites={sitesIndex?.get(c.id)}
                  task={tasksByClient.get(c.id)}
                  selected={c.id === selectedId}
                  onSelect={onSelect}
                />
              ))}
            </AnimatePresence>
          </motion.ul>
        )}
      </div>
    </div>
  )
})

const ClientRow = forwardRef<HTMLLIElement, {
  client: Client
  sites: SiteSummary | undefined
  task: Task | undefined
  selected: boolean
  onSelect: (id: string) => void
}>(function ClientRow({ client: c, sites, task, selected, onSelect }, ref) {
  const contact = contactName(c)
  const overdue = task ? daysFromToday(task.due_date) < 0 : false
  const dueToday = task ? daysFromToday(task.due_date) === 0 : false

  return (
    <motion.li
      ref={ref}
      layout="position"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={spring.snappy}
    >
      <button
        role="option"
        aria-selected={selected}
        data-client-id={c.id}
        onClick={() => onSelect(c.id)}
        className={cn(
          'group relative flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30',
          selected ? 'bg-accent' : 'hover:bg-accent/50',
        )}
      >
        {selected && <motion.span layoutId="client-row-indicator" transition={spring.snappy} className="absolute top-2.5 bottom-2.5 left-0 w-0.5 rounded-full bg-primary" />}
        <StageDot stage={c.stage} className="mt-1.5" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-[13px] font-medium leading-tight">{c.company || 'Sans nom'}</p>
            <span className="shrink-0 text-[11px] text-muted-foreground tabular">{formatRelativeTime(c.updated_at)}</span>
          </div>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {[contact, sites?.suppliers.join(', ')].filter(Boolean).join(' · ') || 'Aucun contact'}
          </p>
          {task && (
            <p className={cn('mt-1 flex items-center gap-1.5 truncate text-[11px]', overdue ? 'text-destructive' : dueToday ? 'text-stage-offre' : 'text-muted-foreground')}>
              <span className={cn('size-1 rounded-full', overdue ? 'bg-destructive' : dueToday ? 'bg-stage-offre' : 'bg-muted-foreground/50')} />
              <span className="truncate">{task.title}</span>
            </p>
          )}
        </div>
      </button>
    </motion.li>
  )
})

function ListSkeleton() {
  return (
    <div className="space-y-0.5" aria-label="Chargement des clients">
      {Array.from({ length: 9 }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 px-3 py-2.5" style={{ opacity: 1 - i * 0.09 }}>
          <Skeleton className="mt-1 size-2 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <div className="flex justify-between gap-6">
              <Skeleton className="h-3.5" style={{ width: `${45 + ((i * 17) % 35)}%` }} />
              <Skeleton className="h-3 w-8" />
            </div>
            <Skeleton className="h-3" style={{ width: `${30 + ((i * 23) % 40)}%` }} />
          </div>
        </div>
      ))}
    </div>
  )
}
