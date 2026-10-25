import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { useReadingPrefsStore } from '@/store/reading-prefs-store'

export default function WarmthSlider() {
  const warmth = useReadingPrefsStore((s) => s.warmth)
  const preview = useReadingPrefsStore((s) => s.warmthPreview)
  const setWarmth = useReadingPrefsStore((s) => s.setWarmth)
  const setWarmthPreview = useReadingPrefsStore((s) => s.setWarmthPreview)
  return (
    <div className="flex flex-col gap-2">
      <Label>Temperatura da luz ({preview ?? warmth}%)</Label>
      <Slider
        value={[preview ?? warmth]}
        min={0}
        max={100}
        step={5}
        onValueChange={([value]) => setWarmthPreview(value)}
        onValueCommit={([value]) => setWarmth(value)}
      />
      <p className="text-xs text-muted-foreground">Tira o azul da tela; o preto continua preto.</p>
    </div>
  )
}
