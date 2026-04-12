import 'dotenv/config'
import * as use from '@tensorflow-models/universal-sentence-encoder'
export * as tf from '@tensorflow/tfjs'

let modelPromise = null

async function loadModel() {
  if (modelPromise) return modelPromise

  console.log('Carregando modelo USE...')
  modelPromise = use.load({
    modelUrl: 'http://localhost:3001/use-model/model.json',
    vocabUrl: 'http://localhost:3001/use-model/vocab.json',
  }).then((model) => {
    console.log('Modelo USE carregado.')
    return model
  })

  return modelPromise
}

export async function embedTexts(texts, { batchSize = 10, onProgress } = {}) {
  const encoder = await loadModel()
  const results = []
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize)
    const tensor = await encoder.embed(batch)
    const embeddings = await tensor.array()
    tensor.dispose()
    results.push(...embeddings)
    const done = Math.min(i + batchSize, texts.length)
    console.log(`Embeddings: ${done}/${texts.length}`)
    onProgress?.({ done, total: texts.length })
    await new Promise((r) => setImmediate(r))
  }
  return results
}

export async function embedText(text) {
  const results = await embedTexts([text])
  return results[0]
}

