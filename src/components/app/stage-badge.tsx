import { stageOf } from '@/lib/stages'
import { cn } from '@/lib/utils'

export function StageDot({ stage, className }: { stage: string; className?: string }) {
  return <span aria-hidden className={cn('inline-block size-2 shrink-0 rounded-full', stageOf(stage).dot, className)} />
}

export function StageBadge({ stage, short, className }: { stage: string; short?: boolean; className?: string }) {
  const s = stageOf(stage)
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset', s.soft, className)}>
      <span aria-hidden className={cn('size-1.5 rounded-full', s.dot)} />
      {short ? s.short : s.label}
    </span>
  )
}
