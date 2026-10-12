import { createContext, useContext } from 'react'
import type { Client } from '@/lib/types'

export interface AppActions {
  /** Ouvre le formulaire de création (ou d'édition si client fourni). */
  openClientForm: (client?: Client | null) => void
  /** Ouvre la palette ⌘K, éventuellement directement sur le choix d'étape d'un client. */
  openCommand: (opts?: { stageFor?: Client }) => void
  openShortcuts: () => void
  /** Une page peut capter « / » pour focaliser sa propre recherche. */
  registerSearch: (focus: (() => void) | null) => void
}

export const AppActionsContext = createContext<AppActions | null>(null)

export function useAppActions() {
  const ctx = useContext(AppActionsContext)
  if (!ctx) throw new Error('useAppActions doit être utilisé dans <AppShell>')
  return ctx
}
