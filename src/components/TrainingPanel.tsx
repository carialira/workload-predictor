import { useState } from 'react'
import { createPortal } from 'react-dom'
import { BrainCircuit, RefreshCw, DatabaseZap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const demoMode = import.meta.env.VITE_DEMO_MODE === 'true'

interface TrainingPanelProps {
  trainedOn: number
  training: boolean
  onTrain: () => void
  syncing: boolean
  onSync: (clearEmbeddings: boolean) => void
}


function SyncConfirmModal({ onConfirm, onCancel }: { onConfirm: (clear: boolean) => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card border rounded-lg shadow-lg p-5 w-80 space-y-4">
        <div>
          <p className="text-sm font-medium">Sincronizar dados do tracker</p>
          <p className="text-xs text-muted-foreground mt-1">
            Deseja limpar os embeddings do ChromaDB durante a sincronização?
          </p>
          <p className="text-xs text-muted-foreground/70 mt-2">
            Recomendado quando o conteúdo dos cards mudou desde o último treino. O próximo treino regenera os embeddings do zero.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <Button size="sm" variant="destructive" onClick={() => onConfirm(true)}>
            Sincronizar e limpar embeddings
          </Button>
          <Button size="sm" variant="outline" onClick={() => onConfirm(false)}>
            Sincronizar sem limpar
          </Button>
          <button
            type="button"
            onClick={onCancel}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}

export function TrainingPanel({ trainedOn, training, onTrain, syncing, onSync }: TrainingPanelProps) {
  const [showSyncModal, setShowSyncModal] = useState(false)

  function handleSyncClick() {
    setShowSyncModal(true)
  }

  function handleSyncConfirm(clear: boolean) {
    setShowSyncModal(false)
    onSync(clear)
  }

  return (
    <>
      {showSyncModal && createPortal(
        <SyncConfirmModal
          onConfirm={handleSyncConfirm}
          onCancel={() => setShowSyncModal(false)}
        />,
        document.body
      )}

      <div className="rounded-lg border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex flex-col justify-center items-start gap-1">
            <div className="flex items-center gap-2">
              <BrainCircuit className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Modelo</span>
            </div>
            {trainedOn > 0 && (
              <span className="text-xs text-muted-foreground">· treinado com {trainedOn} cards</span>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onTrain}
            disabled={training || syncing}
            className={cn(training ? 'cursor-not-allowed' : 'cursor-pointer')}
          >
            {training ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1.5" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            )}
            {training ? 'Treinando...' : 'Treinar modelo'}
          </Button>
        </div>

        {!demoMode && (
          <div className="border-t pt-3 space-y-2">
            <button
              type="button"
              onClick={handleSyncClick}
              disabled={syncing || training}
              className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <DatabaseZap className={`h-3.5 w-3.5 ${syncing ? 'animate-pulse' : ''}`} />
              {syncing ? 'Sincronizando...' : 'Sincronizar dados do tracker'}
            </button>
            <p className="text-xs text-muted-foreground/60">
              Busca novos cards, worklogs e comentários de resolução. Faça antes de treinar.
            </p>
          </div>
        )}

      </div>

    </>
  )
}
