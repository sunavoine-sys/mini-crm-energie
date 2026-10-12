import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { cn } from '@/lib/utils'
import { ChartTooltip } from './chart-tooltip'
import { useWidth } from './use-width'

export interface ColumnDatum {
  key: string
  label: string
  title: string
  value: number
  detail?: string
}

const compact = new Intl.NumberFormat('fr-FR', { notation: 'compact', maximumFractionDigits: 1 })

function niceMax(v: number) {
  if (v <= 0) return 1
  const exp = 10 ** Math.floor(Math.log10(v))
  const f = v / exp
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * exp
}

/**
 * Colonnes : une seule série, période courante en accent, historique en retrait.
 * Barres ≤ 24px, bout arrondi 4px, carré à la ligne de base, grille en filet.
 */
export function ColumnChart({ data, height = 200, format, valueLabel }: { data: ColumnDatum[]; height?: number; format: (v: number) => string; valueLabel: string }) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const axisW = 36
  const bottom = 22
  const top = 8
  const plotW = Math.max(width - axisW, 0)
  const plotH = height - bottom - top
  const max = niceMax(Math.max(...data.map((d) => d.value)))
  const ticks = [0, max / 2, max]
  const band = plotW / Math.max(data.length, 1)
  const barW = Math.min(24, band * 0.56)
  const yOf = (v: number) => top + plotH - (v / max) * plotH
  const current = data.length - 1

  return (
    <div ref={ref} className="relative w-full" style={{ height }} onPointerLeave={() => setHover(null)}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={`${valueLabel} par mois`}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={axisW} x2={width} y1={yOf(t)} y2={yOf(t)} stroke="var(--border)" strokeWidth={1} />
              <text x={axisW - 8} y={yOf(t)} dy="0.32em" textAnchor="end" className="tabular fill-muted-foreground text-[10px]">
                {compact.format(t)}
              </text>
            </g>
          ))}
          {data.map((d, i) => {
            const x = axisW + i * band + (band - barW) / 2
            const h = Math.max((d.value / max) * plotH, d.value > 0 ? 2 : 0)
            const y = top + plotH - h
            const r = Math.min(4, h)
            const path = h > 0 ? `M${x},${top + plotH} V${y + r} Q${x},${y} ${x + r},${y} H${x + barW - r} Q${x + barW},${y} ${x + barW},${y + r} V${top + plotH} Z` : ''
            const accent = i === current || hover === i
            return (
              <g key={d.key}>
                {path && (
                  <motion.path
                    d={path}
                    style={{ originY: 1 }}
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{ type: 'spring', stiffness: 160, damping: 22, delay: i * 0.035 }}
                    className={cn('transition-[fill,opacity] duration-150', accent ? 'fill-primary' : 'fill-muted-foreground/30')}
                  />
                )}
                <text x={x + barW / 2} y={height - 6} textAnchor="middle" className={cn('text-[10px]', i === current ? 'fill-foreground font-medium' : 'fill-muted-foreground')}>
                  {d.label}
                </text>
                <rect
                  x={axisW + i * band}
                  y={0}
                  width={band}
                  height={height}
                  fill="transparent"
                  tabIndex={0}
                  aria-label={`${d.title} : ${format(d.value)}${d.detail ? `, ${d.detail}` : ''}`}
                  onPointerEnter={() => setHover(i)}
                  onFocus={() => setHover(i)}
                  onBlur={() => setHover(null)}
                  className="outline-none"
                />
              </g>
            )
          })}
        </svg>
      )}
      <AnimatePresence>
        {hover != null && data[hover] && (
          <ChartTooltip
            key={hover}
            x={Math.min(Math.max(axisW + hover * band + band / 2, 80), width - 80)}
            y={yOf(data[hover].value)}
            title={data[hover].title}
            rows={[{ label: valueLabel, value: format(data[hover].value), key: true }, ...(data[hover].detail ? [{ label: '', value: data[hover].detail! }] : [])]}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
