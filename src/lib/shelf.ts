import type { Book } from '@/lib/db/schema'

// Which books the library grid shows while some are only on Drive: the ones
// on this device, or the ones still to download — never both at once.
export type Shelf = 'baixados' | 'disponiveis'

export function parseShelf(saved: string | null): Shelf | null {
  if (saved === 'disponiveis') return 'disponiveis'
  // "aparelho" is what the tab was called before it became "Baixados".
  if (saved === 'baixados' || saved === 'aparelho') return 'baixados'
  return null
}

// Without a choice made this session, a device whose books are all still on
// Drive would open on an empty "Baixados" grid.
export function effectiveShelf(saved: Shelf | null, anyDownloaded: boolean, importing: boolean): Shelf {
  return saved ?? (anyDownloaded || importing ? 'baixados' : 'disponiveis')
}

// With Drive disconnected on purpose, the books only on Drive leave the
// library: they can't be downloaded. Their records, progress and highlights
// stay and come back on connecting again. Without a connection or with the
// login to redo, they stay.
export function libraryBooks<T extends Pick<Book, 'fileBlob'>>(books: T[], driveEnabled: boolean): T[] {
  return driveEnabled ? books : books.filter((book) => book.fileBlob !== null)
}
