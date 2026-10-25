import type { Book } from '@/lib/db/schema'

type SpaceBook = Pick<Book, 'fileBlob' | 'driveFileId' | 'pendingUpload'>

export function spaceUsed(books: SpaceBook[]): { bytes: number; books: number } {
  const here = books.filter((book) => book.fileBlob !== null)
  return { bytes: here.reduce((sum, book) => sum + book.fileBlob!.size, 0), books: here.length }
}

// The rule of "Remover deste aparelho" (removeLocalFile): Drive has this very
// file, so the one here isn't the only copy.
export function canFreeSpace(book: SpaceBook): boolean {
  return book.fileBlob !== null && !!book.driveFileId && book.pendingUpload === false
}

const MB = 1024 * 1024

export function formatSize(bytes: number): string {
  if (bytes >= 1024 * MB) return `${(bytes / (1024 * MB)).toFixed(1).replace('.', ',')} GB`
  const mb = bytes / MB
  return `${mb >= 10 || mb === 0 ? Math.round(mb) : mb.toFixed(1).replace('.', ',')} MB`
}
