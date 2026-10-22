// Which books the library grid shows while some are only on Drive.
export type Shelf = 'baixados' | 'todos'

export function parseShelf(saved: string | null): Shelf | null {
  if (saved === 'todos') return 'todos'
  // "aparelho" is what the tab was called before it became "Baixados".
  if (saved === 'baixados' || saved === 'aparelho') return 'baixados'
  return null
}

// Without a choice made this session, a device whose books are all still on
// Drive would open on an empty "Baixados" grid.
export function effectiveShelf(saved: Shelf | null, anyDownloaded: boolean, importing: boolean): Shelf {
  return saved ?? (anyDownloaded || importing ? 'baixados' : 'todos')
}
