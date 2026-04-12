import { Clock, AlertCircle, CheckSquare, ExternalLink, MessageSquare } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { PrioritizedCard } from '@/types'

interface CardItemProps {
  card: PrioritizedCard
  position: number
}

function IssueTypeIcon({ type }: { type: string }) {
  if (type === 'Defect' || type === 'Bug') {
    return <AlertCircle className="h-4 w-4 text-destructive" />
  }
  return <CheckSquare className="h-4 w-4 text-primary" />
}

function formatHours(hours: number): string {
  if (hours < 1) return `~${Math.round(hours * 60)}min`
  if (hours < 24) return `~${hours.toFixed(1)}h`
  const days = Math.floor(hours / 8)
  return `~${days}d`
}

export function CardItem({ card, position }: CardItemProps) {
  const trackerUrl = `${import.meta.env.VITE_TRACKER_BASE_URL}/browse/${card.id}`

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-muted-foreground text-sm font-medium shrink-0">{position}.</span>
            <IssueTypeIcon type={card.type} />
            <span className="font-medium text-sm wrap-break-word min-w-0">{card.summary}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {(card.commentCount ?? 0) > 0 && (
              <div className="flex items-center gap-1 text-amber-500 text-sm" title={`${card.commentCount} comentário(s) — tempo de análise incluído`}>
                <MessageSquare className="h-3.5 w-3.5" />
                <span>{card.commentCount}</span>
              </div>
            )}
            <div className="flex items-center gap-1 text-muted-foreground text-sm">
              <Clock className="h-3.5 w-3.5" />
              <span>{formatHours(card.estimatedHours)}</span>
            </div>
            <a href={trackerUrl} target="_blank" rel="noreferrer">
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
            </a>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-wrap gap-1 mb-2">
          <Badge variant="outline">{card.type}</Badge>
          {card.labels.map((label) => (
            <Badge key={label} variant="secondary">{label}</Badge>
          ))}
          {card.components.map((comp) => (
            <Badge key={comp} variant="secondary">{comp}</Badge>
          ))}
        </div>
        {card.similarCards.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Similares:{' '}
            {card.similarCards.slice(0, 3).map((s, i) => (
              <span key={s.id}>
                {i > 0 && ' · '}
                <span className="font-mono">{s.id}</span>
                {' '}({formatHours(s.hoursToResolve)})
              </span>
            ))}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
