import { Zap, Clock, Sunrise } from 'lucide-react'
import { CardItem } from '@/components/CardItem'
import type { PrioritizedCard } from '@/types'

interface Props {
  cards: PrioritizedCard[]
}

export function CardList({ cards }: Props) {
  const todayCards = cards.filter((c) => c.fitsToday)
  const [startsToday, ...laterCards] = cards.filter((c) => !c.fitsToday)

  return (
    <div className="space-y-6 scrollbar-thin scrollbar-thumb-rounded scrollbar-thumb-muted/80 scrollbar-track-muted/20 pr-1">
      {todayCards.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-green-500" />
            <span className="text-sm font-semibold">Concluir hoje</span>
            <span className="text-xs text-muted-foreground">({todayCards.length} cards)</span>
          </div>
          {todayCards.map((card, i) => (
            <CardItem key={card.id} card={card} position={i + 1} />
          ))}
        </div>
      )}

      {startsToday && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Sunrise className="h-4 w-4 text-orange-400" />
            <span className="text-sm font-semibold text-orange-400">Inicia hoje</span>
            <span className="text-xs text-muted-foreground">(termina amanhã)</span>
          </div>
          <CardItem key={startsToday.id} card={startsToday} position={todayCards.length + 1} />
        </div>
      )}

      {laterCards.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold text-muted-foreground">Deixar para depois</span>
            <span className="text-xs text-muted-foreground">({laterCards.length} cards)</span>
          </div>
          {laterCards.map((card, i) => (
            <CardItem key={card.id} card={card} position={todayCards.length + i + 2} />
          ))}
        </div>
      )}
    </div>
  )
}
