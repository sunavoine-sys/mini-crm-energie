import { useCallback, useSyncExternalStore } from 'react'

export type ThemePref = 'light' | 'dark' | 'system'
const KEY = 'dms-theme'
const media = window.matchMedia('(prefers-color-scheme: dark)')
const listeners = new Set<() => void>()

function readPref(): ThemePref {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'light' || v === 'dark' ? v : 'system'
  } catch {
    return 'system'
  }
}

let pref: ThemePref = readPref()
const resolve = (p: ThemePref) => (p === 'system' ? (media.matches ? 'dark' : 'light') : p)

function apply() {
  const root = document.documentElement
  // Coupe les transitions le temps du changement pour éviter un « fondu » parasite
  root.classList.add('[&_*]:!transition-none')
  root.classList.toggle('dark', resolve(pref) === 'dark')
  requestAnimationFrame(() => root.classList.remove('[&_*]:!transition-none'))
  listeners.forEach((l) => l())
}

media.addEventListener('change', () => pref === 'system' && apply())

function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

export function useTheme() {
  const current = useSyncExternalStore(subscribe, () => pref)
  const setTheme = useCallback((next: ThemePref) => {
    pref = next
    try {
      localStorage.setItem(KEY, next)
    } catch {
      /* stockage indisponible : préférence non mémorisée */
    }
    apply()
  }, [])
  return { theme: current, resolved: resolve(current) as 'light' | 'dark', setTheme }
}
