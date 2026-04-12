import 'dotenv/config'
import { ChromaClient } from 'chromadb'

const client = new ChromaClient({ path: process.env.CHROMA_URL ?? 'http://localhost:8000' })

const COLLECTION_NAME = 'issue_cards'

export async function getCollection() {
  return client.getOrCreateCollection({ name: COLLECTION_NAME, embeddingFunction: null })
}

export async function deleteCollection() {
  try {
    await client.deleteCollection({ name: COLLECTION_NAME })
  } catch {
    // coleção pode não existir ainda — ignorar
  }
}

export async function upsertCards(cards, embeddings) {
  const collection = await getCollection()
  await collection.upsert({
    ids: cards.map((c) => c.id),
    embeddings,
    metadatas: cards.map((c) => ({
      type: c.type,
      labels: c.labels.join(','),
      components: c.components.join(','),
      hoursToResolve: c.hoursToResolve,
      summary: c.summary,
      resolvedAt: c.resolvedAt ?? '',
    })),
    documents: cards.map((c) => c.fullText),
  })
}

export async function getExistingEmbeddings(ids) {
  const collection = await getCollection()
  const result = await collection.get({ ids, include: ['embeddings'] })
  const map = {}
  result.ids.forEach((id, i) => { map[id] = result.embeddings[i] })
  return map
}

export async function queryNearest(embedding, nResults = 100) {
  const collection = await getCollection()
  return collection.query({ queryEmbeddings: [embedding], nResults })
}
