import { parentPort } from 'node:worker_threads'
import * as tf from '@tensorflow/tfjs'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { getTrainingCards } from '../services/TrackerService.js'
import { embedTexts } from '../services/EmbeddingService.js'
import { upsertCards, getExistingEmbeddings } from '../services/ChromaService.js'
import { cache } from '../services/ModelCache.js'
import { MODEL_PATH, AI_START_DATE_ISO, MIN_BASELINE_CARDS, MIN_PAIRS_FOR_RATE } from '../config/constants.js'

const AI_START_DATE = new Date(AI_START_DATE_ISO)

function send(data) {
  parentPort.postMessage(data)
}

function percentile(sortedValues, p) {
  return sortedValues[Math.floor(sortedValues.length * p)]
}

function normalize(values) {
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  return { normalized: values.map((v) => (v - min) / range), min, max }
}

function layerUnits(n) {
  if (n > 1000) return [256, 128, 64]
  if (n > 300) return [128, 64, null]
  return [64, 32, null]
}

function trainingParams(n) {
  if (n > 1000) return { maxEpochs: 500, patience: 30 }
  if (n > 300) return { maxEpochs: 350, patience: 20 }
  return { maxEpochs: 200, patience: 15 }
}

function dotProduct(a, b) {
  let sum = 0
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i]
  return sum
}

function computeAccelerationRate(preCards, preEmbeddings, postCards, postEmbeddings) {
  const K = 3
  const MIN_SIM = 0.65
  const ratios = []

  for (let pi = 0; pi < postCards.length; pi++) {
    const postHours = postCards[pi].hoursToResolve
    if (!postHours || postHours <= 0) continue

    const sims = preCards
      .map((preCard, prIdx) => ({
        hours: preCard.hoursToResolve,
        sim: dotProduct(postEmbeddings[pi], preEmbeddings[prIdx]),
      }))
      .sort((a, b) => b.sim - a.sim)
      .slice(0, K)
      .filter((s) => s.sim >= MIN_SIM && s.hours > 0)

    if (sims.length === 0) continue

    const avgPreHours = sims.reduce((sum, s) => sum + s.hours, 0) / sims.length
    const ratio = postHours / avgPreHours

    if (ratio >= 0.1 && ratio <= 2) ratios.push(ratio)
  }

  if (ratios.length < MIN_PAIRS_FOR_RATE) return null
  return ratios.reduce((sum, r) => sum + r, 0) / ratios.length
}

