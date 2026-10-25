// Opening a book in real stages, each with its slice of the ring. The
// download gives no progress of its own: the ring spins through it.
export type OpenStage = 'download' | 'read' | 'parse' | 'render'

export const OPEN_STAGES: Record<OpenStage, { from: number; to: number; label: string }> = {
  download: { from: 0, to: 0.4, label: 'Baixando do Google Drive…' },
  read: { from: 0.4, to: 0.5, label: 'Lendo o arquivo…' },
  parse: { from: 0.5, to: 0.75, label: 'Abrindo o EPUB…' },
  render: { from: 0.75, to: 1, label: 'Montando as páginas…' },
}

// Shown only when opening takes longer than this: a small book opens without
// flashing the ring.
export const OPEN_RING_DELAY_MS = 300
// No sign from the opening for this long (the download aside) means it hung.
export const OPEN_TIMEOUT_MS = 30_000

export function openProgress(stage: OpenStage, fraction = 0): number {
  const { from, to } = OPEN_STAGES[stage]
  return from + (to - from) * Math.min(1, Math.max(0, fraction))
}
