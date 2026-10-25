const SIZE = 72
const STROKE = 4
const RADIUS = (SIZE - STROKE) / 2
const LENGTH = 2 * Math.PI * RADIUS

// value from 0 to 1. Indeterminate (a stage that doesn't say how much is
// left): a quarter of the ring spins instead.
export default function ProgressRing({
  value,
  indeterminate = false,
}: {
  value: number
  indeterminate?: boolean
}) {
  return (
    <svg
      width={SIZE}
      height={SIZE}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      role="progressbar"
      aria-label={indeterminate ? 'Carregando' : `${Math.round(value * 100)}% carregado`}
      className={indeterminate ? 'animate-spin' : undefined}
    >
      <circle
        cx={SIZE / 2}
        cy={SIZE / 2}
        r={RADIUS}
        fill="none"
        stroke="currentColor"
        strokeOpacity={0.15}
        strokeWidth={STROKE}
      />
      <circle
        cx={SIZE / 2}
        cy={SIZE / 2}
        r={RADIUS}
        fill="none"
        stroke="currentColor"
        strokeWidth={STROKE}
        strokeLinecap="round"
        strokeDasharray={indeterminate ? `${LENGTH * 0.25} ${LENGTH}` : LENGTH}
        strokeDashoffset={indeterminate ? 0 : LENGTH * (1 - value)}
        transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
        className="transition-[stroke-dashoffset] duration-250 ease-out"
      />
    </svg>
  )
}
