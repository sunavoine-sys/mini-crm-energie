import { useEffect, useLayoutEffect, useRef } from 'react'

type Handler = (e: KeyboardEvent) => void

export function isTypingTarget(target: EventTarget | null) {
  const el = target as HTMLElement | null
  if (!el) return false
  return (
    el.isContentEditable ||
    ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) ||
    !!el.closest('[role="dialog"],[role="alertdialog"],[role="menu"],[data-radix-select-viewport]')
  )
}

/**
 * Raccourcis clavier, ignorés pendant la saisie ou dans une modale.
 * Touches simples (« n », « / », « ? ») et séquences (« g d » = G puis D en moins d'1 s).
 */
export function useHotkeys(map: Record<string, Handler>) {
  const ref = useRef(map)
  useLayoutEffect(() => {
    ref.current = map
  })

  useEffect(() => {
    let prefix: string | null = null
    let timer: ReturnType<typeof setTimeout> | undefined

    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e.target)) return
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key.toLowerCase()
      const handlers = ref.current

      if (prefix) {
        const seq = handlers[`${prefix} ${key}`]
        prefix = null
        clearTimeout(timer)
        if (seq) {
          e.preventDefault()
          seq(e)
          return
        }
      }

      if (Object.keys(handlers).some((k) => k.startsWith(`${key} `))) {
        prefix = key
        clearTimeout(timer)
        timer = setTimeout(() => (prefix = null), 1000)
        return
      }

      const handler = handlers[e.key] ?? handlers[key]
      if (handler) {
        e.preventDefault()
        handler(e)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      clearTimeout(timer)
    }
  }, [])
}
