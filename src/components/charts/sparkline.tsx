import { useId } from 'react'
import { motion } from 'motion/react'
import { cn } from '@/lib/utils'
import { useWidth } from './use-width'

/** Sparkline : ligne 2px, voile 10 %, point final 8px cerclé de la surface. */
export function Sparkline({ values, height = 40, className, label }: { values: number[]; height?: number; className?: string; label: string }) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const id = useId()
  const pad = 5
  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const pts = values.map((v, i) => [pad + (i * (width - pad * 2)) / Math.max(values.length - 1, 1), pad + (1 - (v - min) / (max - min || 1)) * (height - pad * 2)] as const)
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const area = `${line} L${pts.at(-1)?.[0] ?? 0},${height} L${pts[0]?.[0] ?? 0},${height} Z`
  const last = pts.at(-1)

  return (
    <div ref={ref} className={cn('w-full', className)} style={{ height }}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={label} className="overflow-visible">
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.18} />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <motion.path d={area} fill={`url(#${id})`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.3 }} />
          <motion.path
            d={line}
            fill="none"
            stroke="var(--primary)"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          />
          {last && (
            <motion.circle cx={last[0]} cy={last[1]} r={4} fill="var(--primary)" stroke="var(--card)" strokeWidth={2} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.9, type: 'spring', stiffness: 400, damping: 20 }} />
          )}
        </svg>
      )}
    </div>
  )
}
