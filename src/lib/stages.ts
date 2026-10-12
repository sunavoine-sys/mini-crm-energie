import type { StageId } from './types'

export interface StageDef {
  id: StageId
  label: string
  short: string
  /** Classe utilitaire de la couleur d'étape (texte) */
  text: string
  /** Pastille pleine */
  dot: string
  /** Fond teinté + bordure, pour badges */
  soft: string
}

/** Pipeline unique : une seule source de vérité (colonne crm_clients.stage). */
export const STAGES: StageDef[] = [
  {
    id: 'prospect',
    label: 'Nouveau · en attente de facture',
    short: 'Nouveau',
    text: 'text-stage-prospect',
    dot: 'bg-stage-prospect',
    soft: 'bg-stage-prospect/10 text-stage-prospect ring-stage-prospect/20',
  },
  {
    id: 'factures',
    label: 'Factures reçues',
    short: 'Factures',
    text: 'text-stage-factures',
    dot: 'bg-stage-factures',
    soft: 'bg-stage-factures/10 text-stage-factures ring-stage-factures/20',
  },
  {
    id: 'acd',
    label: 'ACD signé',
    short: 'ACD',
    text: 'text-stage-acd',
    dot: 'bg-stage-acd',
    soft: 'bg-stage-acd/10 text-stage-acd ring-stage-acd/20',
  },
  {
    id: 'offre',
    label: 'Offre placée',
    short: 'Offre',
    text: 'text-stage-offre',
    dot: 'bg-stage-offre',
    soft: 'bg-stage-offre/10 text-stage-offre ring-stage-offre/20',
  },
  {
    id: 'signe',
    label: 'Contrat signé',
    short: 'Signé',
    text: 'text-stage-signe',
    dot: 'bg-stage-signe',
    soft: 'bg-stage-signe/10 text-stage-signe ring-stage-signe/20',
  },
  {
    id: 'perdu',
    label: 'Perdu · archivé',
    short: 'Perdu',
    text: 'text-stage-perdu',
    dot: 'bg-stage-perdu',
    soft: 'bg-stage-perdu/10 text-stage-perdu ring-stage-perdu/20',
  },
]

export const STAGE_BY_ID = Object.fromEntries(STAGES.map((s) => [s.id, s])) as Record<StageId, StageDef>

export function stageOf(id: string | null | undefined): StageDef {
  return STAGE_BY_ID[(id as StageId) ?? 'prospect'] ?? STAGE_BY_ID.prospect
}
