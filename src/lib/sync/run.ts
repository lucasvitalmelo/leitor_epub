import {
  applyRemoteChanges,
  clearDeletions,
  getDriveFolders,
  listBooksMissingCover,
  listBooksToUpload,
  markBookUploaded,
  readLocalLibrary,
  saveDownloadedCover,
  type DriveFolders,
} from '@/lib/db/sync'
import type { BookWithFile } from '@/lib/db/schema'
import { DriveAuthError } from '@/lib/drive/auth'
import { driveApi, isDriveApiError, type DriveApi, type DriveApiError } from '@/lib/drive/api'
import { exportFileName } from '@/lib/epub/export'
import { debugLog } from '@/lib/debug-log'
import { ensureFolders, MissingFolderError } from './folders'
import { parseLibraryFile, serializeLibraryFile, UnsupportedLibraryFormat } from './library-file'
import { mergeLibrary } from './merge'

const LIBRARY_FILE = 'biblioteca.json'
const EPUB_TYPE = 'application/epub+zip'
// Rounds of "read, merge, write" when another device writes in between.
const WRITE_ATTEMPTS = 3
const COVER_DOWNLOADS = 4

export interface SyncSummary {
  // Records this device took from the others (books, progress, highlights).
  applied: number
  uploaded: number
  // Books Drive refused (see uploadPendingBooks); they stay pending.
  skipped: number
  covers: number
}

export type SyncProblem = 'offline' | 'conta' | 'cheio' | 'pasta' | 'formato' | 'conflito' | 'erro'

export class SyncError extends Error {
  readonly problem: SyncProblem

  constructor(problem: SyncProblem, message: string) {
    super(message)
    this.problem = problem
  }
}

let running: Promise<SyncSummary> | null = null

// One sync at a time: a call while one is running gets that same run.
// onApplied fires once the records from the other devices are in, before this
// device's own uploads, which on a first sync can take minutes.
export function syncNow(api: DriveApi = driveApi, onApplied?: () => void): Promise<SyncSummary> {
  running ??= runSync(api, onApplied).finally(() => {
    running = null
  })
  return running
}

async function runSync(api: DriveApi, onApplied?: () => void): Promise<SyncSummary> {
  const started = Date.now()
  debugLog('sync: início')
  try {
    // A device's first sync adds both sides up (spec: "primeira conexão"). The
    // removals it recorded before were local ones — the dialog said so — and
    // must not delete those same books on the other devices.
    if (!(await getDriveFolders())) {
      const dropped = await clearDeletions()
      debugLog('sync: primeira deste aparelho', `${dropped} exclusão(ões) de antes descartada(s)`)
    }
    const folders = await ensureFolders(api)
    let applied = await syncLibraryFile(api, folders)
    if (applied > 0) onApplied?.()
    const { uploaded, skipped, stoppedBy } = await uploadPendingBooks(api, folders)
    // A book is only in the file once its EPUB is on Drive. The books that went
    // up just now get in with this second round, which is what makes them
    // appear on the other devices; it runs even when the uploads stopped early.
    if (uploaded > 0) applied += await syncLibraryFile(api, folders)
    const covers = await downloadMissingCovers(api)
    if (stoppedBy) throw stoppedBy
    debugLog(
      'sync: fim',
      `${applied} recebida(s), ${uploaded} enviado(s), ${skipped} recusado(s), ${covers} capa(s), ${Date.now() - started} ms`,
    )
    return { applied, uploaded, skipped, covers }
  } catch (error) {
    const problem = toSyncError(error)
    debugLog('sync: erro', `${problem.problem}: ${String(error)}`)
    throw problem
  }
}

// Steps 3 to 6 of the spec: read the shared file, merge, apply here, and write
// the result back if it differs, unless another device wrote it in between
// (then the whole round starts over).
async function syncLibraryFile(api: DriveApi, folders: DriveFolders): Promise<number> {
  let applied = 0
  for (let attempt = 1; attempt <= WRITE_ATTEMPTS; attempt++) {
    const ref = await api.findFile(LIBRARY_FILE, folders.data)
    // The version as the file itself reports it: a search can lag behind a
    // write, and comparing against that would look like a conflict every time.
    const version = ref ? await api.getVersion(ref.id) : null
    const theirs = ref ? parseLibraryFile(await api.downloadText(ref.id)) : null
    if (ref && !theirs) debugLog('sync: biblioteca ilegível, será regravada')
    const { file, changes } = mergeLibrary(await readLocalLibrary(), theirs)
    applied += await applyRemoteChanges(changes)
    const text = serializeLibraryFile(file)
    if (theirs && text === serializeLibraryFile(theirs)) {
      debugLog('sync: biblioteca em dia', `${Object.keys(file.books).length} livro(s)`)
      return applied
    }
    if (ref && (await api.getVersion(ref.id)) !== version) {
      debugLog('sync: biblioteca mudou no meio', `tentativa ${attempt}`)
      continue
    }
    const content = new Blob([text], { type: 'application/json' })
    if (ref) await api.updateFile(ref.id, content)
    else await api.createFile({ name: LIBRARY_FILE, parentId: folders.data, mimeType: 'application/json' }, content)
    debugLog('sync: biblioteca gravada', `${Object.keys(file.books).length} livro(s)`)
    return applied
  }
  throw new SyncError('conflito', 'Outro aparelho estava sincronizando ao mesmo tempo. Tente de novo.')
}

function coverName(book: BookWithFile, cover: Blob): string {
  const extension = cover.type === 'image/png' ? 'png' : cover.type === 'image/webp' ? 'webp' : 'jpg'
  return `${book.id}.${extension}`
}

