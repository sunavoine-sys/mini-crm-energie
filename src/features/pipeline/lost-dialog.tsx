import { useState } from 'react'
import type { Client } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

const REASONS = ['Prix', 'Fournisseur conservé', 'Injoignable', 'Pas de besoin', 'Contrat en cours trop long']

export function LostDialog({ client, onCancel, onConfirm }: { client: Client | null; onCancel: () => void; onConfirm: (reason: string | null) => void }) {
  const [reason, setReason] = useState('')
  const [forId, setForId] = useState<string | null>(null)
  if (client && client.id !== forId) {
    setForId(client.id)
    setReason(client.lost_reason ?? '')
  }

  return (
    <Dialog open={!!client} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-md">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            onConfirm(reason.trim() || null)
          }}
          className="flex flex-col"
        >
          <DialogHeader>
            <DialogTitle>Archiver {client?.company} ?</DialogTitle>
            <DialogDescription>Le dossier passe en « Perdu » et ses actions ouvertes sont clôturées.</DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-3">
            <Input autoFocus value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Raison (optionnelle)" aria-label="Raison de la perte" />
            <div className="flex flex-wrap gap-1.5">
              {REASONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setReason(r)}
                  className={cn('h-7 rounded-md px-2.5 text-xs font-medium transition-colors', reason === r ? 'bg-stage-perdu/15 text-stage-perdu' : 'bg-muted text-muted-foreground hover:text-foreground')}
                >
                  {r}
                </button>
              ))}
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel}>
              Annuler
            </Button>
            <Button type="submit" variant="destructive">
              Marquer comme perdu
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
