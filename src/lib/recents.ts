const KEY = 'dms-recent-clients'

export function readRecents(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []
  } catch {
    return []
  }
}

export function pushRecent(id: string) {
  try {
    localStorage.setItem(KEY, JSON.stringify([id, ...readRecents().filter((x) => x !== id)].slice(0, 6)))
  } catch {
    /* stockage indisponible */
  }
}
