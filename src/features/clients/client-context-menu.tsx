import { useState } from 'react'
import { useNavigate } from 'react-router'
import { ArrowRightLeft, Copy, ExternalLink, Mail, PanelRight, Pencil, Phone, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { Client, StageId } from '@/lib/types'
import { STAGES } from '@/lib/stages'
import { cn } from '@/lib/utils'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import { ConfirmDialog } from '@/components/app/confirm-dialog'
import { useAppActions } from '@/app/app-context'
import { useDeleteClient } from './api'
import { useStageChange } from './use-stage-change'

/** Clic droit sur un dossier : aperçu, fiche, étape, contact, suppression. */
export function ClientContextMenu({ client: c, children, hidePreview }: { client: Client; children: React.ReactNode; hidePreview?: boolean }) {
  const navigate = useNavigate()
  const actions = useAppActions()
  const changeStage = useStageChange()
  const del = useDeleteClient()
  const [confirm, setConfirm] = useState(false)

  const copy = (value: string, label: string) => navigator.clipboard.writeText(value).then(() => toast.success(`${label} copié`, { description: value }))

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
        <ContextMenuContent className="w-60">
          <ContextMenuLabel>{c.company || 'Sans nom'}</ContextMenuLabel>
          {!hidePreview && (
            <ContextMenuItem onSelect={() => actions.openClientSheet(c.id)}>
              <PanelRight /> Aperçu rapide
              <ContextMenuShortcut>↵</ContextMenuShortcut>
            </ContextMenuItem>
          )}
          <ContextMenuItem onSelect={() => navigate(`/clients/${c.id}`)}>
            <ExternalLink /> Ouvrir la fiche
          </ContextMenuItem>
          <ContextMenuItem onSelect={() => actions.openClientForm(c)}>
            <Pencil /> Modifier
            <ContextMenuShortcut>E</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuSub>
            <ContextMenuSubTrigger>
              <ArrowRightLeft /> Déplacer vers
            </ContextMenuSubTrigger>
            <ContextMenuSubContent className="w-64">
              <ContextMenuRadioGroup value={c.stage} onValueChange={(v) => changeStage(c, v as StageId)}>
                {STAGES.map((s) => (
                  <ContextMenuRadioItem key={s.id} value={s.id}>
                    <span className={cn('size-2 rounded-full', s.dot)} />
                    {s.label}
                  </ContextMenuRadioItem>
                ))}
              </ContextMenuRadioGroup>
            </ContextMenuSubContent>
          </ContextMenuSub>
          {(c.email || c.phone) && <ContextMenuSeparator />}
          {c.email && (
            <>
              <ContextMenuItem onSelect={() => window.location.assign(`mailto:${c.email}`)}>
                <Mail /> Écrire un email
              </ContextMenuItem>
              <ContextMenuItem onSelect={() => copy(c.email!, 'Email')}>
                <Copy /> Copier l'email
              </ContextMenuItem>
            </>
          )}
          {c.phone && (
            <ContextMenuItem onSelect={() => copy(c.phone!, 'Téléphone')}>
              <Phone /> Copier le téléphone
            </ContextMenuItem>
          )}
          <ContextMenuSeparator />
          <ContextMenuItem variant="destructive" onSelect={() => setConfirm(true)}>
            <Trash2 /> Supprimer
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title={`Supprimer ${c.company ?? 'ce dossier'} ?`}
        description="Le client, ses sites, actions, notes et documents seront supprimés définitivement."
        confirmLabel="Supprimer définitivement"
        onConfirm={() =>
          del.mutate(c.id, {
            onSuccess: () => toast.success('Dossier supprimé', { description: c.company ?? undefined }),
            onError: (e) => toast.error('Suppression impossible', { description: e.message }),
          })
        }
      />
    </>
  )
}
