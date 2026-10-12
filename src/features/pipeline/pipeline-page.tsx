import { useMemo, useState } from 'react'
import {
  AutoScrollActivator,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  defaultDropAnimationSideEffects,
  pointerWithin,
  rectIntersection,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
  type DropAnimation,
} from '@dnd-kit/core'
import { AnimatePresence, motion } from 'motion/react'
import { Archive, ChevronDown, Search, X } from 'lucide-react'
import type { Client, StageId, Task } from '@/lib/types'
import { STAGE_BY_ID, STAGES, stageOf } from '@/lib/stages'
import { daysFromToday, formatEur, normalize } from '@/lib/format'
import { spring } from '@/lib/motion'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfettiBurst } from '@/components/app/confetti'
import { useAuth } from '@/features/auth/auth-context'
import { useClients, useProfiles, useSitesIndex, useStageDelays, type SiteSummary } from '@/features/clients/api'
import { useOpenTasks } from '@/features/tasks/api'
import { useAppActions } from '@/app/app-context'
import { ClientContextMenu } from '@/features/clients/client-context-menu'
import { useStageChange } from '@/features/clients/use-stage-change'
import { LostDialog } from './lost-dialog'
import { PipelineCard } from './pipeline-card'

const BOARD: StageId[] = ['prospect', 'factures', 'acd', 'offre', 'signe']
const PAGE = 40
const SIGNED_WINDOW_DAYS = 60

// Le pointeur prime (sensation « aimant ») ; repli sur l'intersection au clavier
const collision: CollisionDetection = (args) => {
  const hits = pointerWithin(args)
  return hits.length ? hits : rectIntersection(args)
}

const dropAnimation: DropAnimation = {
  duration: 260,
  easing: 'cubic-bezier(0.32, 0.72, 0, 1)',
  sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.35' } } }),
}

