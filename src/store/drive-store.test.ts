import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Fresh modules per test: the store and the token cache live at module level.
let store: typeof import('./drive-store')
let flag: typeof import('@/lib/db/deletions')
let schema: typeof import('@/lib/db/schema')

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status })
const token = () => json(200, { accessToken: 'a1', expiresAt: Date.now() + 3_600_000 })
const about = () => json(200, { user: { displayName: 'Lucas', emailAddress: 'lucas@exemplo.com' } })

function serverAnswers(...responses: Array<Response | Error>) {
  const fetchMock = vi.fn<typeof fetch>()
  for (const response of responses) {
    if (response instanceof Error) fetchMock.mockRejectedValueOnce(response)
    else fetchMock.mockResolvedValueOnce(response)
  }
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const enabled = () => flag.isDriveEnabled()

beforeEach(async () => {
  vi.resetModules()
  schema = await import('@/lib/db/schema')
  await schema.db.settings.clear()
  flag = await import('@/lib/db/deletions')
  store = await import('./drive-store')
})

afterEach(() => {
  vi.unstubAllGlobals()
  schema.db.close()
})

describe('o estado do Drive neste aparelho', () => {
  it('conectar liga o registro de exclusões', async () => {
    serverAnswers(token(), about())
    await store.useDriveStore.getState().check()
    expect(store.useDriveStore.getState().status).toBe('conectado')
    await vi.waitFor(async () => expect(await enabled()).toBe(true))
  })

  it('nunca ter conectado aqui desliga o registro', async () => {
    await flag.setDriveEnabled(true)
    serverAnswers(json(401, { error: 'desconectado' }))
    await store.useDriveStore.getState().check()
    await vi.waitFor(async () => expect(await enabled()).toBe(false))
  })

  it('o acesso que expirou não desliga o registro', async () => {
    await flag.setDriveEnabled(true)
    serverAnswers(json(401, { error: 'reconectar' }))
    await store.useDriveStore.getState().check()
    expect(store.useDriveStore.getState().status).toBe('reconectar')
    expect(await enabled()).toBe(true)
  })

  it('ficar sem rede não desliga o registro', async () => {
    await flag.setDriveEnabled(true)
    serverAnswers(new TypeError('Failed to fetch'))
    await store.useDriveStore.getState().check()
    expect(store.useDriveStore.getState().status).toBe('indisponivel')
    expect(await enabled()).toBe(true)
  })

  it('desconectar desliga o registro', async () => {
    await flag.setDriveEnabled(true)
    serverAnswers(json(200, { ok: true }))
    await store.useDriveStore.getState().disconnect()
    expect(store.useDriveStore.getState().status).toBe('desconectado')
    await vi.waitFor(async () => expect(await enabled()).toBe(false))
  })

  it('se o servidor não confirma a saída, o registro continua ligado', async () => {
    await flag.setDriveEnabled(true)
    serverAnswers(json(500, { error: 'x' }))
    await expect(store.useDriveStore.getState().disconnect()).rejects.toThrow()
    expect(await enabled()).toBe(true)
  })
})
