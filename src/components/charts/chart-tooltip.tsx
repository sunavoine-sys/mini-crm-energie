import { motion } from 'motion/react'
import { cn } from '@/lib/utils'

/** Infobulle : fond flouté, valeur en avant, libellé en retrait, clé en trait. */
export function ChartTooltip({ x, y, title, rows, className }: { x: number; y: number; title: string; rows: { label: string; value: string; key?: boolean }[]; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
      className={cn('pointer-events-none absolute z-20 min-w-36 -translate-x-1/2 -translate-y-full rounded-lg border border-border bg-popover/80 px-3 py-2 shadow-lg backdrop-blur-md', className)}
      style={{ left: x, top: y - 8 }}
    >
      <p className="mb-1 text-[11px] text-muted-foreground first-letter:uppercase">{title}</p>
      {rows.map((r) => (
        <p key={r.label} className="flex items-center gap-2 text-xs">
          {r.key && <span className="h-0.5 w-3 rounded-full bg-primary" />}
          <span className="font-semibold text-foreground">{r.value}</span>
          <span className="text-muted-foreground">{r.label}</span>
        </p>
      ))}
    </motion.div>
  )
}
