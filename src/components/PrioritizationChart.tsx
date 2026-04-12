import type { PrioritizedCard } from '@/types'

const W = 400
const BAR_H = 22
const BAR_GAP = 6
const PAD = { top: 16, right: 16, bottom: 32, left: 16 }
const LABEL_W = 110

interface Props {
  cards: PrioritizedCard[]
  hoursAvailableToday?: number
}

function truncate(text: string, max: number) {
  return text.length > max ? text.slice(0, max - 1) + '…' : text
}

export function PrioritizationChart({ cards, hoursAvailableToday = 8 }: Props) {
  if (cards.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-4 space-y-2">
        <div>
          <p className="text-sm font-semibold">Distribuição de tempo</p>
          <p className="text-xs text-muted-foreground">estimativa por card priorizado</p>
        </div>
        <div className="flex items-center justify-center rounded-md border border-dashed bg-muted/30 h-24">
          <p className="text-xs text-muted-foreground">Priorize a fila para ver a distribuição</p>
        </div>
      </div>
    )
  }

  const todayCards = cards.filter((c) => c.fitsToday)
  const firstOverflow = cards.find((c) => !c.fitsToday)
  const visibleCards = firstOverflow ? [...todayCards, firstOverflow] : todayCards

  const maxHours = Math.max(...visibleCards.map((c) => c.estimatedHours), hoursAvailableToday) * 1.1
  const barAreaW = W - PAD.left - PAD.right - LABEL_W - 8
  const totalH = PAD.top + visibleCards.length * (BAR_H + BAR_GAP) - BAR_GAP + PAD.bottom

  const toBarW = (h: number) => (h / maxHours) * barAreaW

  const cutoffX = PAD.left + LABEL_W + 8 + toBarW(hoursAvailableToday)
  const cutoffCapped = Math.min(cutoffX, W - PAD.right)

  return (
    <div className="rounded-lg border bg-card p-4 space-y-2">
      <div>
        <p className="text-sm font-semibold">Distribuição de tempo</p>
        <p className="text-xs text-muted-foreground">estimativa por card priorizado</p>
      </div>

      <svg viewBox={`0 0 ${W} ${totalH}`} className="w-full" aria-label="Distribuição de tempo dos cards">
        {visibleCards.map((card, i) => {
          const y = PAD.top + i * (BAR_H + BAR_GAP)
          return (
            <rect
              key={card.id + '-track'}
              x={PAD.left + LABEL_W + 8}
              y={y}
              width={barAreaW}
              height={BAR_H}
              rx={4}
              fill="currentColor"
              fillOpacity={0.05}
            />
          )
        })}

        {visibleCards.map((card, i) => {
          const y = PAD.top + i * (BAR_H + BAR_GAP)
          const bw = toBarW(card.estimatedHours)
          const color = card.fitsToday ? '#22c55e' : '#94a3b8'
          const opacity = card.fitsToday ? 0.85 : 0.45

          return (
            <g key={card.id}>
              <text
                x={PAD.left + LABEL_W}
                y={y + BAR_H / 2 + 4}
                textAnchor="end"
                fontSize={11}
                fill="currentColor"
                fillOpacity={card.fitsToday ? 0.8 : 0.4}
              >
                {truncate(card.id, 14)}
              </text>

              <rect
                x={PAD.left + LABEL_W + 8}
                y={y}
                width={Math.max(bw, 4)}
                height={BAR_H}
                rx={4}
                fill={color}
                fillOpacity={opacity}
              />

              <text
                x={PAD.left + LABEL_W + 8 + Math.max(bw, 4) + 4}
                y={y + BAR_H / 2 + 4}
                fontSize={11}
                fill="currentColor"
                fillOpacity={0.6}
              >
                {card.estimatedHours.toFixed(1)}h
              </text>
            </g>
          )
        })}

        {hoursAvailableToday > 0 && cutoffCapped < W - PAD.right && (
          <g>
            <line
              x1={cutoffCapped} x2={cutoffCapped}
              y1={PAD.top - 4} y2={totalH - PAD.bottom}
              stroke="#f97316" strokeWidth={1.5} strokeDasharray="4 3"
            />
            <text x={cutoffCapped + 4} y={PAD.top + 10} fontSize={10} fill="#f97316">
              {hoursAvailableToday}h
            </text>
          </g>
        )}

        <line
          x1={PAD.left + LABEL_W + 8} x2={W - PAD.right}
          y1={totalH - PAD.bottom} y2={totalH - PAD.bottom}
          stroke="currentColor" strokeOpacity={0.15} strokeWidth={1}
        />

        {[0, 0.25, 0.5, 0.75, 1].map((v) => {
          const x = PAD.left + LABEL_W + 8 + v * barAreaW
          const label = (maxHours * v).toFixed(v === 0 ? 0 : 1)
          return (
            <text key={v} x={x} y={totalH - PAD.bottom + 14}
              textAnchor="middle" fontSize={10} fill="currentColor" fillOpacity={0.35}>
              {label}h
            </text>
          )
        })}
      </svg>

      <div className="flex gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm bg-green-500/80" />Concluir hoje</span>
        <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm bg-slate-400/45" />Inicia hoje</span>
        <span className="flex items-center gap-1.5"><span className="inline-block w-4 border-t-2 border-dashed border-orange-400" />Limite do dia</span>
      </div>
    </div>
  )
}
