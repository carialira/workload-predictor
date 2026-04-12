import type { IssueCard, RecommendRequest, RecommendResponse, TrainEvent } from '@/types'

export async function recommend(payload: RecommendRequest): Promise<RecommendResponse> {
  const res = await fetch('/recommend', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const { error } = await res.json()
    throw new Error(error ?? 'Erro ao buscar recomendações')
  }
  return res.json()
}

export async function fetchLabels(): Promise<string[]> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10_000)
  try {
    const res = await fetch('/labels', { signal: controller.signal })
    if (!res.ok) {
      const { error } = await res.json()
      throw new Error(error ?? 'Erro ao buscar labels')
    }
    return res.json()
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Servidor demorou para responder. Tente novamente.')
    }
    throw err
  } finally {
    clearTimeout(timeout)
  }
}

export async function fetchCards(epicKey: string): Promise<IssueCard[]> {
  const res = await fetch(`/cards?epicKey=${encodeURIComponent(epicKey)}`)
  if (!res.ok) {
    const { error } = await res.json()
    throw new Error(error ?? 'Erro ao buscar cards')
  }
  return res.json()
}

export async function* streamSyncCards(clearEmbeddings = false): AsyncGenerator<TrainEvent> {
  const res = await fetch('/sync-cards', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clearEmbeddings }),
  })
  if (!res.ok || !res.body) throw new Error('Erro ao sincronizar cards')

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          yield JSON.parse(line.slice(6)) as TrainEvent
        } catch { /* empty */ }
      }
    }
  }
}

export async function* streamTrain(): AsyncGenerator<TrainEvent> {
  const res = await fetch('/train', { method: 'POST' })
  if (!res.ok || !res.body) throw new Error('Erro ao iniciar treinamento')

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          yield JSON.parse(line.slice(6)) as TrainEvent
        } catch { /* empty */ }
      }
    }
  }
}
