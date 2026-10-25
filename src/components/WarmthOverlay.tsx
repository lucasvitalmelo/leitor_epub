import { warmthColor } from '@/lib/warmth'
import { useReadingPrefsStore } from '@/store/reading-prefs-store'

// Over the whole app, the dialogs and the book's iframe included, without
// catching clicks. Above the Radix portals (z-50).
export default function WarmthOverlay() {
  const warmth = useReadingPrefsStore((s) => s.warmthPreview ?? s.warmth)
  if (warmth <= 0) return null
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[100] mix-blend-multiply"
      style={{ background: warmthColor(warmth) }}
    />
  )
}
