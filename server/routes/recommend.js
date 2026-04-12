import { Router } from 'express'
import * as tf from '@tensorflow/tfjs'
import * as path from 'node:path'
import * as fs from 'node:fs'
import { getOpenCards, getOpenCardsByStory } from '../services/TrackerService.js'
import { embedTexts } from '../services/EmbeddingService.js'
import { queryNearest } from '../services/ChromaService.js'
import { cache } from '../services/ModelCache.js'
import { MIN_HOURS, MODEL_PATH } from '../config/constants.js'

const router = Router()

async function loadModel() {
  if (cache.model) return cache.model
  const modelFile = path.resolve(`${MODEL_PATH}/model.json`)
  if (!fs.existsSync(modelFile)) throw new Error('Modelo não encontrado. Execute npm run seed primeiro.')
  const { weights } = JSON.parse(fs.readFileSync(modelFile, 'utf-8'))
  const model = tf.sequential()
  model.add(tf.layers.dense({ units: 64, activation: 'relu', inputShape: [512] }))
  model.add(tf.layers.dense({ units: 32, activation: 'relu' }))
  model.add(tf.layers.dense({ units: 1 }))
  model.compile({ optimizer: tf.train.adam(0.001), loss: 'meanSquaredError' })
  model.setWeights(weights.map((w) => tf.tensor(w.data, w.shape, w.dtype)))
  cache.stats = JSON.parse(fs.readFileSync(path.resolve(`${MODEL_PATH}/stats.json`), 'utf-8'))
  cache.model = model
  return model
}

function denormalize(value, min, max) {
  return value * (max - min) + min
}

async function predictBatch(net, embeddings) {
  const tensor = tf.tensor2d(embeddings)
  const pred = net.predict(tensor)
  const data = Array.from(await pred.data())
  tensor.dispose()
  pred.dispose()
  return data
}

router.post('/', async (req, res) => {
  try {
    const { mode = 'epic', epicKey, parentKey, labels, hoursAvailableToday = 8 } = req.body

    if (mode === 'epic' && !epicKey) return res.status(400).json({ error: 'epicKey é obrigatório para modo epic' })
    if (mode === 'story' && !parentKey) return res.status(400).json({ error: 'parentKey é obrigatório para modo história' })

    const accelerationFactor = cache.stats?.accelerationRate ?? 1

    const net = await loadModel()

    let openCards
    if (mode === 'story') {
      openCards = await getOpenCardsByStory(parentKey, labels)
    } else {
      openCards = await getOpenCards(epicKey, labels)
    }
    if (openCards.length === 0) return res.json({ cards: [], trainedOn: 0 })

    const embeddings = await embedTexts(openCards.map((c) => c.fullText))

    const [normalizedEstimates, nearestResults] = await Promise.all([
      predictBatch(net, embeddings),
      Promise.all(embeddings.map((emb) => queryNearest(emb, 100))),
    ])

    const prioritized = openCards.map((card, idx) => {
      const nearest = nearestResults[idx]
      const rawHours = denormalize(normalizedEstimates[idx], cache.stats.min, cache.stats.max)
      const commentPenalty = (card.commentCount ?? 0) * 0.25
      const estimatedHours = Math.max(MIN_HOURS, Math.max(0, rawHours) * accelerationFactor + commentPenalty)

      const similarCards = (nearest.ids[0] ?? []).map((id, i) => ({
        id,
        summary: nearest.metadatas[0][i]?.summary ?? '',
        hoursToResolve: nearest.metadatas[0][i]?.hoursToResolve ?? 0,
        distance: nearest.distances[0][i] ?? 1,
      }))

      return { ...card, estimatedHours, similarCards }
    })

    prioritized.sort((a, b) => a.estimatedHours - b.estimatedHours)

    let accumulated = 0
    for (const card of prioritized) {
      accumulated += card.estimatedHours
      card.fitsToday = accumulated <= hoursAvailableToday
    }

    const trainedOn = (await (await import('../services/ChromaService.js')).getCollection()).count()

    res.json({ cards: prioritized, trainedOn: await trainedOn })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

export default router
