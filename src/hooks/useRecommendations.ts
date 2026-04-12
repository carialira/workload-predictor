import { useState } from 'react'
import { recommend } from '@/services/api'
import type { PrioritizedCard, RecommendRequest } from '@/types'

interface UseRecommendationsState {
  cards: PrioritizedCard[]
  trainedOn: number
  loading: boolean
  error: string | null
}

export function useRecommendations() {
  const [state, setState] = useState<UseRecommendationsState>({
    cards: [],
    trainedOn: 0,
    loading: false,
    error: null,
  })

  async function fetchRecommendations(params: RecommendRequest) {
    setState((prev) => ({ ...prev, cards: [], loading: true, error: null }))
    try {
      const data = await recommend(params)
      setState({ cards: data.cards, trainedOn: data.trainedOn, loading: false, error: null })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido'
      setState((prev) => ({ ...prev, loading: false, error: message }))
    }
  }

  return { ...state, fetchRecommendations }
}
