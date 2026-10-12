import { useEffect, useLayoutEffect, useRef } from 'react'

type Handler = (e: KeyboardEvent) => void

function isTyping(target: EventTarget | null) {
  const el = target as HTMLElement | null
  if (!el) return false
  return el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) || !!el.closest('[role="dialog"],[role="alertdialog"],[role="menu"],[role="listbox"][data-radix-select-viewport]')
}

/** Raccourcis à une touche (ignorés pendant la saisie ou dans une modale). */
export function useHotkeys(map: Record<string, Handler>) {
  const ref = useRef(map)
  useLayoutEffect(() => {
    ref.current = map
  })

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return
      const handler = ref.current[e.key.toLowerCase()] ?? ref.current[e.key]
      if (handler) {
        e.preventDefault()
        handler(e)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
