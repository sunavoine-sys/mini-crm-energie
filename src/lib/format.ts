const eur = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
const num = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 })
const priceFmt = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 4, maximumFractionDigits: 5 })
const rtf = new Intl.RelativeTimeFormat('fr', { numeric: 'auto' })

export const formatEur = (v: number | null | undefined) => (v == null ? '—' : eur.format(v))
export const formatNumber = (v: number | null | undefined) => (v == null ? '—' : num.format(v))
export const formatPrice = (v: number | null | undefined) => (v == null ? '—' : `${priceFmt.format(v)} €`)

export function formatBytes(bytes: number) {
  if (!bytes) return '—'
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} Ko`
  return `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} Mo`
}

/** Date ISO (yyyy-mm-dd) → Date locale à minuit, sans décalage de fuseau. */
export function parseDay(day: string) {
  const [y, m, d] = day.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function daysFromToday(day: string) {
  const today = parseDay(todayISO()).getTime()
  return Math.round((parseDay(day).getTime() - today) / 86_400_000)
}

export function formatDay(day: string | null | undefined, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }) {
  if (!day) return '—'
  return parseDay(day).toLocaleDateString('fr-FR', opts)
}

/** « aujourd'hui », « demain », « dans 3 jours », « il y a 2 jours »… */
export function formatRelativeDay(day: string) {
  const diff = daysFromToday(day)
  if (Math.abs(diff) < 7) return rtf.format(diff, 'day')
  if (Math.abs(diff) < 60) return rtf.format(Math.round(diff / 7), 'week')
  return rtf.format(Math.round(diff / 30), 'month')
}

export function formatRelativeTime(iso: string) {
  const diffMin = Math.round((new Date(iso).getTime() - Date.now()) / 60_000)
  if (Math.abs(diffMin) < 60) return rtf.format(diffMin, 'minute')
  const diffH = Math.round(diffMin / 60)
  if (Math.abs(diffH) < 24) return rtf.format(diffH, 'hour')
  const diffD = Math.round(diffH / 24)
  if (Math.abs(diffD) < 30) return rtf.format(diffD, 'day')
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function initials(name: string | null | undefined) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?'
}

export function contactName(c: { first_name: string | null; last_name: string | null }) {
  return [c.first_name, c.last_name].filter(Boolean).join(' ')
}

/** Saisie FR (« 0,1452 », « 12 000 € ») → nombre, ou null si vide/invalide. */
export function parseDecimal(value: string): number | null {
  const cleaned = value.replace(/[\s €]/g, '').replace(',', '.')
  if (!cleaned) return null
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : null
}

export function normalize(text: string) {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}
