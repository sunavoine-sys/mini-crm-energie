import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { AnimatePresence, motion } from 'motion/react'
import { CalendarCheck2, CalendarClock, Check, ChevronRight, Clock, FileSignature, Mail, MoreHorizontal, Phone, RefreshCcw } from 'lucide-react'
import { toast } from 'sonner'
import type { Task } from '@/lib/types'
import { daysFromToday, formatDay, parseDay, todayISO } from '@/lib/format'
import { fadeUp, spring, stagger } from '@/lib/motion'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { EmptyState } from '@/components/ui/empty-state'
import { Segmented } from '@/components/ui/segmented'
import { Skeleton } from '@/components/ui/skeleton'
import { StageDot } from '@/components/app/stage-badge'
import { useAuth } from '@/features/auth/auth-context'
import { useClients } from '@/features/clients/api'
import { taskTypeLabel, useOpenTasks, useRescheduleTask, useToggleTask } from './api'

const TYPE_ICON: Record<string, typeof Phone> = { appel: Phone, relance: Mail, offre: FileSignature, échéance: CalendarClock }

function shiftDays(n: number) {
  const d = parseDay(todayISO())
  d.setDate(d.getDate() + n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function dayLabel(day: string) {
  const diff = daysFromToday(day)
  if (diff === 0) return "Aujourd'hui"
  if (diff === 1) return 'Demain'
  const label = formatDay(day, { weekday: 'long', day: 'numeric', month: 'long' })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

type Scope = 'mine' | 'all'

export function AgendaPage() {
  const { isAdmin, session } = useAuth()
  const { data: tasks, isPending } = useOpenTasks()
  const { data: clients } = useClients()
  const [scope, setScope] = useState<Scope>('mine')
  const [focusDay, setFocusDay] = useState<string | null>(null)

  const stageById = useMemo(() => new Map((clients ?? []).map((c) => [c.id, c.stage])), [clients])
  const scoped = useMemo(() => (tasks ?? []).filter((t) => !isAdmin || scope === 'all' || t.owner_id === session?.user.id), [tasks, isAdmin, scope, session])

  const late = scoped.filter((t) => daysFromToday(t.due_date) < 0)
  const upcoming = scoped.filter((t) => daysFromToday(t.due_date) >= 0)
  const byDay = useMemo(() => {
    const map = new Map<string, Task[]>()
    for (const t of upcoming) map.set(t.due_date, [...(map.get(t.due_date) ?? []), t])
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [upcoming])

  const strip = Array.from({ length: 14 }, (_, i) => shiftDays(i))
  const countFor = (day: string) => upcoming.filter((t) => t.due_date === day).length
  const visibleDays = focusDay ? byDay.filter(([d]) => d === focusDay) : byDay

  return (
    <div className="h-full overflow-y-auto">
      <motion.div variants={stagger(0.05)} initial="hidden" animate="show" className="mx-auto w-full max-w-4xl space-y-6 px-4 py-6 sm:px-6 lg:py-8">
        <motion.header variants={fadeUp} className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Agenda</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {isPending ? 'Chargement…' : (
                <>
                  {scoped.length} action{scoped.length > 1 ? 's' : ''} ouverte{scoped.length > 1 ? 's' : ''}
                  {late.length > 0 && <span className="text-destructive"> · {late.length} en retard</span>}
                </>
              )}
            </p>
          </div>
          {isAdmin && (
            <Segmented layoutId="agenda-scope" size="sm" value={scope} onChange={setScope} options={[{ value: 'mine', label: 'Les miennes' }, { value: 'all', label: "Toute l'équipe" }]} />
          )}
        </motion.header>

        {/* Bandeau 14 jours */}
        <motion.div variants={fadeUp} className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
          <div className="flex min-w-max gap-1.5">
            {strip.map((day) => {
              const n = countFor(day)
              const d = parseDay(day)
              const active = focusDay === day
              const weekend = d.getDay() === 0 || d.getDay() === 6
              return (
                <button
                  key={day}
                  onClick={() => setFocusDay(active ? null : day)}
                  className={cn(
                    'relative flex w-12 flex-col items-center gap-0.5 rounded-lg border py-2 transition-[background-color,border-color,transform] active:scale-95',
                    active ? 'border-primary/50 bg-primary/10' : 'border-border bg-card hover:bg-accent',
                    weekend && !active && 'bg-subtle',
                  )}
                >
                  <span className="text-[10px] font-medium text-muted-foreground uppercase">{d.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '')}</span>
                  <span className={cn('tabular text-sm font-semibold', daysFromToday(day) === 0 && 'text-primary')}>{d.getDate()}</span>
                  <span className="flex h-1.5 items-center gap-0.5">
                    {Array.from({ length: Math.min(n, 3) }).map((_, i) => (
                      <span key={i} className={cn('size-1 rounded-full', active ? 'bg-primary' : 'bg-muted-foreground/60')} />
                    ))}
                  </span>
                </button>
              )
            })}
          </div>
        </motion.div>

        {isPending ? (
          <div className="space-y-6">
            {[0, 1].map((g) => (
              <div key={g} className="space-y-2">
                <Skeleton className="h-4 w-32" />
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-16 rounded-xl" />
                ))}
              </div>
            ))}
          </div>
        ) : !scoped.length ? (
          <EmptyState icon={CalendarCheck2} title="Rien de prévu" description="Aucune action ouverte. Planifie la prochaine étape depuis la fiche d'un client." />
        ) : (
          <div className="space-y-7">
            {focusDay && (
              <button onClick={() => setFocusDay(null)} className="text-xs font-medium text-primary hover:underline">
                ← Voir toutes les dates
              </button>
            )}
            {!focusDay && late.length > 0 && <DayGroup title="En retard" tone="danger" tasks={late} stageById={stageById} />}
            {visibleDays.map(([day, items]) => (
              <DayGroup key={day} title={dayLabel(day)} tone={daysFromToday(day) === 0 ? 'today' : undefined} tasks={items} stageById={stageById} />
            ))}
            {focusDay && !visibleDays.length && <EmptyState compact icon={CalendarCheck2} title="Journée libre" description={dayLabel(focusDay)} />}
          </div>
        )}
      </motion.div>
    </div>
  )
}

