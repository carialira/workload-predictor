import { BrainCircuit, CheckCircle2, XCircle } from 'lucide-react'
import type { TrainEvent } from '@/types'

interface Props {
  trainLog: TrainEvent[]
  trainProgress: number
}

function eventColor(type: string) {
  if (type === 'error') return 'text-destructive'
  if (type === 'done') return 'text-green-600 dark:text-green-400'
  return ''
}

export function TrainingState({ trainLog, trainProgress }: Props) {
  const embedEvent = trainLog.find((e) => e.type === 'embed_progress')
  const epochEvent = trainLog.find((e) => e.type === 'progress')
  const statusMsg = trainLog.findLast((e) => e.type === 'status')?.message
  const isEmbedding = !!embedEvent && !epochEvent
  const isEpoch = !!epochEvent

  return (
    <div className="flex flex-col h-full rounded-lg border border-dashed">
      <div className="flex flex-col items-center text-center gap-3 p-6 shrink-0">
        <BrainCircuit className="h-8 w-8 text-muted-foreground/40 animate-pulse" />
        <div>
          <p className="text-sm font-medium text-muted-foreground">Treinando modelo...</p>
          {statusMsg && (
            <p className="text-xs text-muted-foreground/60 mt-1">{statusMsg}</p>
          )}
        </div>
        {(isEmbedding || isEpoch) && (
          <div className="w-full max-w-sm space-y-1.5">
            <div className="flex justify-between items-center text-xs text-muted-foreground">
              <span>{isEpoch ? 'Treinando épocas' : 'Gerando embeddings'}</span>
              {isEpoch && <span className="font-mono">{trainProgress}%</span>}
            </div>
            <div className="relative w-full bg-muted rounded-full h-1.5 overflow-hidden">
              {isEpoch ? (
                <div
                  className="h-full bg-primary transition-all duration-300 rounded-full"
                  style={{ width: `${trainProgress}%` }}
                />
              ) : (
                <div className="absolute h-full w-2/5 bg-primary rounded-full animate-[loading_1.5s_ease-in-out_infinite]" />
              )}
            </div>
            {isEmbedding && embedEvent && (
              <p className="text-xs text-muted-foreground font-mono text-right">
                {embedEvent.done}/{embedEvent.total} cards
              </p>
            )}
          </div>
        )}
      </div>

      {trainLog.length > 0 && (
        <div className="flex-1 min-h-0 px-4 pb-4 relative">
          <div className="font-mono text-xs text-muted-foreground space-y-1 h-full overflow-y-auto rounded-md bg-muted/40 px-2 py-1.5 [scrollbar-width:thin] [scrollbar-color:var(--border)_transparent] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border">
            {trainLog.map((event, i) => (
              <div key={`${event.type}-${i}`} className="flex items-start gap-1.5">
                {event.type === 'done' && <CheckCircle2 className="h-3 w-3 text-green-500 mt-0.5 shrink-0" />}
                {event.type === 'error' && <XCircle className="h-3 w-3 text-destructive mt-0.5 shrink-0" />}
                {(event.type === 'status' || event.type === 'progress' || event.type === 'embed_progress') && (
                  <span className="text-muted-foreground/40 shrink-0">›</span>
                )}
                <span className={eventColor(event.type)}>
                  {event.type === 'progress'
                    ? `Época ${event.epoch}/${event.total} — loss: ${event.loss}`
                    : event.message}
                </span>
              </div>
            ))}
          </div>
          <div className="pointer-events-none absolute bottom-4 left-4 right-4 h-6 rounded-b-md bg-linear-to-t from-muted/40 to-transparent" />
        </div>
      )}
    </div>
  )
}
