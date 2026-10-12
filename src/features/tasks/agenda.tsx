import { useMemo } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { CalendarCheck2, Check } from 'lucide-react'
import { toast } from 'sonner'
import type { Task } from '@/lib/types'
import { daysFromToday, formatDay } from '@/lib/format'
import { spring } from '@/lib/motion'
import { cn } from '@/lib/utils'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { taskTypeLabel, useToggleTask } from './api'

const GROUPS = [
  { id: 'late', label: 'En retard', test: (d: number) => d < 0, tone: 'text-destructive' },
  { id: 'today', label: "Aujourd'hui", test: (d: number) => d === 0, tone: 'text-stage-offre' },
  { id: 'week', label: '7 prochains jours', test: (d: number) => d > 0 && d <= 7, tone: 'text-foreground' },
  { id: 'later', label: 'Plus tard', test: (d: number) => d > 7, tone: 'text-muted-foreground' },
]

interface AgendaProps {
  tasks: Task[] | undefined
  isLoading: boolean
  selectedClientId: string | null
  onSelectClient: (id: string) => void
}

export function Agenda({ tasks, isLoading, selectedClientId, onSelectClient }: AgendaProps) {
  const toggle = useToggleTask()
  const grouped = useMemo(
    () => GROUPS.map((g) => ({ ...g, items: (tasks ?? []).filter((t) => g.test(daysFromToday(t.due_date))) })).filter((g) => g.items.length),
    [tasks],
  )
  const lateCount = grouped.find((g) => g.id === 'late')?.items.length ?? 0
  const todayCount = grouped.find((g) => g.id === 'today')?.items.length ?? 0

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-border px-4 pt-4 pb-3">
        <h2 className="text-sm font-semibold tracking-tight">Agenda</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {isLoading ? 'Chargement…' : lateCount || todayCount ? (
            <>
              {lateCount > 0 && <span className="font-medium text-destructive">{lateCount} en retard</span>}
              {lateCount > 0 && todayCount > 0 && ' · '}
              {todayCount > 0 && <span className="font-medium text-stage-offre">{todayCount} aujourd'hui</span>}
            </>
          ) : (
            'Rien d’urgent, bravo.'
          )}
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
        {isLoading ? (
          <div className="space-y-3 p-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="size-4 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-4/5" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : !grouped.length ? (
          <EmptyState compact icon={CalendarCheck2} title="Agenda vide" description="Planifie une action depuis la fiche d'un client." />
        ) : (
          grouped.map((g) => (
            <div key={g.id} className="mb-2">
              <p className={cn('sticky top-0 z-10 bg-background/85 px-2 py-1.5 text-[11px] font-medium tracking-wide uppercase backdrop-blur-sm', g.tone)}>
                {g.label} <span className="tabular text-muted-foreground">{g.items.length}</span>
              </p>
              <ul>
                <AnimatePresence initial={false}>
                  {g.items.map((t) => (
                    <motion.li key={t.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: 12 }} transition={spring.snappy}>
                      <div className={cn('group flex items-start gap-2.5 rounded-lg px-2 py-2 transition-colors', t.client_id === selectedClientId ? 'bg-accent' : 'hover:bg-accent/50')}>
                        <button
                          aria-label="Terminer"
                          onClick={() =>
                            toggle.mutate(t, {
                              onSuccess: () => toast.success('Action terminée ✓', { description: t.title }),
                              onError: (e) => toast.error('Mise à jour impossible', { description: e.message }),
                            })
                          }
                          className="group/check mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border-[1.5px] border-muted-foreground/40 transition-colors hover:border-stage-signe hover:bg-stage-signe/10 active:scale-90"
                        >
                          <Check className="size-2.5 text-stage-signe opacity-0 group-hover/check:opacity-100" strokeWidth={3.5} />
                        </button>
                        <button className="min-w-0 flex-1 text-left" onClick={() => t.client_id && onSelectClient(t.client_id)}>
                          <p className="truncate text-[13px] leading-tight font-medium">{t.title}</p>
                          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                            {t.crm_clients?.company ?? 'Sans client'} · {taskTypeLabel(t.type)}
                          </p>
                        </button>
                        <span className={cn('tabular shrink-0 pt-px text-[11px]', daysFromToday(t.due_date) < 0 ? 'text-destructive' : 'text-muted-foreground')}>
                          {t.due_time && daysFromToday(t.due_date) === 0 ? t.due_time.slice(0, 5) : formatDay(t.due_date, { day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
