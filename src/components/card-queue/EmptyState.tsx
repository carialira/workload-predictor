import { ListChecks } from 'lucide-react'

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center gap-3 rounded-lg border border-dashed">
      <ListChecks className="h-8 w-8 text-muted-foreground/40" />
      <div>
        <p className="text-sm font-medium text-muted-foreground">Nenhum card priorizado ainda</p>
        <p className="text-xs text-muted-foreground/60 mt-1">
          Informe a chave da Epic ou História e clique em <span className="font-medium">Priorizar fila</span>
        </p>
      </div>
    </div>
  )
}
