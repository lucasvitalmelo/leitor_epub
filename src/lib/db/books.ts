import { db, type Book } from './schema'
import { bookDeletionKey, isDriveEnabled } from './deletions'

export function listBooks(): Promise<Book[]> {
  return db.books.orderBy('addedAt').reverse().toArray()
}

export function getBook(id: string): Promise<Book | undefined> {
  return db.books.get(id)
}

// The sync stamps start at the import date; see Book in schema.ts.
export function addBook(book: Book): Promise<string> {
  return db.books.add({
    ...book,
    updatedAt: book.updatedAt ?? book.addedAt,
    fileUpdatedAt: book.fileUpdatedAt ?? book.addedAt,
    blobUpdatedAt: book.blobUpdatedAt ?? book.addedAt,
    pendingUpload: book.pendingUpload ?? true,
  })
}

// Editing the title, author, cover or file is a change worth syncing; saving
// what's derived from the file (locations, font scale) isn't, and must not
// move the stamp.
export async function updateBook(id: string, changes: Partial<Omit<Book, 'id'>>): Promise<void> {
  const stamps: Partial<Omit<Book, 'id'>> = {}
  if ('title' in changes || 'author' in changes || 'coverBlob' in changes || 'fileBlob' in changes) {
    stamps.updatedAt = Date.now()
  }
  if ('fileBlob' in changes) {
    stamps.fileUpdatedAt = stamps.updatedAt
    stamps.blobUpdatedAt = stamps.updatedAt
    stamps.pendingUpload = true
  }
  await db.books.update(id, { ...changes, ...stamps })
}

export async function removeBook(id: string): Promise<void> {
  // Read before the transaction, which only covers the tables below.
  const track = await isDriveEnabled()
  await db.transaction('rw', db.books, db.progress, db.highlights, db.deletions, async () => {
    await db.books.delete(id)
    await db.progress.delete(id)
    await db.highlights.where('bookId').equals(id).delete()
    // The book's entry covers its highlights too.
    if (track) await db.deletions.put({ key: bookDeletionKey(id), deletedAt: Date.now() })
  })
}
