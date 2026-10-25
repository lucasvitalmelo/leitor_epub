import { describe, expect, it } from 'vitest'
import { delayForReadingSync, READING_SYNC_DEBOUNCE_MS, READING_SYNC_GAP_MS } from './reading-sync'

describe('delayForReadingSync', () => {
  it('sem sincronização nesta sessão, espera só a pausa', () => {
    expect(delayForReadingSync(1_000_000, null)).toBe(READING_SYNC_DEBOUNCE_MS)
  })

  it('logo depois de uma sincronização, espera o intervalo completar', () => {
    const now = 1_000_000
    expect(delayForReadingSync(now, now - 60_000)).toBe(READING_SYNC_GAP_MS - 60_000)
  })

  it('com o intervalo já passado, espera só a pausa', () => {
    const now = 1_000_000
    expect(delayForReadingSync(now, now - READING_SYNC_GAP_MS - 1)).toBe(READING_SYNC_DEBOUNCE_MS)
  })
})
