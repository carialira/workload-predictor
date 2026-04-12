import { useState } from 'react'
import { EpicSelector } from '@/components/EpicSelector'
import { CardQueue } from '@/components/CardQueue'
import { TrainingPanel } from '@/components/TrainingPanel'
// import { TrainingCurveChart } from '@/components/TrainingCurveChart'
import { LiveTrainingChart } from '@/components/LiveTrainingChart'
import { PrioritizationChart } from '@/components/PrioritizationChart'
import { useRecommendations } from '@/hooks/useRecommendations'
import { streamTrain, streamSyncCards } from '@/services/api'
import type { TrainEvent } from '@/types'

function App() {
  const { cards, trainedOn, loading, error, fetchRecommendations } = useRecommendations()

  const [hoursAvailableToday, setHoursAvailableToday] = useState(8)
  const [training, setTraining] = useState(false)
  const [trainLog, setTrainLog] = useState<TrainEvent[]>([])
  const [trainProgress, setTrainProgress] = useState(0)
  const [syncing, setSyncing] = useState(false)
  const [syncLog, setSyncLog] = useState<TrainEvent[]>([])

  async function handleSync(clearEmbeddings: boolean) {
    setSyncing(true)
    setSyncLog([])
    try {
      for await (const event of streamSyncCards(clearEmbeddings)) {
        setSyncLog((prev) => [...prev, event])
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido'
      setSyncLog((prev) => [...prev, { type: 'error', message }])
    } finally {
      setSyncing(false)
    }
  }

  async function handleTrain() {
    setTraining(true)
    setTrainLog([])
    setTrainProgress(0)
    try {
      for await (const event of streamTrain()) {
        setTrainLog((prev) => {
          if (event.type === 'progress') {
            return [...prev.filter((e) => e.type !== 'progress'), event]
          }
          if (event.type === 'embed_progress') {
            const withMessage = { ...event, message: `Gerando embeddings: ${event.done}/${event.total}` }
            return [...prev.filter((e) => e.type !== 'embed_progress'), withMessage]
          }
          return [...prev, event]
        })
        if (event.type === 'embed_progress' && event.done != null && event.total) {
          setTrainProgress(Math.round((event.done / event.total) * 50))
        }
        if (event.type === 'progress' && event.epoch && event.total) {
          setTrainProgress(50 + Math.round((event.epoch / event.total) * 50))
        }
        if (event.type === 'done') {
          setTrainProgress(100)
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido'
      setTrainLog((prev) => [...prev, { type: 'error', message }])
    } finally {
      setTraining(false)
    }
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      <div className="max-w-350 mx-auto w-full py-5 px-2 flex flex-col flex-1 min-h-0">
        <div className="mb-3 shrink-0">
          <h1 className="text-2xl font-semibold tracking-tight mb-1">Issue Queue Prioritizer</h1>
          <p className="text-sm text-muted-foreground">
            IA prioriza seus cards por tempo estimado de resolução, com base no seu histórico.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr_350px] gap-6 flex-1 min-h-0">
          <div className="space-y-4">
            <TrainingPanel
              trainedOn={trainedOn}
              training={training}
              onTrain={handleTrain}
              syncing={syncing}
              onSync={handleSync}
            />
            <EpicSelector
              onSubmit={(params) => {
                if (params.hoursAvailableToday) setHoursAvailableToday(params.hoursAvailableToday)
                fetchRecommendations(params)
              }}
              loading={loading}
            />
          </div>

          <div className="flex flex-col min-h-0">
            {cards.length > 0 && !loading && (
              <p className="text-sm text-muted-foreground shrink-0 pb-4 px-2">
                {cards.length} cards priorizados · modelo treinado com {trainedOn} cards resolvidos
              </p>
            )}
            <div className="overflow-y-auto px-2 pb-2 flex-1 [scrollbar-width:thin] [scrollbar-color:var(--border)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border">
              <CardQueue
                cards={cards}
                loading={loading}
                error={error}
                syncing={syncing}
                syncLog={syncLog}
                training={training}
                trainLog={trainLog}
                trainProgress={trainProgress}
              />
            </div>
          </div>

          <div className="space-y-4 overflow-y-auto">
            {/* <TrainingCurveChart /> */}
            <PrioritizationChart cards={cards} hoursAvailableToday={hoursAvailableToday} />
            <LiveTrainingChart trainLog={trainLog} training={training} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