try {
  send({ type: 'status', message: 'Buscando cards resolvidos no issue tracker...' })
  const cards = await getTrainingCards()

  if (cards.length < 10) {
    throw new Error(`Apenas ${cards.length} cards encontrados. São necessários pelo menos 10 para treinar.`)
  }

  send({ type: 'status', message: `${cards.length} cards encontrados. Verificando embeddings no ChromaDB...` })
  const cached = await getExistingEmbeddings(cards.map((c) => c.id))
  const newCards = cards.filter((c) => !cached[c.id])

  let allEmbeddings
  if (newCards.length === 0) {
    send({ type: 'status', message: 'Todos os embeddings já estão no ChromaDB.' })
    allEmbeddings = cards.map((c) => cached[c.id])
  } else {
    send({ type: 'embed_progress', done: 0, total: newCards.length })
    const newEmbeddings = await embedTexts(newCards.map((c) => c.fullText), {
      onProgress: ({ done, total }) => send({ type: 'embed_progress', done, total }),
    })
    await upsertCards(newCards, newEmbeddings)
    newCards.forEach((c, i) => { cached[c.id] = newEmbeddings[i] })
    allEmbeddings = cards.map((c) => cached[c.id])
  }

  const preAI = [], postAI = [], preEmbeddings = [], postEmbeddings = []
  cards.forEach((c, i) => {
    const d = c.resolvedAt ? new Date(c.resolvedAt) : null
    if (d && d >= AI_START_DATE) {
      postAI.push(c); postEmbeddings.push(allEmbeddings[i])
    } else {
      preAI.push(c); preEmbeddings.push(allEmbeddings[i])
    }
  })

  const hasEnoughBaseline = preAI.length >= MIN_BASELINE_CARDS

  let accelerationRate = null
  if (hasEnoughBaseline && postAI.length >= MIN_PAIRS_FOR_RATE) {
    accelerationRate = computeAccelerationRate(preAI, preEmbeddings, postAI, postEmbeddings)
    if (accelerationRate === null) {
      send({ type: 'status', message: `Baseline: ${preAI.length} cards pré-IA | Pós-IA: ${postAI.length} cards. Similaridade insuficiente para medir aceleração.` })
    } else {
      const gain = Math.round((1 - accelerationRate) * 100)
      send({ type: 'status', message: `Aceleração por IA medida: ${gain}% mais rápido que o baseline (${preAI.length} pré-IA, ${postAI.length} pós-IA).` })
    }
  } else {
    send({ type: 'status', message: `${cards.length} cards carregados. Sem grupos suficientes para calcular aceleração — treinando com horas originais.` })
  }

  const trainingCards = cards.map((c) => {
    const isPre = preAI.includes(c)
    if (isPre && accelerationRate !== null) {
      return { ...c, hoursToResolve: c.hoursToResolve * accelerationRate }
    }
    return c
  })

  const sortedHours = trainingCards.map((c) => c.hoursToResolve).sort((a, b) => a - b)
  const p95 = percentile(sortedHours, 0.95)
  const filteredPairs = trainingCards
    .map((c, i) => ({ card: c, embedding: allEmbeddings[i] }))
    .filter(({ card }) => card.hoursToResolve <= p95)

  const removedCount = trainingCards.length - filteredPairs.length
  if (removedCount > 0) {
    send({ type: 'status', message: `${removedCount} card(s) removido(s) como outlier (acima de ${p95.toFixed(1)}h — p95).` })
  }

  const hours = filteredPairs.map(({ card }) => card.hoursToResolve)
  const filteredEmbeddings = filteredPairs.map(({ embedding }) => embedding)
  const { normalized: normalizedHours, min, max } = normalize(hours)

  fs.mkdirSync(MODEL_PATH, { recursive: true })
  fs.writeFileSync(path.join(MODEL_PATH, 'stats.json'), JSON.stringify({ min, max, accelerationRate }))

  const n = filteredPairs.length
  const { maxEpochs, patience } = trainingParams(n)

  send({ type: 'status', message: `Treinando rede neural com ${n} cards (até ${maxEpochs} épocas, early stopping patience=${patience})...` })

  const xTensor = tf.tensor2d(filteredEmbeddings)
  const yTensor = tf.tensor2d(normalizedHours, [normalizedHours.length, 1])

  const [u1, u2, u3] = layerUnits(n)

  const model = tf.sequential()
  model.add(tf.layers.dense({ units: u1, activation: 'relu', inputShape: [512] }))
  if (n > 300) model.add(tf.layers.dropout({ rate: 0.2 }))
  model.add(tf.layers.dense({ units: u2, activation: 'relu' }))
  if (u3) model.add(tf.layers.dense({ units: u3, activation: 'relu' }))
  model.add(tf.layers.dense({ units: 1 }))
  model.compile({ optimizer: tf.train.adam(0.001), loss: 'meanSquaredError' })

  let stoppedAtEpoch = maxEpochs
  await model.fit(xTensor, yTensor, {
    epochs: maxEpochs,
    batchSize: 32,
    validationSplit: 0.1,
    shuffle: true,
    callbacks: [
      tf.callbacks.earlyStopping({ monitor: 'val_loss', patience }),
      new tf.CustomCallback({
        onEpochEnd: async (epoch, logs) => {
          stoppedAtEpoch = epoch + 1
          if ((epoch + 1) % 10 === 0) {
            send({
              type: 'progress',
              epoch: epoch + 1,
              total: maxEpochs,
              loss: Number.parseFloat(logs.loss?.toFixed(4) ?? 0),
            })
          }
        },
      }),
    ],
  })
  send({ type: 'status', message: `Treino concluído na época ${stoppedAtEpoch}/${maxEpochs}.` })

  const weights = model.getWeights().map((w) => ({
    name: w.name,
    shape: w.shape,
    dtype: w.dtype,
    data: Array.from(w.dataSync()),
  }))
  fs.writeFileSync(
    path.join(MODEL_PATH, 'model.json'),
    JSON.stringify({ topology: model.toJSON(), weights })
  )

  xTensor.dispose()
  yTensor.dispose()

  cache.model = null
  cache.stats = null

  send({ type: 'done', cards: trainingCards.length, accelerationRate })
} catch (err) {
  send({ type: 'error', message: err.message })
}
