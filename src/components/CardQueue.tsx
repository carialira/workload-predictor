import type { PrioritizedCard, TrainEvent } from '@/types'
import { TrainingState } from './card-queue/TrainingState'
import { TrainDoneState } from './card-queue/TrainDoneState'
import { SyncState } from './card-queue/SyncState'
import { LoadingState } from './card-queue/LoadingState'
import { ErrorState } from './card-queue/ErrorState'
import { EmptyState } from './card-queue/EmptyState'
import { CardList } from './card-queue/CardList'

interface CardQueueProps {
  cards: PrioritizedCard[]
  loading: boolean
  error: string | null
  syncing?: boolean
  syncLog?: TrainEvent[]
  training?: boolean
  trainLog?: TrainEvent[]
  trainProgress?: number
}

export function CardQueue({
  cards,
  loading,
  error,
  syncing,
  syncLog = [],
  training,
  trainLog = [],
  trainProgress = 0,
}: CardQueueProps) {
  const syncDone = !syncing && syncLog.length > 0 && syncLog.at(-1)?.type === 'done'
  const trainDone = !training && trainLog.length > 0 && trainLog.at(-1)?.type === 'done'

  if (training) return <TrainingState trainLog={trainLog} trainProgress={trainProgress} />
  if (trainDone && cards.length === 0 && !loading) return <TrainDoneState />
  if ((syncing || syncDone) && cards.length === 0 && !loading) return <SyncState syncing={!!syncing} syncDone={syncDone} syncLog={syncLog} />
  if (loading) return <LoadingState />
  if (error) return <ErrorState error={error} />
  if (cards.length === 0) return <EmptyState />

  return <CardList cards={cards} />
}
