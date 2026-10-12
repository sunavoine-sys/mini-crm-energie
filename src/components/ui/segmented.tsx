import { motion } from 'motion/react'
import { spring } from '@/lib/motion'
import { cn } from '@/lib/utils'

interface SegmentedProps<T extends string> {
  value: T
  onChange: (value: T) => void
  options: { value: T; label: React.ReactNode; count?: number }[]
  layoutId: string
  className?: string
  size?: 'sm' | 'md'
}

/** Onglets segmentés avec indicateur glissant (layout animation). */
function Segmented<T extends string>({ value, onChange, options, layoutId, className, size = 'md' }: SegmentedProps<T>) {
  return (
    <div role="tablist" className={cn('inline-flex items-center gap-0.5 rounded-lg bg-muted p-0.5', className)}>
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={cn(
              'relative flex items-center gap-1.5 rounded-md font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30',
              size === 'sm' ? 'h-7 px-2.5 text-xs' : 'h-8 px-3 text-[13px]',
              active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                transition={spring.snappy}
                className="absolute inset-0 rounded-md bg-card shadow-sm ring-1 ring-border dark:bg-accent"
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              {o.label}
              {o.count != null && <span className="tabular text-[11px] text-muted-foreground">{o.count}</span>}
            </span>
          </button>
        )
      })}
    </div>
  )
}

export { Segmented }
