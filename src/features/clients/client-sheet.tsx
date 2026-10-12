import { useNavigate } from 'react-router'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { useAppActions } from '@/app/app-context'
import { useClients, useSitesIndex } from './api'
import { ClientDetail } from './client-detail'

/** Fiche client en panneau latéral : consulter/éditer sans quitter la vue. */
export function ClientSheet({ clientId, onClose }: { clientId: string | null; onClose: () => void }) {
  const navigate = useNavigate()
  const actions = useAppActions()
  const { data: clients } = useClients()
  const sites = useSitesIndex()
  const client = clientId ? clients?.find((c) => c.id === clientId) : undefined

  return (
    <Sheet open={!!clientId} onOpenChange={(o) => !o && onClose()}>
      <SheetContent data-hotkeys side="right" className="w-[min(100vw,680px)] overflow-y-auto p-0" overlayClassName="bg-black/15 backdrop-blur-0 dark:bg-black/35" hideClose>
        <SheetTitle className="sr-only">{client?.company ?? 'Dossier client'}</SheetTitle>
        <SheetDescription className="sr-only">Aperçu du dossier</SheetDescription>
        {client && (
          <ClientDetail
            key={client.id}
            client={client}
            sites={sites.data?.get(client.id)}
            onEdit={() => actions.openClientForm(client)}
            onDeleted={onClose}
            onExpand={() => {
              onClose()
              navigate(`/clients/${client.id}`)
            }}
          />
        )}
      </SheetContent>
    </Sheet>
  )
}
