import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { motion } from 'motion/react'
import { ArrowDownRight, ArrowUpRight, CalendarClock, CalendarDays, ChevronRight, Coins, FileSignature, Flame, Hourglass, Minus, Table2, Users, Wallet, Zap } from 'lucide-react'
import type { Client, StageId } from '@/lib/types'
import { STAGES, stageOf } from '@/lib/stages'
import { daysFromToday, formatDay, formatEur, formatRelativeDay } from '@/lib/format'
import { inRange, last12Months, PERIOD_COMPARE, PERIOD_LABEL, periodRanges, type Period } from '@/lib/periods'
import { fadeUp, stagger } from '@/lib/motion'
import { cn } from '@/lib/utils'
import { EmptyState } from '@/components/ui/empty-state'
import { Segmented } from '@/components/ui/segmented'
import { Skeleton } from '@/components/ui/skeleton'
import { AnimatedNumber } from '@/components/charts/animated-number'
import { BarList } from '@/components/charts/bar-list'
import { ColumnChart } from '@/components/charts/column-chart'
import { Sparkline } from '@/components/charts/sparkline'
import { StageDot } from '@/components/app/stage-badge'
import { useAuth } from '@/features/auth/auth-context'
import { useClients, useProfiles, useStageDelays } from '@/features/clients/api'
import { useOpenTasks } from '@/features/tasks/api'
import { useCommissions, useDeals, useRenewals, useSupplierPayments } from './api'

const eur0 = (n: number) => formatEur(Math.round(n))
const int = (n: number) => String(Math.round(n))
const ACTIVE: StageId[] = ['prospect', 'factures', 'acd', 'offre']

