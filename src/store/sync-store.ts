import { create } from 'zustand'
import { SyncError, syncNow } from '@/lib/sync/run'
import { useDriveStore } from './drive-store'

export type SyncStatus = 'parado' | 'sincronizando' | 'erro'

interface SyncState {
  status: SyncStatus
  // This session's last successful sync.
  lastSyncAt: number | null
  error: string | null
  // Goes up when a sync changed what's on this device (records from the other
  // side, covers, or the Drive ids of books that went up), so the library reloads.
  revision: number
  // A call while a sync runs asks for one more right after it.
  again: boolean
  run: () => Promise<void>
}

export const useSyncStore = create<SyncState>((set, get) => ({
  status: 'parado',
  lastSyncAt: null,
  error: null,
  revision: 0,
  again: false,
  // Does nothing unless the Drive is connected. Called while a sync runs, it
  // runs another one right after, so a change made meanwhile (an import, an
  // edit) isn't left for the next visit to the library.
  run: async () => {
    if (useDriveStore.getState().status !== 'conectado') return
    if (get().status === 'sincronizando') {
      set({ again: true })
      return
    }
    set({ status: 'sincronizando', error: null, again: false })
    try {
      // The other devices' books show up as soon as they're in, not after this
      // device's uploads.
      const summary = await syncNow(undefined, () => set((state) => ({ revision: state.revision + 1 })))
      const changed = summary.applied > 0 || summary.covers > 0 || summary.uploaded > 0
      // Books Drive refused stay pending; the panel says so instead of "em dia".
      const refused = summary.skipped > 0
      set((state) => ({
        status: refused ? 'erro' : 'parado',
        lastSyncAt: Date.now(),
        error: refused ? `${summary.skipped} livro(s) não subiram para o Google Drive. Com ?debug=1, o diagnóstico mostra o motivo.` : null,
        revision: changed ? state.revision + 1 : state.revision,
      }))
    } catch (error) {
      const problem = error instanceof SyncError ? error : null
      set({ status: 'erro', error: problem?.message ?? 'Não foi possível sincronizar.' })
      // The login itself went wrong: the Drive button should say so.
      if (problem?.problem === 'conta') void useDriveStore.getState().check()
    }
    if (get().again) void get().run()
  },
}))
