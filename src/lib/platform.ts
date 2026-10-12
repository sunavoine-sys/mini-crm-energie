export const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)
/** Touche de commande affichée : ⌘ sur Mac, Ctrl ailleurs. */
export const MOD = isMac ? '⌘' : 'Ctrl'
