import { forwardRef } from 'react'
import { CalendarClock, Clock, Hourglass } from 'lucide-react'
import type { Client, Task } from '@/lib/types'
import { contactName, daysFromToday, formatEur, formatRelativeDay } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Avatar } from '@/components/ui/avatar'
import type { SiteSummary } from '@/features/clients/api'

export interface PipelineCardProps extends React.HTMLAttributes<HTMLDivElement> {
  client: Client
  sites?: SiteSummary
  task?: Task
  ownerName?: string
  stalling?: number | null
  overlay?: boolean
  dimmed?: boolean
}

/** Carte de dossier — sert à la fois dans la colonne et dans l'aperçu de glisser. */
export const PipelineCard = forwardRef<HTMLDivElement, PipelineCardProps>(function PipelineCard(
  { client: c, sites, task, ownerName, stalling, overlay, dimmed, className, ...props },
  ref,
) {
  const contact = contactName(c)
  const due = task ? daysFromToday(task.due_date) : null
  const endIn = sites?.nextEnd ? daysFromToday(sites.nextEnd) : null

  return (
    <div
      ref={ref}
      {...props}
      className={cn(
        'group/card relative cursor-grab touch-none rounded-lg border border-border bg-card p-3 text-left shadow-xs outline-none select-none',
        'transition-[box-shadow,transform,opacity,border-color] duration-150 hover:-translate-y-px hover:border-foreground/15 hover:shadow-md focus-visible:ring-[3px] focus-visible:ring-ring/30 active:cursor-grabbing',
        overlay && 'rotate-[2.5deg] scale-[1.03] cursor-grabbing border-primary/40 shadow-2xl ring-1 ring-primary/20',
        dimmed && 'opacity-35 shadow-none',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 truncate text-[13px] leading-tight font-medium">{c.company || 'Sans nom'}</p>
        {ownerName && <Avatar name={ownerName} className="size-5 text-[8px]" />}
      </div>
      <p className="mt-0.5 truncate text-xs text-muted-foreground">{[contact, sites?.suppliers.join(', ')].filter(Boolean).join(' · ') || '—'}</p>

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[11px]">
        {c.annual_budget != null && <span className="tabular rounded bg-muted px-1.5 py-0.5 font-medium text-foreground/80">{formatEur(c.annual_budget)}</span>}
        {endIn != null && endIn >= 0 && endIn <= 180 && (
          <span className={cn('flex items-center gap-1 rounded px-1.5 py-0.5', endIn <= 90 ? 'bg-destructive/10 text-destructive' : 'bg-stage-offre/10 text-stage-offre')}>
            <CalendarClock className="size-3" /> {formatRelativeDay(sites!.nextEnd!)}
          </span>
        )}
        {stalling != null && stalling > 0 && (
          <span className="flex items-center gap-1 rounded bg-stage-offre/10 px-1.5 py-0.5 text-stage-offre">
            <Hourglass className="size-3" /> +{stalling} j
          </span>
        )}
      </div>

      {task && (
        <p className={cn('mt-2 flex items-center gap-1.5 border-t border-border pt-2 text-[11px]', due! < 0 ? 'text-destructive' : due === 0 ? 'text-stage-offre' : 'text-muted-foreground')}>
          <Clock className="size-3 shrink-0" />
          <span className="truncate">{task.title}</span>
          <span className="ml-auto shrink-0 opacity-80">{formatRelativeDay(task.due_date)}</span>
        </p>
      )}
    </div>
  )
})
