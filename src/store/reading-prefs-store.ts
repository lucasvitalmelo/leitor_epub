import { create } from 'zustand'
import { getSetting, setSetting } from '@/lib/db/settings'

const KEEP_SCREEN_ON_SETTING_KEY = 'keepScreenOn'
const WARMTH_SETTING_KEY = 'warmth'
const SYNC_WHILE_READING_SETTING_KEY = 'syncWhileReading'

interface ReadingPrefsState {
  keepScreenOn: boolean
  // 0 to 100: how much blue the light filter takes out.
  warmth: number
  // While the slider is being dragged; saved only when it's let go.
  warmthPreview: number | null
  // The position goes up to Drive while the book is open, not only back in the library.
  syncWhileReading: boolean
  setKeepScreenOn: (value: boolean) => void
  setWarmth: (value: number) => void
  setWarmthPreview: (value: number | null) => void
  setSyncWhileReading: (value: boolean) => void
  loadReadingPrefs: () => Promise<void>
}

export const useReadingPrefsStore = create<ReadingPrefsState>((set) => ({
  keepScreenOn: false,
  warmth: 0,
  warmthPreview: null,
  syncWhileReading: true,
  setKeepScreenOn: (value) => {
    set({ keepScreenOn: value })
    void setSetting(KEEP_SCREEN_ON_SETTING_KEY, value)
  },
  setWarmth: (value) => {
    set({ warmth: value, warmthPreview: null })
    void setSetting(WARMTH_SETTING_KEY, value)
  },
  setWarmthPreview: (value) => set({ warmthPreview: value }),
  setSyncWhileReading: (value) => {
    set({ syncWhileReading: value })
    void setSetting(SYNC_WHILE_READING_SETTING_KEY, value)
  },
  loadReadingPrefs: async () => {
    const [keepScreenOn, warmth, syncWhileReading] = await Promise.all([
      getSetting<boolean>(KEEP_SCREEN_ON_SETTING_KEY),
      getSetting<number>(WARMTH_SETTING_KEY),
      getSetting<boolean>(SYNC_WHILE_READING_SETTING_KEY),
    ])
    set((state) => ({
      keepScreenOn: keepScreenOn ?? state.keepScreenOn,
      warmth: warmth ?? state.warmth,
      syncWhileReading: syncWhileReading ?? state.syncWhileReading,
    }))
  },
}))
