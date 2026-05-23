import { useState, useEffect } from 'react'
import type { ImpactStats } from '@/types'

export function useImpactStats(trainedOn: number) {
  const [data, setData] = useState<ImpactStats | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (trainedOn === 0) return
    const controller = new AbortController()

    fetch('/stats', { signal: controller.signal })
      .then((res) => {
        if (res.status === 404) return null
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json() as Promise<ImpactStats>
      })
      .then((d) => setData(d))
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === 'AbortError') return
        setError(err instanceof Error ? err.message : 'Erro ao buscar estatísticas')
      })

    return () => controller.abort()
  }, [trainedOn])

  return { data, error }
}
