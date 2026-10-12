import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { CalendarClock, Flame, MapPin, MoreHorizontal, Pencil, Plus, Trash2, Zap } from 'lucide-react'
import { toast } from 'sonner'
import type { Site } from '@/lib/types'
import { daysFromToday, formatDay, formatEur, formatNumber, formatPrice, formatRelativeDay } from '@/lib/format'
import { spring } from '@/lib/motion'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDialog } from '@/components/app/confirm-dialog'
import { useDeleteSite, useSites } from '@/features/clients/api'
import { SiteFormDialog } from './site-form-dialog'

const CONTRACT_LABEL: Record<string, string> = { base: 'Base', hphc: 'HP / HC', '4plages': '4 plages' }

export function SiteList({ clientId }: { clientId: string }) {
  const { data: sites, isLoading } = useSites(clientId)
  const del = useDeleteSite()
  const [editing, setEditing] = useState<Site | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [toDelete, setToDelete] = useState<Site | null>(null)

  const openForm = (site: Site | null) => {
    setEditing(site)
    setFormOpen(true)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold tracking-tight">
          Sites <span className="tabular font-normal text-muted-foreground">{sites?.length ?? ''}</span>
        </h3>
        <Button size="xs" variant="ghost" className="text-foreground" onClick={() => openForm(null)}>
          <Plus /> Ajouter un site
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-3 @2xl:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className="space-y-3 rounded-xl border border-border bg-card p-4">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-1/3" />
              <div className="grid grid-cols-3 gap-2 pt-2">
                <Skeleton className="h-8" />
                <Skeleton className="h-8" />
                <Skeleton className="h-8" />
              </div>
            </div>
          ))}
        </div>
      ) : !sites?.length ? (
        <div className="rounded-xl border border-dashed border-border">
          <EmptyState
            compact
            icon={MapPin}
            title="Aucun site renseigné"
            description="Ajoute le point de livraison et le contrat actuel pour préparer la cotation."
            action={<Button size="sm" variant="outline" onClick={() => openForm(null)}><Plus /> Ajouter un site</Button>}
          />
        </div>
      ) : (
        <motion.div layout className="grid gap-3 @2xl:grid-cols-2">
          <AnimatePresence initial={false}>
            {sites.map((s) => (
              <SiteCard key={s.id} site={s} onEdit={() => openForm(s)} onDelete={() => setToDelete(s)} />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      <SiteFormDialog open={formOpen} onOpenChange={setFormOpen} clientId={clientId} site={editing} />
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Supprimer ce site ?"
        description={`Le site « ${toDelete?.label || toDelete?.point_id || 'sans nom'} » et sa grille tarifaire seront supprimés.`}
        onConfirm={() =>
          toDelete &&
          del.mutate(toDelete, {
            onSuccess: () => toast.success('Site supprimé'),
            onError: (e) => toast.error('Suppression impossible', { description: e.message }),
          })
        }
      />
    </div>
  )
}

function SiteCard({ site: s, onEdit, onDelete }: { site: Site; onEdit: () => void; onDelete: () => void }) {
  const Icon = s.energy === 'gaz' ? Flame : Zap
  const endIn = s.contract_end_date ? daysFromToday(s.contract_end_date) : null
  const endTone = endIn == null ? '' : endIn < 0 ? 'text-muted-foreground' : endIn <= 90 ? 'text-destructive' : endIn <= 180 ? 'text-stage-offre' : 'text-muted-foreground'
  const prices: [string, number | null][] =
    s.contract_type === 'hphc'
      ? [['HP', s.price_hp], ['HC', s.price_hc]]
      : s.contract_type === '4plages'
        ? [['HPH', s.price_hph], ['HCH', s.price_hch], ['HPE', s.price_hpe], ['HCE', s.price_hce]]
        : s.contract_type === 'base'
          ? [['Base', s.price_base]]
          : []

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={spring.smooth}
      onDoubleClick={onEdit}
      className="group relative rounded-xl border border-border bg-card p-4 shadow-xs transition-shadow hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className={cn('flex size-8 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset', s.energy === 'gaz' ? 'bg-stage-offre/10 text-stage-offre ring-stage-offre/20' : 'bg-primary/10 text-primary ring-primary/20')}>
            <Icon className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium leading-tight">{s.label || (s.energy === 'gaz' ? 'Site gaz' : 'Site électricité')}</p>
            <p className="tabular mt-0.5 truncate font-mono text-[11px] text-muted-foreground">{s.point_id || 'Point non renseigné'}</p>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon-xs" variant="ghost" className="opacity-60 group-hover:opacity-100" aria-label="Actions du site">
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={onEdit}>
              <Pencil /> Modifier
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={onDelete}>
              <Trash2 /> Supprimer
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-x-3 gap-y-3 text-xs">
        <Stat label="Fournisseur" value={s.supplier || '—'} />
        <Stat label="Conso / an" value={s.annual_kwh != null ? `${formatNumber(s.annual_kwh)} kWh` : '—'} />
        <Stat label={s.energy === 'elec' ? 'Segment · kVA' : 'Segment'} value={[s.segment, s.energy === 'elec' && s.subscribed_power_kva != null ? `${formatNumber(s.subscribed_power_kva)} kVA` : null].filter(Boolean).join(' · ') || '—'} />
        <Stat label="Contrat" value={s.contract_type ? CONTRACT_LABEL[s.contract_type] : '—'} />
        <Stat label="Mensualité" value={formatEur(s.current_monthly_amount)} />
        <div className="min-w-0">
          <dt className="text-muted-foreground">Fin de contrat</dt>
          <dd className={cn('mt-0.5 flex items-center gap-1 truncate font-medium', endTone)}>
            {s.contract_end_date ? (
              <>
                {endIn != null && endIn >= 0 && endIn <= 180 && <CalendarClock className="size-3 shrink-0" />}
                <span className="truncate" title={formatDay(s.contract_end_date)}>
                  {endIn != null && endIn >= 0 && endIn <= 180 ? formatRelativeDay(s.contract_end_date) : formatDay(s.contract_end_date, { month: 'short', year: 'numeric' })}
                </span>
              </>
            ) : (
              '—'
            )}
          </dd>
        </div>
      </dl>

      {prices.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5 border-t border-border pt-3">
          {prices.map(([k, v]) => (
            <span key={k} className="tabular inline-flex items-baseline gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[11px]">
              <span className="text-muted-foreground">{k}</span>
              <span className="font-medium">{formatPrice(v)}</span>
            </span>
          ))}
        </div>
      )}
    </motion.div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 truncate font-medium" title={value}>
        {value}
      </dd>
    </div>
  )
}
