import type { ImpactStats } from '@/types'

const W = 400
const H = 180
const PAD = { top: 20, right: 16, bottom: 40, left: 44 }
const CW = W - PAD.left - PAD.right
const CH = H - PAD.top - PAD.bottom

interface Props {
  stats: ImpactStats
}

function formatMonth(ym: string) {
  const [year, month] = ym.split('-')
  const d = new Date(Number(year), Number(month) - 1)
  return d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
}

export function ImpactDashboard({ stats }: Props) {
  const { accelerationRate, totalCards, aiStartDate, timeline } = stats

  const gainPct = accelerationRate != null ? Math.round((1 - accelerationRate) * 100) : null
  const isFaster = gainPct != null && gainPct > 0

  const hasChart = timeline.length >= 2
  const maxAvg = hasChart ? Math.max(...timeline.map((p) => p.avgHours)) * 1.15 : 1
  const aiMonthStr = aiStartDate.slice(0, 7)

  const toX = (i: number) => PAD.left + (i / (timeline.length - 1)) * CW
  const toY = (h: number) => PAD.top + (1 - h / maxAvg) * CH

  const pathD = hasChart
    ? timeline
        .map((p, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(p.avgHours).toFixed(1)}`)
        .join(' ')
    : ''

  const aiIdx = timeline.findIndex((p) => p.month >= aiMonthStr)
  const aiX = aiIdx >= 0 ? toX(aiIdx) : null

  const yTicks = [0, 0.5, 1].map((v) => ({
    label: (maxAvg * v).toFixed(1),
    y: PAD.top + (1 - v) * CH,
  }))

  return (
    <div className="rounded-lg border bg-card p-4 space-y-4">
      <div>
        <p className="text-sm font-semibold">Impacto da IA no seu ritmo</p>
        <p className="text-xs text-muted-foreground">evolução do tempo médio de resolução</p>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex flex-col items-center">
          {gainPct != null ? (
            <>
              <span
                className={`text-4xl font-bold tabular-nums ${isFaster ? 'text-green-500' : 'text-amber-500'}`}
              >
                {isFaster ? `-${gainPct}%` : `+${Math.abs(gainPct)}%`}
              </span>
              <span className="text-xs text-muted-foreground mt-0.5">
                {isFaster ? 'mais rápido pós-IA' : 'mais lento pós-IA'}
              </span>
            </>
          ) : (
            <>
              <span className="text-2xl font-semibold text-muted-foreground">—</span>
              <span className="text-xs text-muted-foreground mt-0.5">aceleração não medida</span>
            </>
          )}
        </div>

        <div className="flex flex-col gap-1 text-xs text-muted-foreground">
          <span>
            <span className="font-medium text-foreground">{totalCards}</span> cards de histórico
          </span>
          <span>
            IA desde{' '}
            <span className="font-medium text-foreground">
              {new Date(aiStartDate).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}
            </span>
          </span>
        </div>
      </div>

      {!hasChart ? (
        <div className="flex items-center justify-center rounded-md border border-dashed bg-muted/30 h-16">
          <p className="text-xs text-muted-foreground">
            Dados insuficientes para gráfico (mínimo 2 meses)
          </p>
        </div>
      ) : (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" aria-label="Evolução do tempo médio de resolução">
          {yTicks.map(({ y }, i) => (
            <line
              key={i}
              x1={PAD.left} x2={PAD.left + CW}
              y1={y} y2={y}
              stroke="currentColor" strokeOpacity={0.07} strokeWidth={1}
            />
          ))}

          <line
            x1={PAD.left} x2={PAD.left}
            y1={PAD.top} y2={PAD.top + CH}
            stroke="currentColor" strokeOpacity={0.25} strokeWidth={1.5}
          />
          <line
            x1={PAD.left} x2={PAD.left + CW}
            y1={PAD.top + CH} y2={PAD.top + CH}
            stroke="currentColor" strokeOpacity={0.25} strokeWidth={1.5}
          />

          {yTicks.map(({ label, y }, i) => (
            <text key={i} x={PAD.left - 6} y={y + 4}
              textAnchor="end" fontSize={10} fill="currentColor" fillOpacity={0.45}>
              {label}h
            </text>
          ))}

          {aiX != null && (
            <g>
              <line
                x1={aiX} x2={aiX}
                y1={PAD.top} y2={PAD.top + CH}
                stroke="#a78bfa" strokeWidth={1.5} strokeDasharray="4 3"
              />
              <text x={aiX + 4} y={PAD.top + 11} fontSize={9} fill="#a78bfa">
                IA
              </text>
            </g>
          )}

          <path d={pathD} fill="none" stroke="#3b82f6" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

          {timeline.map((p, i) => (
            <circle
              key={p.month}
              cx={toX(i)} cy={toY(p.avgHours)} r={3}
              fill={p.month >= aiMonthStr ? '#22c55e' : '#3b82f6'}
            />
          ))}

          {timeline.length <= 8 &&
            timeline.map((p, i) => (
              <text
                key={p.month + '-label'}
                x={toX(i)} y={PAD.top + CH + 14}
                textAnchor="middle" fontSize={9} fill="currentColor" fillOpacity={0.4}
              >
                {formatMonth(p.month)}
              </text>
            ))}
        </svg>
      )}

      <div className="flex gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-full bg-blue-500/80" />
          pré-IA
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-full bg-green-500/80" />
          pós-IA
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-5 border-t-2 border-dashed border-purple-400" />
          início IA
        </span>
      </div>
    </div>
  )
}
