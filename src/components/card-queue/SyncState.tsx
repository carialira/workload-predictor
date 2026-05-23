import { DatabaseZap, CheckCircle2, XCircle, PartyPopper } from 'lucide-react'
import type { TrainEvent } from '@/types'

interface Props {
  syncing: boolean
  syncDone: boolean
  syncLog: TrainEvent[]
}

function eventColor(type: string) {
  if (type === 'error') return 'text-destructive'
  if (type === 'done') return 'text-green-600 dark:text-green-400'
  return ''
}

export function SyncState({ syncDone, syncLog }: Props) {
  return (
    <div className="flex flex-col h-full rounded-lg border border-dashed">
      <div className="flex flex-col items-center text-center gap-3 p-6 shrink-0">
        {syncDone
          ? <PartyPopper className="h-8 w-8 text-green-500/70" />
          : <DatabaseZap className="h-8 w-8 text-muted-foreground/40 animate-pulse" />
        }
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            {syncDone ? 'Sincronização concluída' : 'Sincronizando dados do tracker'}
          </p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            {syncDone
              ? 'Agora treine o modelo para usar os dados atualizados e priorizar sua fila.'
              : 'Buscando cards, worklogs e comentários de resolução…'}
          </p>
        </div>
      </div>

      {syncLog.length > 0 && (
        <div className="flex-1 min-h-0 px-4 pb-4 relative">
          <div className="font-mono text-xs text-muted-foreground space-y-1 h-full overflow-y-auto rounded-md bg-muted/40 px-2 py-1.5 [scrollbar-width:thin] [scrollbar-color:var(--border)_transparent] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border">
            {syncLog.map((event, i) => (
              <div key={`${event.type}-${i}`} className="flex items-start gap-1.5">
                {event.type === 'done' && <CheckCircle2 className="h-3 w-3 text-green-500 mt-0.5 shrink-0" />}
                {event.type === 'error' && <XCircle className="h-3 w-3 text-destructive mt-0.5 shrink-0" />}
                {event.type === 'status' && <span className="text-muted-foreground/40 shrink-0">›</span>}
                <span className={eventColor(event.type)}>{event.message}</span>
              </div>
            ))}
          </div>
          <div className="pointer-events-none absolute bottom-4 left-4 right-4 h-6 rounded-b-md bg-linear-to-t from-muted/40 to-transparent" />
        </div>
      )}
    </div>
  )
}
