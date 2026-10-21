import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { syncNow } = vi.hoisted(() => ({ syncNow: vi.fn() }))
vi.mock('@/lib/sync/run', async (original) => ({
  ...(await original<typeof import('@/lib/sync/run')>()),
  syncNow: () => syncNow(),
}))

// Fresh modules per test: both stores keep their state at module level.
let sync: typeof import('./sync-store')
let drive: typeof import('./drive-store')
let run: typeof import('@/lib/sync/run')

beforeEach(async () => {
  vi.resetModules()
  syncNow.mockReset()
  drive = await import('./drive-store')
  sync = await import('./sync-store')
  run = await import('@/lib/sync/run')
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('useSyncStore', () => {
  it('não sincroniza sem o Drive conectado', async () => {
    drive.useDriveStore.setState({ status: 'desconectado' })
    await sync.useSyncStore.getState().run()
    expect(syncNow).not.toHaveBeenCalled()
  })

  it('anota a hora e avisa a biblioteca quando algo mudou aqui, inclusive um envio', async () => {
    drive.useDriveStore.setState({ status: 'conectado' })
    syncNow.mockResolvedValueOnce({ applied: 0, uploaded: 0, skipped: 0, covers: 0 })
    await sync.useSyncStore.getState().run()
    expect(sync.useSyncStore.getState()).toMatchObject({ status: 'parado', revision: 0, error: null })
    expect(sync.useSyncStore.getState().lastSyncAt).toEqual(expect.any(Number))

    syncNow.mockResolvedValueOnce({ applied: 3, uploaded: 0, skipped: 0, covers: 1 })
    await sync.useSyncStore.getState().run()
    expect(sync.useSyncStore.getState().revision).toBe(1)

    // What went up now has its Drive ids, which the remove dialog reads.
    syncNow.mockResolvedValueOnce({ applied: 0, uploaded: 2, skipped: 0, covers: 0 })
    await sync.useSyncStore.getState().run()
    expect(sync.useSyncStore.getState().revision).toBe(2)
  })

  it('uma chamada no meio de uma sincronização roda outra logo depois', async () => {
    drive.useDriveStore.setState({ status: 'conectado' })
    let finish!: (summary: unknown) => void
    syncNow.mockImplementationOnce(() => new Promise((resolve) => (finish = resolve)))
    syncNow.mockResolvedValueOnce({ applied: 0, uploaded: 1, skipped: 0, covers: 0 })

    const first = sync.useSyncStore.getState().run()
    await sync.useSyncStore.getState().run()
    expect(syncNow).toHaveBeenCalledTimes(1)
    finish({ applied: 0, uploaded: 0, skipped: 0, covers: 0 })
    await first

    await vi.waitFor(() => expect(syncNow).toHaveBeenCalledTimes(2))
  })

  it('livros que o Drive recusou aparecem como erro, com a contagem', async () => {
    drive.useDriveStore.setState({ status: 'conectado' })
    syncNow.mockResolvedValueOnce({ applied: 0, uploaded: 1, skipped: 2, covers: 0 })
    await sync.useSyncStore.getState().run()
    expect(sync.useSyncStore.getState().status).toBe('erro')
    expect(sync.useSyncStore.getState().error).toContain('2 livro(s) não subiram')
  })

  it('um erro fica no estado com a mensagem, e um problema de conta confere o login de novo', async () => {
    drive.useDriveStore.setState({ status: 'conectado' })
    const check = vi.spyOn(drive.useDriveStore.getState(), 'check').mockResolvedValue()
    syncNow.mockRejectedValueOnce(new run.SyncError('cheio', 'O seu Google Drive está cheio.'))
    await sync.useSyncStore.getState().run()
    expect(sync.useSyncStore.getState()).toMatchObject({ status: 'erro', error: 'O seu Google Drive está cheio.' })
    expect(check).not.toHaveBeenCalled()

    syncNow.mockRejectedValueOnce(new run.SyncError('conta', 'Conecte o Google Drive de novo para sincronizar.'))
    await sync.useSyncStore.getState().run()
    expect(check).toHaveBeenCalledOnce()
  })
})
