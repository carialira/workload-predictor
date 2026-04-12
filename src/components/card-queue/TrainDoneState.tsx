import { PartyPopper } from 'lucide-react'

export function TrainDoneState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center gap-3 rounded-lg border border-dashed p-6">
      <PartyPopper className="h-8 w-8 text-green-500/70" />
      <div>
        <p className="text-sm font-medium text-muted-foreground">Modelo treinado</p>
        <p className="text-xs text-muted-foreground/60 mt-1">
          Informe a Epic ou História e clique em <span className="font-medium">Priorizar fila</span>.
        </p>
      </div>
    </div>
  )
}