export function PipelinePage() {
  const actions = useAppActions()
  const { isAdmin } = useAuth()
  const clients = useClients()
  const sitesIndex = useSitesIndex()
  const tasks = useOpenTasks()
  const delays = useStageDelays()
  const profiles = useProfiles(isAdmin)
  const changeStage = useStageChange()

  const [query, setQuery] = useState('')
  const [owner, setOwner] = useState('all')
  const [allSigned, setAllSigned] = useState(false)
  const [showLost, setShowLost] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [lostFor, setLostFor] = useState<Client | null>(null)
  const [confetti, setConfetti] = useState<{ x: number; y: number; key: number } | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor),
  )

  const taskByClient = useMemo(() => {
    const map = new Map<string, Task>()
    for (const t of tasks.data ?? []) if (t.client_id && !map.has(t.client_id)) map.set(t.client_id, t)
    return map
  }, [tasks.data])

  const ownerName = useMemo(() => new Map((profiles.data ?? []).map((p) => [p.id, p.full_name])), [profiles.data])

  const columns = useMemo(() => {
    const q = normalize(query.trim())
    const visible = (clients.data ?? []).filter((c) => {
      if (owner !== 'all' && c.owner_id !== owner) return false
      if (!q) return true
      return normalize([c.company, c.first_name, c.last_name, c.siret, ...(sitesIndex.data?.get(c.id)?.suppliers ?? [])].filter(Boolean).join(' ')).includes(q)
    })
    const rank = (c: Client) => {
      const t = taskByClient.get(c.id)
      return t ? daysFromToday(t.due_date) : 9999
    }
    const byStage = new Map<StageId, Client[]>(STAGES.map((s) => [s.id, []]))
    for (const c of visible) byStage.get(c.stage)?.push(c)
    for (const [stage, list] of byStage) {
      list.sort((a, b) => (stage === 'signe' || stage === 'perdu' ? b.stage_changed_at.localeCompare(a.stage_changed_at) : rank(a) - rank(b) || b.updated_at.localeCompare(a.updated_at)))
    }
    return byStage
  }, [clients.data, query, owner, sitesIndex.data, taskByClient])

  const active = activeId ? clients.data?.find((c) => c.id === activeId) ?? null : null

  function stallingDays(c: Client) {
    const limit = delays.data?.[c.stage]
    if (limit == null) return null
    const days = Math.max(0, -daysFromToday(c.stage_changed_at.slice(0, 10)))
    return days > limit ? days - limit : null
  }

  function move(client: Client, stage: StageId, lost_reason?: string | null, at?: { x: number; y: number }) {
    changeStage(client, stage, { lost_reason, onSigned: () => at && setConfetti({ ...at, key: Date.now() }) })
  }

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id))
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveId(null)
    const client = clients.data?.find((c) => c.id === e.active.id)
    const stage = e.over?.id as StageId | undefined
    if (!client || !stage || stage === client.stage) return
    if (stage === 'perdu') {
      setLostFor(client)
      return
    }
    const rect = e.over?.rect
    move(client, stage, undefined, rect ? { x: rect.left + rect.width / 2, y: rect.top + 80 } : undefined)
  }

  const loading = clients.isPending

  return (
    <div className="flex h-full flex-col">
      <header className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3 sm:px-6">
        <div className="mr-auto flex items-baseline gap-2">
          <h1 className="text-lg font-semibold tracking-tight">Pipeline</h1>
          <span className="tabular text-sm text-muted-foreground">{loading ? '…' : BOARD.reduce((n, s) => n + (columns.get(s)?.length ?? 0), 0)}</span>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filtrer les dossiers…"
            aria-label="Filtrer les dossiers"
            className="h-8 w-full rounded-md border border-input bg-card pr-8 pl-8 text-[13px] shadow-xs outline-none placeholder:text-muted-foreground/70 focus:border-ring focus:ring-[3px] focus:ring-ring/25 dark:bg-input/25"
          />
          {query && (
            <button onClick={() => setQuery('')} className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label="Effacer">
              <X className="size-3.5" />
            </button>
          )}
        </div>
        {isAdmin && (
          <Select value={owner} onValueChange={setOwner}>
            <SelectTrigger className="h-8 w-44 text-[13px]" aria-label="Commercial">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toute l'équipe</SelectItem>
              {(profiles.data ?? []).map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Button size="sm" variant={showLost ? 'secondary' : 'ghost'} onClick={() => setShowLost((v) => !v)} aria-pressed={showLost}>
          <Archive /> Perdus <span className="tabular text-muted-foreground">{columns.get('perdu')?.length ?? 0}</span>
        </Button>
      </header>

      <DndContext
        sensors={sensors}
        collisionDetection={collision}
        autoScroll={{ activator: AutoScrollActivator.Pointer, threshold: { x: 0.06, y: 0.1 }, acceleration: 5 }}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragCancel={() => setActiveId(null)}
        accessibility={{
          screenReaderInstructions: { draggable: 'Espace pour saisir le dossier, flèches pour changer de colonne, Espace pour déposer, Échap pour annuler.' },
          announcements: {
            onDragStart: ({ active }) => `Dossier ${clients.data?.find((c) => c.id === active.id)?.company ?? ''} saisi.`,
            onDragOver: ({ over }) => (over ? `Au-dessus de ${STAGE_BY_ID[over.id as StageId]?.label}.` : 'Hors des colonnes.'),
            onDragEnd: ({ over }) => (over ? `Déposé dans ${STAGE_BY_ID[over.id as StageId]?.label}.` : 'Déplacement annulé.'),
            onDragCancel: () => 'Déplacement annulé.',
          },
        }}
      >
        <div className="flex min-h-0 flex-1 gap-3 overflow-x-auto px-4 py-4 sm:px-6">
          {BOARD.map((stage) => {
            let list = columns.get(stage) ?? []
            let hidden = 0
            if (stage === 'signe' && !allSigned) {
              const recent = list.filter((c) => -daysFromToday(c.stage_changed_at.slice(0, 10)) <= SIGNED_WINDOW_DAYS)
              hidden = list.length - recent.length
              list = recent
            }
            return (
              <Column
                key={stage}
                stage={stage}
                clients={list}
                loading={loading}
                dragging={!!activeId}
                isSource={active?.stage === stage}
                footer={
                  stage === 'signe' && (hidden > 0 || allSigned) ? (
                    <button onClick={() => setAllSigned((v) => !v)} className="w-full rounded-md py-2 text-xs text-muted-foreground hover:bg-accent hover:text-foreground">
                      {allSigned ? `Seulement les ${SIGNED_WINDOW_DAYS} derniers jours` : `+ ${hidden} signés plus anciens`}
                    </button>
                  ) : null
                }
                renderCard={(c) => (
                  <DraggableCard
                    key={c.id}
                    client={c}
                    sites={sitesIndex.data?.get(c.id)}
                    task={taskByClient.get(c.id)}
                    ownerName={isAdmin ? ownerName.get(c.owner_id ?? '') : undefined}
                    stalling={stallingDays(c)}
                    onOpen={() => actions.openClientSheet(c.id)}
                  />
                )}
              />
            )
          })}
          {/* Zone « Perdu » toujours présente (compacte) : aucun décalage de mise en page pendant un glisser */}
          <motion.div initial={false} animate={{ width: showLost ? 272 : 132 }} transition={spring.smooth} className="h-full shrink-0">
            <Column
              stage="perdu"
              compact={!showLost}
              clients={showLost ? (columns.get('perdu') ?? []) : []}
              loading={loading}
              dragging={!!activeId}
              isSource={active?.stage === 'perdu'}
              renderCard={(c) => (
                <DraggableCard key={c.id} client={c} sites={sitesIndex.data?.get(c.id)} ownerName={isAdmin ? ownerName.get(c.owner_id ?? '') : undefined} onOpen={() => actions.openClientSheet(c.id)} />
              )}
            />
          </motion.div>
        </div>

        <DragOverlay dropAnimation={dropAnimation}>
          {active ? <PipelineCard client={active} sites={sitesIndex.data?.get(active.id)} task={taskByClient.get(active.id)} overlay className="w-[256px]" /> : null}
        </DragOverlay>
      </DndContext>

      <LostDialog
        client={lostFor}
        onCancel={() => setLostFor(null)}
        onConfirm={(reason) => {
          if (lostFor) move(lostFor, 'perdu', reason)
          setLostFor(null)
        }}
      />
      {confetti && <ConfettiBurst key={confetti.key} x={confetti.x} y={confetti.y} onDone={() => setConfetti(null)} />}
    </div>
  )
}

interface ColumnProps {
  stage: StageId
  clients: Client[]
  loading: boolean
  dragging: boolean
  isSource: boolean
  compact?: boolean
  footer?: React.ReactNode
  renderCard: (c: Client) => React.ReactNode
}

function Column({ stage, clients, loading, dragging, isSource, compact, footer, renderCard }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage })
  const s = stageOf(stage)
  const [limit, setLimit] = useState(PAGE)
  const budget = clients.reduce((a, c) => a + (c.annual_budget ?? 0), 0)
  const target = dragging && !isSource

  return (
    <section
      ref={setNodeRef}
      aria-label={s.label}
      className={cn(
        'relative flex h-full w-[272px] shrink-0 flex-col rounded-xl border bg-subtle transition-[border-color,background-color,box-shadow] duration-200',
        compact && 'w-full',
        isOver && target ? 'border-primary/50 bg-primary/[0.04] shadow-[0_0_0_4px_color-mix(in_oklch,var(--primary)_12%,transparent),0_8px_32px_-8px_color-mix(in_oklch,var(--primary)_35%,transparent)]' : target ? 'border-dashed border-border' : 'border-border',
      )}
    >
      <header className="flex items-center gap-2 px-3 pt-3 pb-2">
        <span className={cn('size-2 rounded-full', s.dot)} />
        <h2 className="truncate text-[13px] font-semibold">{compact ? s.short : s.label}</h2>
        <span className="tabular text-xs text-muted-foreground">{clients.length || ''}</span>
        {!compact && budget > 0 && <span className="tabular ml-auto text-[11px] text-muted-foreground">{formatEur(budget)}</span>}
      </header>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-2 pb-2">
        <AnimatePresence>
          {isOver && target && (
            <motion.div
              key="ghost"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 72, opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={spring.snappy}
              className="rounded-lg border border-dashed border-primary/50 bg-primary/5"
            />
          )}
        </AnimatePresence>
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[88px] rounded-lg" style={{ opacity: 1 - i * 0.2 }} />)
        ) : compact ? (
          <div className="flex h-full min-h-32 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border text-center text-xs text-muted-foreground">
            <Archive className="size-4" />
            Déposer ici pour archiver
          </div>
        ) : !clients.length ? (
          <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">Aucun dossier</p>
        ) : (
          <>
            {clients.slice(0, limit).map(renderCard)}
            {clients.length > limit && (
              <button onClick={() => setLimit((l) => l + PAGE)} className="flex w-full items-center justify-center gap-1 rounded-md py-2 text-xs text-muted-foreground hover:bg-accent hover:text-foreground">
                <ChevronDown className="size-3.5" /> Afficher {Math.min(PAGE, clients.length - limit)} de plus
              </button>
            )}
          </>
        )}
        {footer}
      </div>
    </section>
  )
}

function DraggableCard({ client, sites, task, ownerName, stalling, onOpen }: { client: Client; sites?: SiteSummary; task?: Task; ownerName?: string; stalling?: number | null; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: client.id })
  return (
    <motion.div layout="position" layoutId={`card-${client.id}`} transition={spring.smooth}>
      <ClientContextMenu client={client}>
      <PipelineCard
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        aria-roledescription="dossier déplaçable"
        client={client}
        sites={sites}
        task={task}
        ownerName={ownerName}
        stalling={stalling}
        dimmed={isDragging}
        onClick={onOpen}
        onKeyDown={(e) => {
          listeners?.onKeyDown?.(e)
          if (e.key === 'Enter') onOpen()
        }}
      />
      </ClientContextMenu>
    </motion.div>
  )
}