export function DashboardPage() {
  const { profile, isAdmin, session } = useAuth()
  const uid = session?.user.id
  const [period, setPeriod] = useState<Period>('month')
  const clients = useClients()
  const deals = useDeals()
  const commissions = useCommissions()
  const payments = useSupplierPayments()
  const renewals = useRenewals()
  const tasks = useOpenTasks()
  const delays = useStageDelays()
  const profiles = useProfiles(isAdmin)
  const navigate = useNavigate()

  const loading = clients.isPending || deals.isPending || commissions.isPending
  const months = useMemo(() => last12Months(), [])
  const ranges = useMemo(() => periodRanges(period), [period])
  // Horloge figée au montage : rendu pur, valeurs stables entre deux rendus
  const [now] = useState(() => new Date())
  const year = now.getFullYear()

  const m = useMemo(() => {
    const dealList = deals.data ?? []
    const dealById = new Map(dealList.map((d) => [d.id, d]))
    const myComs = (commissions.data ?? []).filter((c) => c.person_id === uid)
    // Admin : commission brute DMS par vente. Commercial : sa propre part.
    const earnings = isAdmin
      ? dealList.map((d) => ({ day: d.signed_on, amount: d.commission_total_ht ?? 0 }))
      : myComs.map((c) => ({ day: dealById.get(c.deal_id)?.signed_on ?? null, amount: c.theoretical_amount ?? 0 }))

    const sum = (rows: { day: string | null; amount: number }[], r: readonly [string, string]) => rows.filter((x) => inRange(x.day, r)).reduce((a, x) => a + x.amount, 0)
    const count = (r: readonly [string, string]) => dealList.filter((d) => inRange(d.signed_on, r)).length

    const monthly = months.map((mo) => ({
      ...mo,
      amount: earnings.filter((e) => e.day?.startsWith(mo.key)).reduce((a, e) => a + e.amount, 0),
      deals: dealList.filter((d) => d.signed_on?.startsWith(mo.key)).length,
    }))

    const cl = clients.data ?? []
    const active = cl.filter((c) => ACTIVE.includes(c.stage))
    const stalling = active
      .map((c) => ({ client: c, days: Math.max(0, -daysFromToday(c.stage_changed_at.slice(0, 10))), limit: delays.data?.[c.stage] }))
      .filter((x) => x.limit != null && x.days > x.limit)
      .sort((a, b) => b.days - b.limit! - (a.days - a.limit!))

    const pending = (payments.data ?? []).filter((p) => p.status !== 'recu')
    const toCollect = pending.reduce((a, p) => a + Math.max(0, (p.amount_expected ?? 0) - (p.amount_received ?? 0)), 0)
    const late = pending.filter((p) => p.status === 'en_retard' || (p.expected_date && daysFromToday(p.expected_date) < 0)).reduce((a, p) => a + Math.max(0, (p.amount_expected ?? 0) - (p.amount_received ?? 0)), 0)
    const myToReceive = myComs.reduce((a, c) => a + Math.max(0, (c.theoretical_amount ?? 0) - (c.paid_amount ?? 0)), 0)

    const suppliers = new Map<string, number>()
    for (const d of dealList) if (inRange(d.signed_on, [`${year}-01-01`, '9999-12-31']) && d.supplier) suppliers.set(d.supplier, (suppliers.get(d.supplier) ?? 0) + 1)

    return {
      earnings: { current: sum(earnings, ranges.thisPeriod), previous: sum(earnings, ranges.lastPeriod) },
      signed: { current: count(ranges.thisPeriod), previous: count(ranges.lastPeriod) },
      monthly,
      active,
      stalling,
      byStage: STAGES.map((s) => ({ stage: s, count: cl.filter((c) => c.stage === s.id).length })),
      toCollect,
      late,
      myToReceive,
      suppliers: [...suppliers.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6),
      lastDeals: dealList.slice(0, 5),
      clientById: new Map(cl.map((c) => [c.id, c])),
    }
  }, [deals.data, commissions.data, clients.data, payments.data, delays.data, months, ranges, isAdmin, uid, year])

  const team = useMemo(() => {
    if (!isAdmin) return []
    const monthRange = ranges.thisPeriod
    return (profiles.data ?? [])
      .filter((p) => p.role === 'commercial')
      .map((p) => ({
        profile: p,
        active: (clients.data ?? []).filter((c) => c.owner_id === p.id && ACTIVE.includes(c.stage)).length,
        signed: (deals.data ?? []).filter((d) => d.commercial_id === p.id && inRange(d.signed_on, monthRange)).length,
        commission: (commissions.data ?? [])
          .filter((c) => c.person_id === p.id && inRange((deals.data ?? []).find((d) => d.id === c.deal_id)?.signed_on, monthRange))
          .reduce((a, c) => a + (c.theoretical_amount ?? 0), 0),
      }))
      .sort((a, b) => b.commission - a.commission)
  }, [isAdmin, profiles.data, clients.data, deals.data, commissions.data, ranges])

  const firstName = (profile?.full_name ?? '').split(' ')[0]
  const hour = now.getHours()
  const greeting = hour < 5 ? 'Bonne nuit' : hour < 18 ? 'Bonjour' : 'Bonsoir'
  const todayTasks = (tasks.data ?? []).filter((t) => daysFromToday(t.due_date) <= 0)

  return (
    <div className="h-full overflow-y-auto">
      <motion.div variants={stagger(0.04)} initial="hidden" animate="show" className="mx-auto w-full max-w-7xl space-y-5 px-4 py-6 sm:px-6 lg:py-8">
        <motion.header variants={fadeUp} className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground first-letter:uppercase">{now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
            <h1 className="mt-0.5 text-2xl font-semibold tracking-tight">
              {greeting}
              {firstName && firstName !== 'DMS' ? `, ${firstName}` : ''}
            </h1>
          </div>
          <Segmented
            layoutId="dash-period"
            size="sm"
            value={period}
            onChange={setPeriod}
            options={(['month', 'quarter', 'year'] as Period[]).map((p) => ({ value: p, label: PERIOD_LABEL[p] }))}
          />
        </motion.header>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-12">
          {/* Héro */}
          <Card className="sm:col-span-2 lg:col-span-6 lg:row-span-2" loading={loading}>
            <div className="flex h-full flex-col">
              <CardLabel icon={Coins}>{isAdmin ? 'Commissions signées' : 'Mes commissions'}</CardLabel>
              <div className="mt-3 flex flex-wrap items-end gap-x-4 gap-y-2">
                <AnimatedNumber value={m.earnings.current} format={eur0} className="text-5xl leading-none font-semibold tracking-tight" />
                <Delta current={m.earnings.current} previous={m.earnings.previous} label={PERIOD_COMPARE[period]} />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {PERIOD_LABEL[period]} · {isAdmin ? 'commission HT totale des ventes' : 'ta part sur les ventes signées'}
              </p>
              <div className="mt-auto pt-6">
                <Sparkline values={m.monthly.map((x) => x.amount)} height={72} label="Évolution sur 12 mois" />
                <div className="mt-1.5 flex justify-between text-[10px] text-muted-foreground">
                  <span>{m.monthly[0]?.long}</span>
                  <span>{m.monthly.at(-1)?.long}</span>
                </div>
              </div>
            </div>
          </Card>

          <Card className="lg:col-span-3" loading={loading}>
            <CardLabel icon={FileSignature}>Contrats signés</CardLabel>
            <div className="mt-3 flex items-end justify-between gap-3">
              <AnimatedNumber value={m.signed.current} format={int} className="text-3xl leading-none font-semibold tracking-tight" />
              <Delta current={m.signed.current} previous={m.signed.previous} label="" compact />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{PERIOD_COMPARE[period]} : {m.signed.previous}</p>
          </Card>

          <Card className="lg:col-span-3" loading={loading}>
            <CardLabel icon={Flame}>Dossiers en cours</CardLabel>
            <div className="mt-3 flex items-end justify-between gap-3">
              <AnimatedNumber value={m.active.length} format={int} className="text-3xl leading-none font-semibold tracking-tight" />
              {m.stalling.length > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-stage-offre/10 px-2 py-0.5 text-xs font-medium text-stage-offre ring-1 ring-stage-offre/20 ring-inset">
                  <Hourglass className="size-3" /> {m.stalling.length} stagnent
                </span>
              )}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Nouveau → Offre placée</p>
          </Card>

          <Card className="sm:col-span-2 lg:col-span-6" loading={loading || payments.isPending}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <CardLabel icon={Wallet}>{isAdmin ? 'À encaisser des fournisseurs' : 'Mes commissions à percevoir'}</CardLabel>
                <AnimatedNumber value={isAdmin ? m.toCollect : m.myToReceive} format={eur0} className="mt-3 block text-3xl leading-none font-semibold tracking-tight" />
                <p className="mt-2 text-xs text-muted-foreground">{isAdmin ? 'Paiements attendus non reçus, toutes ventes' : 'Total théorique non encore versé'}</p>
              </div>
              {isAdmin && m.late > 0 && (
                <div className="rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-2 text-right">
                  <p className="text-[11px] font-medium text-destructive">En retard</p>
                  <p className="text-base font-semibold">{eur0(m.late)}</p>
                </div>
              )}
            </div>
          </Card>

          {/* Revenus par mois */}
          <Card className="sm:col-span-2 lg:col-span-7" loading={loading}>
            <MonthlyChart monthly={m.monthly} isAdmin={isAdmin} />
          </Card>

          {/* Entonnoir */}
          <Card className="sm:col-span-2 lg:col-span-5" loading={clients.isPending}>
            <div className="mb-4 flex items-center justify-between">
              <CardLabel icon={Zap}>Pipeline</CardLabel>
              <Link to="/clients" className="text-xs text-muted-foreground hover:text-foreground">
                Voir les dossiers →
              </Link>
            </div>
            <BarList
              items={m.byStage.map(({ stage, count }) => ({
                key: stage.id,
                value: count,
                label: (
                  <>
                    <span className={cn('size-2 shrink-0 rounded-full', stage.dot)} />
                    <span className="truncate">{stage.label}</span>
                  </>
                ),
                onClick: () => navigate('/clients'),
              }))}
            />
          </Card>

          {/* À relancer */}
          <Card className="lg:col-span-4" loading={clients.isPending}>
            <ListHeader icon={Hourglass} title="Dossiers qui stagnent" count={m.stalling.length} />
            {!m.stalling.length ? (
              <EmptyState compact icon={Hourglass} title="Tout avance" description="Aucun dossier ne dépasse son délai d'étape." />
            ) : (
              <ul className="-mx-2">
                {m.stalling.slice(0, 6).map(({ client, days, limit }) => (
                  <ClientLine key={client.id} client={client} right={<span className="tabular text-xs font-medium text-stage-offre">+{days - limit!} j</span>} />
                ))}
              </ul>
            )}
          </Card>

          {/* Renouvellements */}
          <Card className="lg:col-span-4" loading={renewals.isPending || clients.isPending}>
            <ListHeader icon={CalendarClock} title="Fins de contrat · 6 mois" count={renewals.data?.length ?? 0} />
            {!renewals.data?.length ? (
              <EmptyState compact icon={CalendarClock} title="Aucune échéance" description="Pas de fin de contrat dans les 6 prochains mois." />
            ) : (
              <ul className="-mx-2">
                {renewals.data.slice(0, 6).map((r) => {
                  const c = m.clientById.get(r.client_id)
                  if (!c) return null
                  const d = daysFromToday(r.contract_end_date)
                  return (
                    <ClientLine
                      key={r.id}
                      client={c}
                      sub={[r.supplier, r.label].filter(Boolean).join(' · ') || (r.energy === 'gaz' ? 'Gaz' : 'Électricité')}
                      right={<span className={cn('text-xs font-medium whitespace-nowrap', d <= 90 ? 'text-destructive' : 'text-muted-foreground')}>{formatRelativeDay(r.contract_end_date)}</span>}
                    />
                  )
                })}
              </ul>
            )}
          </Card>

          {/* Aujourd'hui */}
          <Card className="sm:col-span-2 lg:col-span-4" loading={tasks.isPending}>
            <ListHeader icon={CalendarDays} title="À faire aujourd'hui" count={todayTasks.length} to="/agenda" />
            {!todayTasks.length ? (
              <EmptyState compact icon={CalendarDays} title="Journée dégagée" description="Aucune action en retard ni prévue aujourd'hui." />
            ) : (
              <ul className="-mx-2">
                {todayTasks.slice(0, 6).map((t) => (
                  <li key={t.id}>
                    <Link to={t.client_id ? `/clients/${t.client_id}` : '/agenda'} className="flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-accent/60">
                      <span className={cn('size-1.5 shrink-0 rounded-full', daysFromToday(t.due_date) < 0 ? 'bg-destructive' : 'bg-stage-offre')} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium">{t.title}</span>
                        <span className="block truncate text-[11px] text-muted-foreground">{t.crm_clients?.company ?? '—'}</span>
                      </span>
                      <span className={cn('text-[11px] whitespace-nowrap', daysFromToday(t.due_date) < 0 ? 'text-destructive' : 'text-muted-foreground')}>
                        {daysFromToday(t.due_date) < 0 ? formatRelativeDay(t.due_date) : (t.due_time?.slice(0, 5) ?? "aujourd'hui")}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Équipe (admin) ou dernières ventes */}
          {isAdmin ? (
            <Card className="sm:col-span-2 lg:col-span-8" loading={loading || profiles.isPending}>
              <ListHeader icon={Users} title={`Équipe · ${PERIOD_LABEL[period].toLowerCase()}`} />
              <div className="-mx-1 overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="text-left text-[11px] text-muted-foreground">
                      <th className="px-1 pb-2 font-medium">Commercial</th>
                      <th className="px-1 pb-2 text-right font-medium">Dossiers en cours</th>
                      <th className="px-1 pb-2 text-right font-medium">Signés</th>
                      <th className="px-1 pb-2 text-right font-medium">Commission</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {team.map((row) => (
                      <tr key={row.profile.id}>
                        <td className="px-1 py-2.5 font-medium">{row.profile.full_name}</td>
                        <td className="tabular px-1 py-2.5 text-right text-muted-foreground">{row.active}</td>
                        <td className="tabular px-1 py-2.5 text-right">{row.signed}</td>
                        <td className="tabular px-1 py-2.5 text-right font-medium">{eur0(row.commission)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : (
            <Card className="sm:col-span-2 lg:col-span-8" loading={deals.isPending}>
              <ListHeader icon={FileSignature} title="Dernières ventes" />
              {!m.lastDeals.length ? (
                <EmptyState compact icon={FileSignature} title="Pas encore de vente" description="Tes contrats signés apparaîtront ici." />
              ) : (
                <ul className="-mx-2">
                  {m.lastDeals.map((d) => (
                    <li key={d.id}>
                      <Link to={d.client_id ? `/clients/${d.client_id}` : '#'} className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-accent/60">
                        <StageDot stage="signe" />
                        <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{d.company}</span>
                        <span className="text-xs text-muted-foreground">{d.supplier}</span>
                        <span className="tabular w-20 text-right text-xs text-muted-foreground">{formatDay(d.signed_on, { day: 'numeric', month: 'short' })}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}

          <Card className="sm:col-span-2 lg:col-span-4" loading={deals.isPending}>
            <ListHeader icon={Zap} title={`Fournisseurs placés · ${year}`} />
            {!m.suppliers.length ? (
              <EmptyState compact icon={Zap} title="Aucune vente cette année" />
            ) : (
              <BarList items={m.suppliers.map(([name, n]) => ({ key: name, label: name, value: n, display: `${n} vente${n > 1 ? 's' : ''}` }))} />
            )}
          </Card>
        </div>
      </motion.div>
    </div>
  )
}

function MonthlyChart({ monthly, isAdmin }: { monthly: { key: string; label: string; long: string; amount: number; deals: number }[]; isAdmin: boolean }) {
  const [table, setTable] = useState(false)
  const total = monthly.reduce((a, x) => a + x.amount, 0)
  return (
    <>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <CardLabel icon={Coins}>{isAdmin ? 'Commissions par mois' : 'Mes commissions par mois'}</CardLabel>
          <p className="mt-1 text-xs text-muted-foreground">12 derniers mois · {eur0(total)} au total</p>
        </div>
        <button onClick={() => setTable((v) => !v)} className={cn('flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors', table ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground')} aria-pressed={table}>
          <Table2 className="size-3.5" /> Données
        </button>
      </div>
      {table ? (
        <div className="max-h-[200px] overflow-y-auto">
          <table className="w-full text-[13px]">
            <thead className="sticky top-0 bg-card text-left text-[11px] text-muted-foreground">
              <tr>
                <th className="pb-1.5 font-medium">Mois</th>
                <th className="pb-1.5 text-right font-medium">Ventes</th>
                <th className="pb-1.5 text-right font-medium">Commission</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[...monthly].reverse().map((x) => (
                <tr key={x.key}>
                  <td className="py-1.5 first-letter:uppercase">{x.long}</td>
                  <td className="tabular py-1.5 text-right text-muted-foreground">{x.deals}</td>
                  <td className="tabular py-1.5 text-right font-medium">{eur0(x.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <ColumnChart
          data={monthly.map((x) => ({ key: x.key, label: x.label, title: x.long, value: x.amount, detail: `${x.deals} vente${x.deals > 1 ? 's' : ''}` }))}
          format={eur0}
          valueLabel="commission"
        />
      )}
    </>
  )
}

function Card({ className, loading, children }: { className?: string; loading?: boolean; children: React.ReactNode }) {
  return (
    <motion.section variants={fadeUp} className={cn('relative overflow-hidden rounded-xl border border-border bg-card p-5 shadow-xs', className)}>
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-3 w-24" />
        </div>
      ) : (
        children
      )}
    </motion.section>
  )
}

function CardLabel({ icon: Icon, children }: { icon: typeof Coins; children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground">
      <Icon className="size-3.5" />
      {children}
    </p>
  )
}

function ListHeader({ icon, title, count, to }: { icon: typeof Coins; title: string; count?: number; to?: string }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <CardLabel icon={icon}>
        {title}
        {count != null && <span className="tabular font-normal text-muted-foreground/70">{count}</span>}
      </CardLabel>
      {to && (
        <Link to={to} className="text-xs text-muted-foreground hover:text-foreground">
          Tout voir →
        </Link>
      )}
    </div>
  )
}

function ClientLine({ client, sub, right }: { client: Client; sub?: string; right: React.ReactNode }) {
  return (
    <li>
      <Link to={`/clients/${client.id}`} className="group flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-accent/60">
        <StageDot stage={client.stage} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-medium">{client.company || 'Sans nom'}</span>
          <span className="block truncate text-[11px] text-muted-foreground">{sub ?? stageOf(client.stage).label}</span>
        </span>
        {right}
        <ChevronRight className="size-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      </Link>
    </li>
  )
}

function Delta({ current, previous, label, compact }: { current: number; previous: number; label: string; compact?: boolean }) {
  if (!previous && !current) return null
  const pct = previous ? ((current - previous) / previous) * 100 : 100
  const up = current > previous
  const flat = Math.abs(pct) < 0.5
  const Icon = flat ? Minus : up ? ArrowUpRight : ArrowDownRight
  return (
    <span
      className={cn(
        'mb-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
        flat ? 'bg-muted text-muted-foreground ring-border' : up ? 'bg-stage-signe/10 text-stage-signe ring-stage-signe/20' : 'bg-destructive/10 text-destructive ring-destructive/20',
      )}
      title={label}
    >
      <Icon className="size-3" />
      {previous ? `${up ? '+' : ''}${Math.round(pct)} %` : 'nouveau'}
      {!compact && label && <span className="font-normal opacity-70">{label}</span>}
    </span>
  )
}
