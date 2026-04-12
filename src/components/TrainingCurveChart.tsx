const W = 400
const H = 220
const PAD = { top: 16, right: 16, bottom: 40, left: 44 }
const CW = W - PAD.left - PAD.right
const CH = H - PAD.top - PAD.bottom

function trainLoss(t: number) {
  return 0.85 * Math.exp(-4.5 * t) + 0.05
}
function valLoss(t: number) {
  const min = 0.18
  const tMin = 0.45
  if (t <= tMin) return trainLoss(t) + 0.06 * (1 - t / tMin)
  return min + 0.55 * (t - tMin) ** 1.8
}

function makePath(fn: (t: number) => number, steps = 120) {
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps
    const x = PAD.left + t * CW
    const y = PAD.top + (1 - fn(t)) * CH
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
}

const BEST_T = 0.45
const BEST_X = PAD.left + BEST_T * CW
const BEST_Y = PAD.top + (1 - valLoss(BEST_T)) * CH

export function TrainingCurveChart() {
  const zones = [
    { label: 'Under-\nfitting', x: PAD.left, w: CW * 0.25, color: 'fill-blue-500/8' },
    { label: 'Ideal', x: PAD.left + CW * 0.25, w: CW * 0.4, color: 'fill-green-500/10' },
    { label: 'Over-\nfitting', x: PAD.left + CW * 0.65, w: CW * 0.35, color: 'fill-red-500/8' },
  ]

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div>
        <p className="text-sm font-semibold">Curva de aprendizado</p>
        <p className="text-xs text-muted-foreground">treino vs. validação</p>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Curva de aprendizado">
        {/* Zone backgrounds */}
        {zones.map((z) => (
          <rect key={z.label} x={z.x} y={PAD.top} width={z.w} height={CH} className={z.color} />
        ))}

        {/* Zone labels */}
        {zones.map((z) => (
          <text key={z.label} x={z.x + z.w / 2} y={PAD.top + CH - 8}
            textAnchor="middle" fontSize={13} fill="currentColor" fillOpacity={0.4}>
            {z.label.replace('\n', ' ')}
          </text>
        ))}

        {/* Grid lines */}
        {[0, 0.5, 1].map((v) => {
          const y = PAD.top + (1 - v) * CH
          return (
            <line key={v} x1={PAD.left} x2={PAD.left + CW} y1={y} y2={y}
              stroke="currentColor" strokeOpacity={0.08} strokeWidth={1} />
          )
        })}

        {/* Axes */}
        <line x1={PAD.left} x2={PAD.left} y1={PAD.top} y2={PAD.top + CH}
          stroke="currentColor" strokeOpacity={0.3} strokeWidth={1.5} />
        <line x1={PAD.left} x2={PAD.left + CW} y1={PAD.top + CH} y2={PAD.top + CH}
          stroke="currentColor" strokeOpacity={0.3} strokeWidth={1.5} />

        {/* Y-axis labels */}
        <text x={PAD.left - 6} y={PAD.top + 5} textAnchor="end" fontSize={13}
          fill="currentColor" fillOpacity={0.4}>alto</text>
        <text x={PAD.left - 6} y={PAD.top + CH} textAnchor="end" fontSize={13}
          fill="currentColor" fillOpacity={0.4}>baixo</text>

        {/* Axis titles */}
        <text x={PAD.left + CW / 2} y={H - 4} textAnchor="middle" fontSize={14}
          fill="currentColor" fillOpacity={0.5}>Épocas →</text>
        <text x={13} y={PAD.top + CH / 2} textAnchor="middle" fontSize={14}
          fill="currentColor" fillOpacity={0.5}
          transform={`rotate(-90, 13, ${PAD.top + CH / 2})`}>Loss</text>

        {/* Training loss curve */}
        <path d={makePath(trainLoss)} fill="none" stroke="#3b82f6" strokeWidth={3}
          strokeLinejoin="round" strokeLinecap="round" />

        {/* Validation loss curve */}
        <path d={makePath(valLoss)} fill="none" stroke="#f97316" strokeWidth={3}
          strokeLinejoin="round" strokeLinecap="round" strokeDasharray="8 4" />

        {/* Best epoch marker */}
        <line x1={BEST_X} x2={BEST_X} y1={PAD.top} y2={PAD.top + CH}
          stroke="#22c55e" strokeWidth={2} strokeDasharray="5 3" />
        <circle cx={BEST_X} cy={BEST_Y} r={6} fill="#22c55e" />

        {/* Legend */}
        <g transform={`translate(${PAD.left + CW - 118}, ${PAD.top + 6})`}>
          <rect width={118} height={46} rx={4} fill="currentColor" fillOpacity={0.06} />
          <line x1={8} x2={26} y1={15} y2={15} stroke="#3b82f6" strokeWidth={3} />
          <text x={32} y={19} fontSize={13} fill="currentColor" fillOpacity={0.75}>treino</text>
          <line x1={8} x2={26} y1={33} y2={33} stroke="#f97316" strokeWidth={3} strokeDasharray="8 4" />
          <text x={32} y={37} fontSize={13} fill="currentColor" fillOpacity={0.75}>validação</text>
        </g>
      </svg>

      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="rounded-md bg-blue-500/10 px-2 py-2 border border-blue-500/20">
          <p className="font-medium text-blue-600 dark:text-blue-400">Underfitting</p>
          <p className="text-muted-foreground mt-0.5">Ambas losses altas</p>
        </div>
        <div className="rounded-md bg-green-500/10 px-2 py-2 border border-green-500/20">
          <p className="font-medium text-green-600 dark:text-green-400">Zona ideal</p>
          <p className="text-muted-foreground mt-0.5">Early stopping aqui</p>
        </div>
        <div className="rounded-md bg-red-500/10 px-2 py-2 border border-red-500/20">
          <p className="font-medium text-red-600 dark:text-red-400">Overfitting</p>
          <p className="text-muted-foreground mt-0.5">Validação sobe</p>
        </div>
      </div>
    </div>
  )
}
