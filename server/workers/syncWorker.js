import { parentPort, workerData } from 'node:worker_threads'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { fetchAllTrainingCards } from '../services/TrackerService.js'
import { deleteCollection } from '../services/ChromaService.js'
import { MIN_HOURS, LOCAL_CARDS_PATH as CARDS_PATH } from '../config/constants.js'

const { clearEmbeddings } = workerData

function send(data) {
  parentPort.postMessage(data)
}

try {
  if (clearEmbeddings) {
    await deleteCollection()
    send({ type: 'status', message: 'Embeddings do ChromaDB removidos.' })
  }

  send({ type: 'status', message: 'Buscando cards no issue tracker...' })
  const cards = await fetchAllTrainingCards(({ fetched }) => {
    send({ type: 'status', message: `${fetched} cards coletados...` })
  })

  const normalized = cards.map((c) => ({
    ...c,
    hoursToResolve: Math.max(c.hoursToResolve ?? 0, MIN_HOURS),
  }))

  const localPath = path.resolve(CARDS_PATH)
  fs.mkdirSync(path.dirname(localPath), { recursive: true })
  fs.writeFileSync(localPath, JSON.stringify(normalized, null, 2))

  send({ type: 'done', message: `${normalized.length} cards salvos. Treine o modelo para aplicar.` })
} catch (err) {
  send({ type: 'error', message: err.message })
}
