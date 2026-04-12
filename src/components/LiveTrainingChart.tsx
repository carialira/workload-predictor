import type { TrainEvent } from '@/types'

const W = 400
const H = 200
const PAD = { top: 16, right: 16, bottom: 36, left: 44 }
const CW = W - PAD.left - PAD.right
const CH = H - PAD.top - PAD.bottom

interface Props {
  trainLog: TrainEvent[]
  training: boolean
}

export function LiveTrainingChart({ trainLog, training }: Props) {
  const points = trainLog
    .filter((e) => e.type === 'progress' && e.epoch != null && e.loss != null)
    .map((e) => ({ epoch: e.epoch!, total: e.total ?? 100, loss: e.loss! }))

  const total = points[0]?.total ?? 100
  const maxLoss = points.length > 0 ? Math.max(...points.map((p) => p.loss)) * 1.1 : 1
  const minLoss = points.length > 0 ? Math.min(...points.map((p) => p.loss)) : 0
  const bestLoss = minLoss
  const lastPoint = points.at(-1)
  const isDone = !training && points.length > 0

  const toX = (epoch: number) => PAD.left + (epoch / (total - 1)) * CW
  const toY = (loss: number) => PAD.top + (1 - (loss / maxLoss)) * CH

  const pathD = points.map((p, i) =>
    `${i === 0 ? 'M' : 'L'}${toX(p.epoch).toFixed(1)},${toY(p.loss).toFixed(1)}`
  ).join(' ')

  const bestY = points.length > 0 ? toY(bestLoss) : PAD.top

  const yTicks = [0, 0.5, 1].map((v) => ({
    label: (maxLoss * v).toFixed(2),
    y: PAD.top + (1 - v) * CH,
  }))

  return (
    <div className="rounded-lg border bg-card p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">Treino em tempo real</p>
          <p className="text-xs text-muted-foreground">loss real do modelo</p>
        </div>
        {training && (
          <span className="text-xs text-muted-foreground animate-pulse">treinando...</span>
        )}
        {isDone && (
          <span className="text-xs text-green-600 dark:text-green-400 font-medium">
            concluído · melhor: {bestLoss.toFixed(4)}
          </span>
        )}
      </div>

      {points.length === 0 ? (
        <div className="flex items-center justify-center rounded-md border border-dashed bg-muted/30"
          style={{ height: H }}>
          <p className="text-xs text-muted-foreground">
            {training ? 'Aguardando épocas...' : 'Treine o modelo para ver a curva real'}
          </p>
        </div>
      ) : (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Loss real do treino">
          <rect x={PAD.left} y={bestY} width={CW} height={PAD.top + CH - bestY}
            fill="#22c55e" fillOpacity={0.06} />

          {yTicks.map(({ y }, i) => (
            <line key={i} x1={PAD.left} x2={PAD.left + CW} y1={y} y2={y}
              stroke="currentColor" strokeOpacity={0.07} strokeWidth={1} />
          ))}

          <line x1={PAD.left} x2={PAD.left} y1={PAD.top} y2={PAD.top + CH}
            stroke="currentColor" strokeOpacity={0.25} strokeWidth={1.5} />
          <line x1={PAD.left} x2={PAD.left + CW} y1={PAD.top + CH} y2={PAD.top + CH}
            stroke="currentColor" strokeOpacity={0.25} strokeWidth={1.5} />

          {yTicks.map(({ label, y }, i) => (
            <text key={i} x={PAD.left - 6} y={y + 4}
              textAnchor="end" fontSize={11} fill="currentColor" fillOpacity={0.45}>
              {label}
            </text>
          ))}

          <text x={PAD.left} y={PAD.top + CH + 14} textAnchor="middle" fontSize={11}
            fill="currentColor" fillOpacity={0.45}>0</text>
          <text x={PAD.left + CW} y={PAD.top + CH + 14} textAnchor="middle" fontSize={11}
            fill="currentColor" fillOpacity={0.45}>{total}</text>

          <text x={PAD.left + CW / 2} y={H - 2} textAnchor="middle" fontSize={12}
            fill="currentColor" fillOpacity={0.45}>Épocas</text>
          <text x={13} y={PAD.top + CH / 2} textAnchor="middle" fontSize={12}
            fill="currentColor" fillOpacity={0.45}
            transform={`rotate(-90, 13, ${PAD.top + CH / 2})`}>Loss</text>

          <line x1={PAD.left} x2={PAD.left + CW} y1={bestY} y2={bestY}
            stroke="#22c55e" strokeWidth={1.5} strokeDasharray="5 3" />

          {pathD && (
            <path d={pathD} fill="none" stroke="#3b82f6" strokeWidth={2.5}
              strokeLinejoin="round" strokeLinecap="round" />
          )}

          {lastPoint && (
            <circle cx={toX(lastPoint.epoch)} cy={toY(lastPoint.loss)} r={4} fill="#3b82f6" />
          )}

          {lastPoint && (
            <>
              <text x={PAD.left + CW - 2} y={PAD.top + 12} textAnchor="end"
                fontSize={11} fill="currentColor" fillOpacity={0.5}>
                época {lastPoint.epoch + 1}/{total}
              </text>
              <text x={PAD.left + CW - 2} y={PAD.top + 24} textAnchor="end"
                fontSize={12} fontWeight="bold" fill="#3b82f6">
                {lastPoint.loss.toFixed(4)}
              </text>
            </>
          )}
        </svg>
      )}

      <div className="flex gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-5 h-0.5 bg-blue-500 rounded" />
          loss
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-5 h-0.5 bg-green-500 rounded" style={{ borderTop: '2px dashed' }} />
          melhor até agora
        </span>
      </div>
    </div>
  )
}
