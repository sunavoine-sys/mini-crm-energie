import { toast } from 'sonner'
import type { Client, StageId } from '@/lib/types'
import { stageOf } from '@/lib/stages'
import { useUpdateStage } from './api'

export const STAGE_CELEBRATION: Partial<Record<StageId, string>> = {
  factures: 'Factures reçues 📄',
  acd: 'ACD signé ✍️',
  offre: 'Offre placée 🚀',
  signe: 'Contrat signé ! 🎉',
}

/** Changement d'étape avec toast de célébration et « Annuler ». */
export function useStageChange() {
  const update = useUpdateStage()
  return (client: Client, stage: StageId, opts?: { lost_reason?: string | null; onSigned?: () => void }) => {
    if (stage === client.stage) return
    const previous = client.stage
    update.mutate(
      { id: client.id, stage, lost_reason: opts?.lost_reason },
      {
        onSuccess: () => {
          if (stage === 'signe') opts?.onSigned?.()
          toast.success(STAGE_CELEBRATION[stage] ?? `Étape : ${stageOf(stage).label}`, {
            description: stage === 'signe' || stage === 'perdu' ? `${client.company ?? ''} · actions ouvertes clôturées` : (client.company ?? undefined),
            action: { label: 'Annuler', onClick: () => update.mutate({ id: client.id, stage: previous }) },
          })
        },
        onError: (e) => toast.error("Impossible de changer l'étape", { description: e.message }),
      },
    )
  }
}
