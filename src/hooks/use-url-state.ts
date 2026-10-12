import { useCallback, useEffect, useState } from 'react'

/** Paramètre d'URL synchronisé (lien partageable vers un dossier, retour navigateur). */
export function useUrlParam(name: string) {
  const read = () => new URLSearchParams(window.location.search).get(name)
  const [value, setValue] = useState<string | null>(read)

  useEffect(() => {
    const onPop = () => setValue(read())
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name])

  const update = useCallback(
    (next: string | null, { replace = false } = {}) => {
      const url = new URL(window.location.href)
      if (next) url.searchParams.set(name, next)
      else url.searchParams.delete(name)
      if (url.href !== window.location.href) window.history[replace ? 'replaceState' : 'pushState'](null, '', url)
      setValue(next)
    },
    [name],
  )

  return [value, update] as const
}
