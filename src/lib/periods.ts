import { parseDay, todayISO } from './format'

export type Period = 'month' | 'quarter' | 'year'

export const PERIOD_LABEL: Record<Period, string> = { month: 'Ce mois', quarter: 'Ce trimestre', year: 'Cette année' }
export const PERIOD_COMPARE: Record<Period, string> = { month: 'vs mois dernier', quarter: 'vs trimestre précédent', year: 'vs année précédente' }

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/**
 * Période en cours (du début à aujourd'hui) et période précédente « à date »
 * (même durée écoulée), pour une comparaison honnête en cours de mois.
 */
export function periodRanges(period: Period) {
  const today = parseDay(todayISO())
  const start = new Date(today)
  if (period === 'month') start.setDate(1)
  if (period === 'quarter') start.setMonth(Math.floor(today.getMonth() / 3) * 3, 1)
  if (period === 'year') start.setMonth(0, 1)

  const months = period === 'month' ? 1 : period === 'quarter' ? 3 : 12
  const prevStart = new Date(start)
  prevStart.setMonth(prevStart.getMonth() - months)
  const prevEnd = new Date(today)
  prevEnd.setMonth(prevEnd.getMonth() - months)

  return { thisPeriod: [iso(start), iso(today)] as const, lastPeriod: [iso(prevStart), iso(prevEnd)] as const }
}

export const inRange = (day: string | null | undefined, [a, b]: readonly [string, string]) => !!day && day >= a && day <= b

/** Les 12 derniers mois (clé YYYY-MM), du plus ancien au plus récent. */
export function last12Months() {
  const d = parseDay(todayISO())
  d.setDate(1)
  return Array.from({ length: 12 }, (_, i) => {
    const m = new Date(d)
    m.setMonth(d.getMonth() - (11 - i))
    return {
      key: `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`,
      label: m.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', ''),
      long: m.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
    }
  })
}