function DayGroup({ title, tone, tasks, stageById }: { title: string; tone?: 'danger' | 'today'; tasks: Task[]; stageById: Map<string, string> }) {
  return (
    <motion.section variants={fadeUp} initial="hidden" animate="show" className="space-y-2">
      <h2 className={cn('flex items-center gap-2 text-[13px] font-semibold', tone === 'danger' ? 'text-destructive' : tone === 'today' ? 'text-primary' : 'text-foreground')}>
        {title}
        <span className="tabular text-xs font-normal text-muted-foreground">{tasks.length}</span>
      </h2>
      <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-xs">
        <AnimatePresence initial={false}>
          {tasks.map((t) => (
            <TaskRow key={t.id} task={t} stage={t.client_id ? stageById.get(t.client_id) : undefined} />
          ))}
        </AnimatePresence>
      </ul>
    </motion.section>
  )
}

function TaskRow({ task: t, stage }: { task: Task; stage?: string }) {
  const toggle = useToggleTask()
  const reschedule = useRescheduleTask()
  const Icon = TYPE_ICON[t.type] ?? Clock
  const late = daysFromToday(t.due_date) < 0

  function postpone(days: number, label: string) {
    reschedule.mutate(
      { id: t.id, due_date: shiftDays(days) },
      {
        onSuccess: () => toast.success(`Reportée ${label}`, { description: t.title }),
        onError: (e) => toast.error('Report impossible', { description: e.message }),
      },
    )
  }

  return (
    <motion.li layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, height: 0 }} transition={spring.smooth} className="group">
      <div className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-accent/40">
        <button
          aria-label="Terminer"
          onClick={() =>
            toggle.mutate(t, {
              onSuccess: () => toast.success('Action terminée ✓', { description: t.title }),
              onError: (e) => toast.error('Mise à jour impossible', { description: e.message }),
            })
          }
          className="group/check mt-0.5 flex size-[18px] shrink-0 items-center justify-center rounded-full border-[1.5px] border-muted-foreground/40 transition-colors hover:border-stage-signe hover:bg-stage-signe/10 active:scale-90"
        >
          <Check className="size-3 text-stage-signe opacity-0 group-hover/check:opacity-100" strokeWidth={3} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-sm leading-snug font-medium">{t.title}</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {t.client_id && (
              <Link to={`/clients/${t.client_id}`} className="flex items-center gap-1.5 font-medium text-foreground/80 hover:text-foreground hover:underline">
                {stage && <StageDot stage={stage} />}
                {t.crm_clients?.company ?? 'Client'}
                <ChevronRight className="size-3 opacity-50" />
              </Link>
            )}
            <span className="flex items-center gap-1">
              <Icon className="size-3" /> {taskTypeLabel(t.type)}
            </span>
            {(t.due_time || late) && (
              <span className={cn('tabular flex items-center gap-1', late && 'text-destructive')}>
                <Clock className="size-3" />
                {late ? formatDay(t.due_date, { day: 'numeric', month: 'short' }) : ''}
                {t.due_time ? ` ${t.due_time.slice(0, 5)}` : ''}
              </span>
            )}
          </div>
          {t.notes && <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{t.notes}</p>}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon-xs" variant="ghost" className="opacity-50 group-hover:opacity-100" aria-label="Reporter">
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Reporter</DropdownMenuLabel>
            <DropdownMenuItem onSelect={() => postpone(1, 'à demain')}>
              <RefreshCcw /> Demain
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => postpone(3, 'de 3 jours')}>
              <RefreshCcw /> Dans 3 jours
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => postpone(7, "d'une semaine")}>
              <RefreshCcw /> Dans une semaine
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.li>
  )
}