// Never edited since it was imported: any device's copy of it is the same book.
const unedited = (book: BookWithFile) => (book.fileUpdatedAt ?? book.addedAt) === book.addedAt

// A book Drive refuses, which is skipped and counted so it can't hold the
// rest of the library back: a 4xx that isn't a full Drive or a "slow down"
// (its file deleted by hand on Drive, say), or a big upload whose session
// address the page can't read.
function refused(error: unknown): boolean {
  if (!isDriveApiError(error)) return false
  if (error.reason === 'noUploadSession') return true
  return error.status >= 400 && error.status < 500 && !isTransient(error) && error.reason !== 'storageQuotaExceeded'
}

// Step 7: the EPUB and the cover of each pending book, one book at a time. A
// file already on Drive for the book (an upload cut short, or the same book
// added on another device) is reused rather than duplicated. Anything other
// than a refused book (a full Drive, no network, a "slow down") stops the
// uploads; what went up so far is still put in the library file.
async function uploadPendingBooks(
  api: DriveApi,
  folders: DriveFolders,
): Promise<{ uploaded: number; skipped: number; stoppedBy: unknown }> {
  let uploaded = 0
  let skipped = 0
  for (const book of await listBooksToUpload()) {
    const expected = { updatedAt: book.updatedAt ?? book.addedAt, fileUpdatedAt: book.fileUpdatedAt ?? book.addedAt }
    try {
      let fileId = book.driveFileId ?? null
      if (!fileId) {
        const found = await api.findBookFile(book.id, folders.root)
        if (found && !unedited(book)) await api.updateFile(found, withType(book.fileBlob, EPUB_TYPE))
        fileId =
          found ??
          (
            await api.createFile(
              { name: exportFileName(book), parentId: folders.root, mimeType: EPUB_TYPE, appProperties: { bookId: book.id } },
              withType(book.fileBlob, EPUB_TYPE),
            )
          ).id
      } else {
        await api.updateFile(fileId, withType(book.fileBlob, EPUB_TYPE))
      }

      let coverId = book.driveCoverId ?? null
      if (book.coverBlob) {
        coverId ??= await api.findBookFile(book.id, folders.covers)
        if (coverId) {
          if (book.driveCoverId || !unedited(book)) await api.updateFile(coverId, book.coverBlob)
        } else {
          coverId = (
            await api.createFile(
              {
                name: coverName(book, book.coverBlob),
                parentId: folders.covers,
                mimeType: book.coverBlob.type || 'image/jpeg',
                appProperties: { bookId: book.id },
              },
              book.coverBlob,
            )
          ).id
        }
      }

      await markBookUploaded(book.id, { driveFileId: fileId, driveCoverId: coverId }, expected)
      uploaded++
      debugLog('sync: livro enviado', `${book.title} (${book.fileBlob.size} bytes)`)
    } catch (error) {
      if (!refused(error)) return { uploaded, skipped, stoppedBy: error }
      skipped++
      debugLog('sync: livro não enviado', `${book.title}: ${String(error)}`)
    }
  }
  return { uploaded, skipped, stoppedBy: null }
}

function withType(blob: Blob, type: string): Blob {
  return blob.type === type ? blob : new Blob([blob], { type })
}

// Step 8: covers the books from other devices arrived without, a few at a time.
async function downloadMissingCovers(api: DriveApi): Promise<number> {
  const queue = await listBooksMissingCover()
  let downloaded = 0
  async function worker() {
    for (let next = queue.shift(); next; next = queue.shift()) {
      try {
        await saveDownloadedCover(next.id, await api.downloadBlob(next.driveCoverId))
        downloaded++
      } catch (error) {
        debugLog('sync: capa não baixada', `${next.id.slice(0, 8)} ${String(error)}`)
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(COVER_DOWNLOADS, queue.length) }, worker))
  return downloaded
}

// Drive says "slow down" with a 429, and also with a 403 whose reason is a
// rate limit; like a 5xx, it passes if tried again later.
function isTransient(error: DriveApiError): boolean {
  return (
    error.status === 429 ||
    error.status >= 500 ||
    error.reason === 'rateLimitExceeded' ||
    error.reason === 'userRateLimitExceeded'
  )
}

function toSyncError(error: unknown): SyncError {
  if (error instanceof SyncError) return error
  if (error instanceof DriveAuthError) {
    if (error.problem === 'indisponivel') return new SyncError('offline', 'Sem conexão com o Google Drive.')
    return new SyncError('conta', 'Conecte o Google Drive de novo para sincronizar.')
  }
  if (error instanceof MissingFolderError) {
    return new SyncError('pasta', `A pasta "${error.folder}" sumiu do Google Drive. Se ela estiver na lixeira do Drive, restaure-a.`)
  }
  if (error instanceof UnsupportedLibraryFormat) {
    return new SyncError('formato', 'A biblioteca no Drive foi gravada por uma versão mais nova do app. Atualize o app neste aparelho.')
  }
  if (isDriveApiError(error)) {
    if (error.reason === 'storageQuotaExceeded') return new SyncError('cheio', 'O seu Google Drive está cheio.')
    if (isTransient(error)) return new SyncError('offline', 'O Google Drive não respondeu. Tente de novo daqui a pouco.')
    return new SyncError('erro', error.message)
  }
  // fetch() fails with a TypeError when there's no network.
  if (error instanceof TypeError) return new SyncError('offline', 'Sem conexão com a internet.')
  return new SyncError('erro', String(error))
}
