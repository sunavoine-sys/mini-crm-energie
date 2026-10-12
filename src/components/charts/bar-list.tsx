import { motion } from 'motion/react'
import { cn } from '@/lib/utils'

export interface BarListItem {
  key: string
  label: React.ReactNode
  value: number
  display?: string
  onClick?: () => void
}

/** Liste à barres horizontales : voile d'accent sous un libellé neutre. */
export function BarList({ items, className }: { items: BarListItem[]; className?: string }) {
  const max = Math.max(...items.map((i) => i.value), 1)
  return (
    <ul className={cn('space-y-1.5', className)}>
      {items.map((item, idx) => {
        const Row = item.onClick ? 'button' : 'div'
        return (
          <li key={item.key}>
            <Row
              onClick={item.onClick}
              className={cn('group relative flex h-7 w-full items-center justify-between gap-3 rounded-[4px] px-2 text-left text-[13px]', item.onClick && 'outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30')}
            >
              <motion.span
                aria-hidden
                className="absolute inset-y-0 left-0 rounded-[4px] bg-primary/12 transition-colors group-hover:bg-primary/20 dark:bg-primary/14 dark:group-hover:bg-primary/22"
                initial={{ width: 0 }}
                animate={{ width: `${Math.max((item.value / max) * 100, item.value > 0 ? 2 : 0)}%` }}
                transition={{ type: 'spring', stiffness: 140, damping: 22, delay: idx * 0.05 }}
              />
              <span className="relative flex min-w-0 items-center gap-2 truncate">{item.label}</span>
              <span className="tabular relative shrink-0 text-xs font-medium text-muted-foreground group-hover:text-foreground">{item.display ?? item.value}</span>
            </Row>
          </li>
        )
      })}
    </ul>
  )
}
