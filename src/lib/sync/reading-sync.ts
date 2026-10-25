// While reading, the position goes up a pause after the last save (pages
// turned in a row make one sync) and never before the gap since the last
// sync has passed: otherwise every page read would run a whole sync.
export const READING_SYNC_DEBOUNCE_MS = 15_000
export const READING_SYNC_GAP_MS = 180_000

export function delayForReadingSync(
  now: number,
  lastSyncAt: number | null,
  debounce = READING_SYNC_DEBOUNCE_MS,
  gap = READING_SYNC_GAP_MS,
): number {
  if (lastSyncAt === null) return debounce
  return Math.max(debounce, lastSyncAt + gap - now)
}
