import { Fragment, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { AlertTriangle, CheckCircle2, ChevronRight, CircleDashed, Clock, Coins, FileSignature, Flame, Info, Search, Wallet, X, Zap } from 'lucide-react'
import { daysFromToday, formatDay, formatEur, normalize } from '@/lib/format'
import { inRange, periodRanges, type Period } from '@/lib/periods'
import { fadeUp, spring, stagger } from '@/lib/motion'
import { cn } from '@/lib/utils'
import { EmptyState } from '@/components/ui/empty-state'
import { Segmented } from '@/components/ui/segmented'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { AnimatedNumber } from '@/components/charts/animated-number'
import { useAppActions } from '@/app/app-context'
import { useAuth } from '@/features/auth/auth-context'
import { useProfiles } from '@/features/clients/api'
import { useCommissions, useDeals, useSupplierPayments, type Commission, type Deal, type SupplierPayment } from '@/features/dashboard/api'

type Scope = Period | 'all'
type Tab = 'deals' | 'commissions' | 'payments'

const eur = (n: number) => formatEur(Math.round(n))
const eur2 = (n: number | null | undefined) =>
  n == null ? '—' : new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)

const ROLE_LABEL: Record<string, string> = { commercial: 'Commercial', associe: 'Associé', fichier: 'Fichier' }

type CollectState = 'recu' | 'partiel' | 'retard' | 'attente' | 'aucun'

function collectState(pays: SupplierPayment[]): CollectState {
  if (!pays.length) return 'aucun'
  const exp = pays.reduce((a, p) => a + (p.amount_expected ?? 0), 0)
  const rec = pays.reduce((a, p) => a + (p.amount_received ?? 0), 0)
  if (pays.every((p) => p.status === 'recu') || (exp > 0 && rec >= exp)) return 'recu'
  if (pays.some((p) => p.status === 'en_retard' || (p.status !== 'recu' && p.expected_date && daysFromToday(p.expected_date) < 0))) return 'retard'
  if (rec > 0) return 'partiel'
  return 'attente'
}

const STATE_UI: Record<CollectState, { label: string; icon: typeof Clock; cls: string }> = {
  recu: { label: 'Encaissé', icon: CheckCircle2, cls: 'bg-stage-signe/10 text-stage-signe ring-stage-signe/20' },
  partiel: { label: 'Partiel', icon: CircleDashed, cls: 'bg-stage-factures/10 text-stage-factures ring-stage-factures/20' },
  retard: { label: 'En retard', icon: AlertTriangle, cls: 'bg-destructive/10 text-destructive ring-destructive/20' },
  attente: { label: 'En attente', icon: Clock, cls: 'bg-muted text-muted-foreground ring-border' },
  aucun: { label: '—', icon: Clock, cls: 'bg-muted text-muted-foreground ring-border' },
}

function StateBadge({ state }: { state: CollectState }) {
  const ui = STATE_UI[state]
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap ring-1 ring-inset', ui.cls)}>
      <ui.icon className="size-3" />
      {ui.label}
    </span>
  )
}

