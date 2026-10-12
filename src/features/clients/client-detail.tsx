import { useState } from 'react'
import { motion } from 'motion/react'
import { ArrowLeft, Building2, CalendarClock, Copy, Euro, FileText, Hourglass, Mail, MapPin, MoreHorizontal, Pencil, Phone, ScrollText, Trash2, Zap } from 'lucide-react'
import { toast } from 'sonner'
import type { Client } from '@/lib/types'
import { contactName, daysFromToday, formatDay, formatEur, formatRelativeDay } from '@/lib/format'
import { fadeUp, spring, stagger } from '@/lib/motion'
import { stageOf } from '@/lib/stages'
import { cn } from '@/lib/utils'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Segmented } from '@/components/ui/segmented'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ConfirmDialog } from '@/components/app/confirm-dialog'
import { StageMenu } from '@/components/app/stage-menu'
import { DocumentPanel } from '@/features/documents/document-panel'
import { SiteList } from '@/features/sites/site-list'
import { NextAction } from '@/features/tasks/next-action'
import { ActivityFeed } from './activity-feed'
import { useDeleteClient, useStageDelays, type SiteSummary } from './api'

type Tab = 'sites' | 'documents' | 'journal'

interface ClientDetailProps {
  client: Client
  sites: SiteSummary | undefined
  onEdit: () => void
  onDeleted: () => void
  onBack?: () => void
}

