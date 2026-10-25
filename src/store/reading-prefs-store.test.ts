import 'fake-indexeddb/auto'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

let store: typeof import('./reading-prefs-store')
let schema: typeof import('@/lib/db/schema')

beforeEach(async () => {
  vi.resetModules()
  schema = await import('@/lib/db/schema')
  await schema.db.settings.clear()
  store = await import('./reading-prefs-store')
})

afterEach(() => schema.db.close())

it('sincronizar durante a leitura vem ligado e a temperatura em 0', async () => {
  await store.useReadingPrefsStore.getState().loadReadingPrefs()
  const state = store.useReadingPrefsStore.getState()
  expect(state.syncWhileReading).toBe(true)
  expect(state.warmth).toBe(0)
})

it('a temperatura e a sincronização gravadas voltam na próxima abertura', async () => {
  const prefs = store.useReadingPrefsStore.getState()
  prefs.setWarmthPreview(30)
  prefs.setWarmth(40)
  prefs.setSyncWhileReading(false)
  expect(store.useReadingPrefsStore.getState().warmthPreview).toBeNull()
  await vi.waitFor(async () => expect(await schema.db.settings.get('syncWhileReading')).toBeDefined())

  vi.resetModules()
  const again = await import('./reading-prefs-store')
  await again.useReadingPrefsStore.getState().loadReadingPrefs()
  expect(again.useReadingPrefsStore.getState().warmth).toBe(40)
  expect(again.useReadingPrefsStore.getState().syncWhileReading).toBe(false)
})