export function SalesPage() {
  const { isAdmin, session } = useAuth()
  const uid = session?.user.id
  const actions = useAppActions()
  const deals = useDeals()
  const commissions = useCommissions()
  const payments = useSupplierPayments()
  const profiles = useProfiles(isAdmin)

  const [scope, setScope] = useState<Scope>('year')
  const [tab, setTab] = useState<Tab>('deals')
  const [query, setQuery] = useState('')
  const [seller, setSeller] = useState('all')
  const [open, setOpen] = useState<string | null>(null)

  const loading = deals.isPending || commissions.isPending || payments.isPending

  const byDeal = useMemo(() => {
    const pays = new Map<string, SupplierPayment[]>()
    for (const p of payments.data ?? []) pays.set(p.deal_id, [...(pays.get(p.deal_id) ?? []), p])
    const coms = new Map<string, Commission[]>()
    for (const c of commissions.data ?? []) coms.set(c.deal_id, [...(coms.get(c.deal_id) ?? []), c])
    return { pays, coms }
  }, [payments.data, commissions.data])

  const range = useMemo(() => (scope === 'all' ? (['0000-01-01', '9999-12-31'] as const) : periodRanges(scope).thisPeriod), [scope])

  const list = useMemo(() => {
    const q = normalize(query.trim())
    return (deals.data ?? []).filter((d) => {
      if (!inRange(d.signed_on, range)) return false
      if (seller !== 'all' && d.commercial_id !== seller) return false
      if (!q) return true
      return normalize([d.company, d.supplier, d.commercial_name, d.contract_name].filter(Boolean).join(' ')).includes(q)
    }).sort((a, b) => (b.signed_on ?? '').localeCompare(a.signed_on ?? ''))
  }, [deals.data, query, seller, range])

  const myShare = (d: Deal) => (byDeal.coms.get(d.id) ?? []).filter((c) => c.person_id === uid).reduce((a, c) => a + (c.theoretical_amount ?? 0), 0)
  const amountOf = (d: Deal) => (isAdmin ? (d.commission_total_ht ?? 0) : myShare(d))

  // Calcul léger (quelques dizaines de ventes) : pas besoin de mémoïser
  const totals = (() => {
    const ids = new Set(list.map((d) => d.id))
    const pays = (payments.data ?? []).filter((p) => ids.has(p.deal_id))
    const myComs = (commissions.data ?? []).filter((c) => ids.has(c.deal_id) && (isAdmin || c.person_id === uid))
    return {
      count: list.length,
      amount: list.reduce((a, d) => a + amountOf(d), 0),
      received: isAdmin ? pays.reduce((a, p) => a + (p.amount_received ?? 0), 0) : myComs.reduce((a, c) => a + (c.paid_amount ?? 0), 0),
      pending: isAdmin
        ? pays.filter((p) => p.status !== 'recu').reduce((a, p) => a + Math.max(0, (p.amount_expected ?? 0) - (p.amount_received ?? 0)), 0)
        : myComs.reduce((a, c) => a + Math.max(0, (c.theoretical_amount ?? 0) - (c.paid_amount ?? 0)), 0),
    }
  })()

  const tabs: { value: Tab; label: React.ReactNode }[] = [
    { value: 'deals', label: <><FileSignature className="size-3.5" /> Ventes</> },
    { value: 'commissions', label: <><Coins className="size-3.5" /> {isAdmin ? 'Commissions' : 'Mes commissions'}</> },
    ...(isAdmin ? [{ value: 'payments' as Tab, label: <><Wallet className="size-3.5" /> Encaissements</> }] : []),
  ]

  return (
    <div className="h-full overflow-y-auto">
      <motion.div variants={stagger(0.04)} initial="hidden" animate="show" className="mx-auto w-full max-w-6xl space-y-5 px-4 py-6 sm:px-6 lg:py-8">
        <motion.header variants={fadeUp} className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Ventes & commissions</h1>
            <p className="mt-1 text-sm text-muted-foreground">{isAdmin ? "Vue d'ensemble de l'équipe" : 'Tes ventes et ta part de commission'}</p>
          </div>
          <Segmented
            layoutId="sales-scope"
            size="sm"
            value={scope}
            onChange={setScope}
            options={[
              { value: 'month', label: 'Mois' },
              { value: 'quarter', label: 'Trimestre' },
              { value: 'year', label: 'Année' },
              { value: 'all', label: 'Tout' },
            ]}
          />
        </motion.header>

        <motion.div variants={fadeUp} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi icon={FileSignature} label="Ventes" value={totals.count} format={(n) => String(Math.round(n))} loading={loading} />
          <Kpi icon={Coins} label={isAdmin ? 'Commission HT' : 'Ma commission'} value={totals.amount} format={eur} loading={loading} />
          <Kpi icon={CheckCircle2} label={isAdmin ? 'Encaissé' : 'Déjà versé'} value={totals.received} format={eur} loading={loading} />
          <Kpi icon={Wallet} label={isAdmin ? 'À encaisser' : 'À percevoir'} value={totals.pending} format={eur} loading={loading} />
        </motion.div>

        <motion.div variants={fadeUp} className="flex flex-wrap items-center gap-3">
          <Segmented layoutId="sales-tab" value={tab} onChange={setTab} options={tabs} />
          <div className="relative ml-auto w-full sm:w-60">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Client, fournisseur…"
              aria-label="Rechercher une vente"
              className="h-8 w-full rounded-md border border-input bg-card pr-8 pl-8 text-[13px] shadow-xs outline-none placeholder:text-muted-foreground/70 focus:border-ring focus:ring-[3px] focus:ring-ring/25 dark:bg-input/25"
            />
            {query && (
              <button onClick={() => setQuery('')} className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label="Effacer">
                <X className="size-3.5" />
              </button>
            )}
          </div>
          {isAdmin && (
            <Select value={seller} onValueChange={setSeller}>
              <SelectTrigger className="h-8 w-52 text-[13px]" aria-label="Commercial">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les commerciaux</SelectItem>
                {(profiles.data ?? []).map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </motion.div>

        <motion.section variants={fadeUp} className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
          {loading ? (
            <div className="space-y-px p-2">
              {Array.from({ length: 7 }).map((_, i) => (
                <Skeleton key={i} className="h-11 rounded-md" style={{ opacity: 1 - i * 0.1 }} />
              ))}
            </div>
          ) : tab === 'deals' ? (
            !list.length ? (
              <EmptyState icon={FileSignature} title="Aucune vente" description={query || seller !== 'all' ? 'Aucune vente ne correspond à ces filtres.' : 'Aucun contrat signé sur cette période.'} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-[13px]">
                  <thead>
                    <tr className="border-b border-border bg-subtle text-left text-[11px] text-muted-foreground">
                      <th className="w-8" />
                      <th className="py-2.5 pr-3 font-medium">Signée le</th>
                      <th className="py-2.5 pr-3 font-medium">Client</th>
                      <th className="py-2.5 pr-3 font-medium">Fournisseur</th>
                      {isAdmin && <th className="py-2.5 pr-3 font-medium">Commercial</th>}
                      <th className="py-2.5 pr-3 font-medium">Encaissement</th>
                      <th className="py-2.5 pr-4 text-right font-medium">{isAdmin ? 'Commission HT' : 'Ma part'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((d) => {
                      const pays = byDeal.pays.get(d.id) ?? []
                      const expanded = open === d.id
                      return (
                        <Fragment key={d.id}>
                          <tr
                            onClick={() => setOpen(expanded ? null : d.id)}
                            className={cn('cursor-pointer border-b border-border transition-colors hover:bg-accent/40', expanded && 'bg-accent/40')}
                            aria-expanded={expanded}
                          >
                            <td className="pl-3">
                              <ChevronRight className={cn('size-3.5 text-muted-foreground transition-transform', expanded && 'rotate-90')} />
                            </td>
                            <td className="tabular py-2.5 pr-3 text-muted-foreground">{formatDay(d.signed_on, { day: 'numeric', month: 'short', year: '2-digit' })}</td>
                            <td className="py-2.5 pr-3">
                              <button
                                className="max-w-[220px] truncate text-left font-medium hover:underline"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  if (d.client_id) actions.openClientSheet(d.client_id)
                                }}
                              >
                                {d.company ?? '—'}
                              </button>
                            </td>
                            <td className="py-2.5 pr-3">
                              <span className="flex items-center gap-1.5">
                                {d.energy === 'gaz' ? <Flame className="size-3 text-stage-offre" /> : <Zap className="size-3 text-primary" />}
                                {d.supplier ?? '—'}
                              </span>
                            </td>
                            {isAdmin && <td className="py-2.5 pr-3 text-muted-foreground">{d.commercial_name ?? '—'}</td>}
                            <td className="py-2.5 pr-3">
                              <StateBadge state={collectState(pays)} />
                            </td>
                            <td className="tabular py-2.5 pr-4 text-right font-medium">{eur2(amountOf(d))}</td>
                          </tr>
                          <AnimatePresence initial={false}>
                            {expanded && (
                              <tr className="border-b border-border bg-subtle">
                                <td colSpan={isAdmin ? 7 : 6} className="p-0">
                                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={spring.smooth} className="overflow-hidden">
                                    <DealDetail deal={d} pays={pays} coms={byDeal.coms.get(d.id) ?? []} isAdmin={isAdmin} />
                                  </motion.div>
                                </td>
                              </tr>
                            )}
                          </AnimatePresence>
                        </Fragment>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )
          ) : tab === 'commissions' ? (
            <CommissionsTable deals={list} coms={commissions.data ?? []} isAdmin={isAdmin} uid={uid} onOpenClient={(id) => actions.openClientSheet(id)} />
          ) : (
            <PaymentsTable deals={list} pays={payments.data ?? []} onOpenClient={(id) => actions.openClientSheet(id)} />
          )}
        </motion.section>

        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Info className="size-3.5" />
          Consultation uniquement : la saisie des ventes et des encaissements reste dans l'outil actuel, qui calcule les commissions.
        </p>
      </motion.div>
    </div>
  )
}

function Kpi({ icon: Icon, label, value, format, loading }: { icon: typeof Coins; label: string; value: number; format: (n: number) => string; loading: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="size-3.5" /> {label}
      </p>
      {loading ? <Skeleton className="mt-2.5 h-7 w-24" /> : <AnimatedNumber value={value} format={format} className="mt-2 block text-2xl leading-none font-semibold tracking-tight" />}
    </div>
  )
}

function DealDetail({ deal: d, pays, coms, isAdmin }: { deal: Deal; pays: SupplierPayment[]; coms: Commission[]; isAdmin: boolean }) {
  return (
    <div className="grid gap-6 px-10 py-4 md:grid-cols-2">
      <div>
        <h4 className="mb-2 text-xs font-medium text-muted-foreground">Contrat</h4>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[13px]">
          <dt className="text-muted-foreground">Offre</dt>
          <dd className="truncate">{d.contract_name ?? '—'}</dd>
          <dt className="text-muted-foreground">Début</dt>
          <dd>{formatDay(d.starts_on)}</dd>
          <dt className="text-muted-foreground">Fin</dt>
          <dd>{formatDay(d.ends_on)}</dd>
        </dl>
        {isAdmin && (
          <>
            <h4 className="mt-4 mb-2 text-xs font-medium text-muted-foreground">Paiements fournisseur</h4>
            {!pays.length ? (
              <p className="text-[13px] text-muted-foreground">Aucun échéancier.</p>
            ) : (
              <ul className="space-y-1.5 text-[13px]">
                {pays.map((p) => (
                  <li key={p.id} className="flex items-center gap-3">
                    <StateBadge state={collectState([p])} />
                    <span className="min-w-0 flex-1 truncate">{p.label ?? `Paiement ${p.payment_number}`}</span>
                    <span className="tabular text-muted-foreground">{p.received_date ? formatDay(p.received_date, { day: 'numeric', month: 'short' }) : p.expected_date ? formatDay(p.expected_date, { day: 'numeric', month: 'short' }) : ''}</span>
                    <span className="tabular w-24 text-right font-medium">{eur2(p.amount_expected)}</span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
      <div>
        <h4 className="mb-2 text-xs font-medium text-muted-foreground">{isAdmin ? 'Répartition de la commission' : 'Ma commission'}</h4>
        {!coms.length ? (
          <p className="text-[13px] text-muted-foreground">Pas encore calculée.</p>
        ) : (
          <ul className="space-y-1.5 text-[13px]">
            {coms.map((c) => (
              <li key={c.id} className="flex items-center gap-3">
                <span className="min-w-0 flex-1 truncate">
                  {c.person_name} <span className="text-xs text-muted-foreground">· {ROLE_LABEL[c.role] ?? c.role}</span>
                </span>
                <span className={cn('text-[11px]', (c.paid_amount ?? 0) > 0 ? 'text-stage-signe' : 'text-muted-foreground')}>{(c.paid_amount ?? 0) > 0 ? `versé ${eur2(c.paid_amount)}` : 'non versé'}</span>
                <span className="tabular w-24 text-right font-medium">{eur2(c.theoretical_amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function CommissionsTable({ deals, coms, isAdmin, uid, onOpenClient }: { deals: Deal[]; coms: Commission[]; isAdmin: boolean; uid?: string; onOpenClient: (id: string) => void }) {
  const ids = new Map(deals.map((d) => [d.id, d]))
  const rows = coms.filter((c) => ids.has(c.deal_id) && (isAdmin || c.person_id === uid))

  if (isAdmin) {
    const people = new Map<string, { name: string; role: string; theo: number; payable: number; paid: number; n: number }>()
    for (const c of rows) {
      const key = `${c.person_name}|${c.role}`
      const e = people.get(key) ?? { name: c.person_name ?? '—', role: c.role, theo: 0, payable: 0, paid: 0, n: 0 }
      e.theo += c.theoretical_amount ?? 0
      e.payable += c.payable_amount ?? 0
      e.paid += c.paid_amount ?? 0
      e.n++
      people.set(key, e)
    }
    const list = [...people.values()].sort((a, b) => b.theo - a.theo)
    const max = Math.max(...list.map((p) => p.theo), 1)
    if (!list.length) return <EmptyState icon={Coins} title="Aucune commission" description="Rien sur cette période." />
    return (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-[13px]">
          <thead>
            <tr className="border-b border-border bg-subtle text-left text-[11px] text-muted-foreground">
              <th className="py-2.5 pr-3 pl-4 font-medium">Bénéficiaire</th>
              <th className="py-2.5 pr-3 text-right font-medium">Ventes</th>
              <th className="w-[30%] py-2.5 pr-3 font-medium">Théorique</th>
              <th className="py-2.5 pr-3 text-right font-medium">Versé</th>
              <th className="py-2.5 pr-4 text-right font-medium">Reste à verser</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {list.map((p) => (
              <tr key={p.name + p.role}>
                <td className="py-2.5 pr-3 pl-4">
                  <span className="font-medium">{p.name}</span> <span className="text-xs text-muted-foreground">· {ROLE_LABEL[p.role] ?? p.role}</span>
                </td>
                <td className="tabular py-2.5 pr-3 text-right text-muted-foreground">{p.n}</td>
                <td className="py-2.5 pr-3">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                      <motion.div className="h-full rounded-full bg-primary" initial={{ width: 0 }} animate={{ width: `${(p.theo / max) * 100}%` }} transition={spring.gentle} />
                    </div>
                    <span className="tabular w-20 text-right font-medium">{eur(p.theo)}</span>
                  </div>
                </td>
                <td className="tabular py-2.5 pr-3 text-right text-muted-foreground">{eur(p.paid)}</td>
                <td className="tabular py-2.5 pr-4 text-right font-medium">{eur(Math.max(0, p.theo - p.paid))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  if (!rows.length) return <EmptyState icon={Coins} title="Aucune commission" description="Tes commissions apparaîtront ici dès ta première vente." />
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-[13px]">
        <thead>
          <tr className="border-b border-border bg-subtle text-left text-[11px] text-muted-foreground">
            <th className="py-2.5 pr-3 pl-4 font-medium">Vente</th>
            <th className="py-2.5 pr-3 font-medium">Signée le</th>
            <th className="py-2.5 pr-3 font-medium">Statut</th>
            <th className="py-2.5 pr-4 text-right font-medium">Montant</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((c) => {
            const d = ids.get(c.deal_id)!
            const paid = (c.paid_amount ?? 0) >= (c.theoretical_amount ?? 0) && (c.paid_amount ?? 0) > 0
            return (
              <tr key={c.id}>
                <td className="py-2.5 pr-3 pl-4">
                  <button className="font-medium hover:underline" onClick={() => d.client_id && onOpenClient(d.client_id)}>
                    {d.company}
                  </button>
                  <span className="ml-2 text-xs text-muted-foreground">{d.supplier}</span>
                </td>
                <td className="tabular py-2.5 pr-3 text-muted-foreground">{formatDay(d.signed_on, { day: 'numeric', month: 'short', year: '2-digit' })}</td>
                <td className="py-2.5 pr-3">
                  <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset', paid ? 'bg-stage-signe/10 text-stage-signe ring-stage-signe/20' : 'bg-muted text-muted-foreground ring-border')}>
                    {paid ? <CheckCircle2 className="size-3" /> : <Clock className="size-3" />}
                    {paid ? `Versée le ${formatDay(c.paid_date, { day: 'numeric', month: 'short' })}` : 'À percevoir'}
                  </span>
                </td>
                <td className="tabular py-2.5 pr-4 text-right font-medium">{eur2(c.theoretical_amount)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function PaymentsTable({ deals, pays, onOpenClient }: { deals: Deal[]; pays: SupplierPayment[]; onOpenClient: (id: string) => void }) {
  const ids = new Map(deals.map((d) => [d.id, d]))
  const rows = pays
    .filter((p) => ids.has(p.deal_id) && p.status !== 'recu')
    .sort((a, b) => {
      const sa = collectState([a]) === 'retard' ? 0 : 1
      const sb = collectState([b]) === 'retard' ? 0 : 1
      return sa - sb || (a.expected_date ?? '9999').localeCompare(b.expected_date ?? '9999')
    })
  if (!rows.length) return <EmptyState icon={Wallet} title="Tout est encaissé" description="Aucun paiement fournisseur en attente sur cette période." />
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-[13px]">
        <thead>
          <tr className="border-b border-border bg-subtle text-left text-[11px] text-muted-foreground">
            <th className="py-2.5 pr-3 pl-4 font-medium">Statut</th>
            <th className="py-2.5 pr-3 font-medium">Client</th>
            <th className="py-2.5 pr-3 font-medium">Échéance</th>
            <th className="py-2.5 pr-3 font-medium">Attendu le</th>
            <th className="py-2.5 pr-4 text-right font-medium">Montant</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((p) => {
            const d = ids.get(p.deal_id)!
            return (
              <tr key={p.id}>
                <td className="py-2.5 pr-3 pl-4">
                  <StateBadge state={collectState([p])} />
                </td>
                <td className="py-2.5 pr-3">
                  <button className="font-medium hover:underline" onClick={() => d.client_id && onOpenClient(d.client_id)}>
                    {d.company}
                  </button>
                  <span className="ml-2 text-xs text-muted-foreground">{d.supplier}</span>
                </td>
                <td className="py-2.5 pr-3 text-muted-foreground">{p.label ?? `Paiement ${p.payment_number}`}</td>
                <td className="tabular py-2.5 pr-3 text-muted-foreground">{formatDay(p.expected_date)}</td>
                <td className="tabular py-2.5 pr-4 text-right font-medium">{eur2(Math.max(0, (p.amount_expected ?? 0) - (p.amount_received ?? 0)))}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