export function ClientDetail({ client: c, sites, onEdit, onDeleted, onBack }: ClientDetailProps) {
  const [tab, setTab] = useState<Tab>('sites')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const del = useDeleteClient()
  const delays = useStageDelays()
  const contact = contactName(c)

  const daysInStage = Math.max(0, -daysFromToday(c.stage_changed_at.slice(0, 10)))
  const delay = delays.data?.[c.stage]
  const stalling = delay != null && daysInStage > delay
  const endIn = sites?.nextEnd ? daysFromToday(sites.nextEnd) : null

  function copy(value: string, label: string) {
    navigator.clipboard.writeText(value).then(() => toast.success(`${label} copié`, { description: value }))
  }

  return (
    <motion.div key={c.id} variants={stagger(0.04)} initial="hidden" animate="show" className="mx-auto w-full max-w-5xl space-y-5 px-4 py-5 sm:px-6 lg:py-6">
      {/* En-tête */}
      <motion.header variants={fadeUp} className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          {onBack && (
            <Button size="icon-sm" variant="ghost" className="-ml-2 lg:hidden" onClick={onBack} aria-label="Retour à la liste">
              <ArrowLeft />
            </Button>
          )}
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border bg-card shadow-sm">
            <Building2 className="size-5 text-muted-foreground" strokeWidth={1.75} />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-xl leading-tight font-semibold tracking-tight">{c.company || 'Sans nom'}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted-foreground">
              {c.siret && (
                <button className="tabular font-mono text-xs hover:text-foreground" onClick={() => copy(c.siret!, 'SIRET')} title="Copier le SIRET">
                  {c.siret.replace(/(\d{3})(\d{3})(\d{3})(\d{5})/, '$1 $2 $3 $4')}
                </button>
              )}
              {c.siret && c.address && <span aria-hidden>·</span>}
              {c.address && (
                <span className="flex min-w-0 items-center gap-1">
                  <MapPin className="size-3 shrink-0" />
                  <span className="truncate">{c.address}</span>
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StageMenu client={c} />
          <Button size="sm" variant="outline" onClick={onEdit}>
            <Pencil /> Modifier
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon-sm" variant="outline" aria-label="Plus d'actions">
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {c.email && (
                <DropdownMenuItem onSelect={() => copy(c.email!, 'Email')}>
                  <Copy /> Copier l'email
                </DropdownMenuItem>
              )}
              {c.phone && (
                <DropdownMenuItem onSelect={() => copy(c.phone!, 'Téléphone')}>
                  <Copy /> Copier le téléphone
                </DropdownMenuItem>
              )}
              {(c.email || c.phone) && <DropdownMenuSeparator />}
              <DropdownMenuItem variant="destructive" onSelect={() => setConfirmDelete(true)}>
                <Trash2 /> Supprimer le dossier
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </motion.header>

      {/* Bento */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Tile icon={Hourglass} label="Dans l'étape" tone={stalling ? 'warn' : undefined}>
          <span className="tabular">{daysInStage === 0 ? "Aujourd'hui" : `${daysInStage} j`}</span>
          <TileSub>{stalling ? `Stagne · relance conseillée après ${delay} j` : stageOf(c.stage).label}</TileSub>
        </Tile>
        <Tile icon={Euro} label="Budget annuel">
          <span className="tabular">{formatEur(c.annual_budget)}</span>
          <TileSub>{c.acd_signed ? 'ACD signé ✓' : 'ACD non signé'}</TileSub>
        </Tile>
        <Tile icon={Zap} label={sites?.count ? `${sites.count} site${sites.count > 1 ? 's' : ''}` : 'Sites'}>
          <span className="truncate">{sites?.suppliers.join(', ') || '—'}</span>
          <TileSub>Fournisseur{(sites?.suppliers.length ?? 0) > 1 ? 's' : ''} actuel{(sites?.suppliers.length ?? 0) > 1 ? 's' : ''}</TileSub>
        </Tile>
        <Tile icon={CalendarClock} label="Fin de contrat" tone={endIn != null && endIn >= 0 && endIn <= 90 ? 'danger' : endIn != null && endIn >= 0 && endIn <= 180 ? 'warn' : undefined}>
          <span className="tabular">{sites?.nextEnd ? formatDay(sites.nextEnd, { month: 'short', year: 'numeric' }) : '—'}</span>
          <TileSub>{sites?.nextEnd ? (endIn! < 0 ? 'Échue' : formatRelativeDay(sites.nextEnd)) : 'Non renseignée'}</TileSub>
        </Tile>

        <motion.div variants={fadeUp} className="col-span-2 min-h-full">
          <NextAction clientId={c.id} />
        </motion.div>

        <motion.section variants={fadeUp} className="col-span-2 rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <Avatar name={contact || c.company} className="size-9" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{contact || 'Contact non renseigné'}</p>
              <p className="text-xs text-muted-foreground">Interlocuteur principal</p>
            </div>
          </div>
          <div className="mt-4 grid gap-1.5">
            <ContactLine icon={Mail} value={c.email} href={c.email ? `mailto:${c.email}` : undefined} />
            <ContactLine icon={Phone} value={c.phone} href={c.phone ? `tel:${c.phone.replace(/\s/g, '')}` : undefined} />
          </div>
          {(c.notes || c.lost_reason) && (
            <div className="mt-4 space-y-2 border-t border-border pt-3">
              {c.lost_reason && (
                <p className="text-xs">
                  <span className="font-medium text-stage-perdu">Perdu : </span>
                  <span className="text-muted-foreground">{c.lost_reason}</span>
                </p>
              )}
              {c.notes && <p className="line-clamp-4 text-xs leading-relaxed whitespace-pre-wrap text-muted-foreground">{c.notes}</p>}
            </div>
          )}
        </motion.section>
      </motion.div>

      {/* Onglets */}
      <motion.div variants={fadeUp} className="space-y-4 pt-1">
        <Segmented
          layoutId="detail-tabs"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'sites', label: <><Zap className="size-3.5" /> Sites & contrats</> },
            { value: 'documents', label: <><FileText className="size-3.5" /> Documents</> },
            { value: 'journal', label: <><ScrollText className="size-3.5" /> Journal</> },
          ]}
        />
        <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={spring.smooth}>
          {tab === 'sites' && <SiteList clientId={c.id} />}
          {tab === 'documents' && <DocumentPanel clientId={c.id} />}
          {tab === 'journal' && <ActivityFeed clientId={c.id} />}
        </motion.div>
      </motion.div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Supprimer ${c.company ?? 'ce dossier'} ?`}
        description="Le client, ses sites, actions, notes et documents seront supprimés définitivement. Cette action est irréversible."
        confirmLabel="Supprimer définitivement"
        onConfirm={() =>
          del.mutate(c.id, {
            onSuccess: () => {
              toast.success('Dossier supprimé', { description: c.company ?? undefined })
              onDeleted()
            },
            onError: (e) => toast.error('Suppression impossible', { description: e.message }),
          })
        }
      />
    </motion.div>
  )
}

function Tile({ icon: Icon, label, tone, children }: { icon: typeof Euro; label: string; tone?: 'warn' | 'danger'; children: React.ReactNode }) {
  return (
    <motion.div
      variants={fadeUp}
      whileHover={{ y: -2 }}
      transition={spring.snappy}
      className={cn(
        'relative overflow-hidden rounded-xl border bg-card p-4 shadow-xs transition-shadow hover:shadow-md',
        tone === 'danger' ? 'border-destructive/30' : tone === 'warn' ? 'border-stage-offre/30' : 'border-border',
      )}
    >
      {tone && <div aria-hidden className={cn('absolute inset-x-0 top-0 h-px', tone === 'danger' ? 'bg-destructive/60' : 'bg-stage-offre/60')} />}
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className={cn('size-3.5', tone === 'danger' ? 'text-destructive' : tone === 'warn' ? 'text-stage-offre' : '')} />
        {label}
      </p>
      <div className="mt-2 flex min-w-0 flex-col text-lg leading-tight font-semibold tracking-tight">{children}</div>
    </motion.div>
  )
}

function TileSub({ children }: { children: React.ReactNode }) {
  return <span className="mt-1 truncate text-xs font-normal tracking-normal text-muted-foreground">{children}</span>
}

function ContactLine({ icon: Icon, value, href }: { icon: typeof Mail; value: string | null; href?: string }) {
  if (!value) {
    return (
      <p className="flex items-center gap-2.5 px-2 py-1 text-[13px] text-muted-foreground/60">
        <Icon className="size-3.5" /> Non renseigné
      </p>
    )
  }
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <a href={href} className="flex min-w-0 items-center gap-2.5 rounded-md px-2 py-1 text-[13px] transition-colors hover:bg-accent">
          <Icon className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="truncate">{value}</span>
        </a>
      </TooltipTrigger>
      <TooltipContent side="left">{href?.startsWith('mailto') ? 'Écrire' : 'Appeler'}</TooltipContent>
    </Tooltip>
  )
}
