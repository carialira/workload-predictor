import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { logger } from './lib/logger.js'
import recommendRouter from './routes/recommend.js'
import cardsRouter from './routes/cards.js'
import trainRouter from './routes/train.js'
import labelsRouter from './routes/labels.js'
import syncCardsRouter from './routes/sync-cards.js'
import statsRouter from './routes/stats.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json())
app.use('/use-model', express.static(path.resolve('./data/user-model')))

app.use('/recommend', recommendRouter)
app.use('/cards', cardsRouter)
app.use('/train', trainRouter)
app.use('/labels', labelsRouter)
app.use('/sync-cards', syncCardsRouter)
app.use('/stats', statsRouter)

if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '../dist')
  app.use(express.static(distPath))
  app.get('/{*splat}', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'))
  })
}

app.listen(PORT, () => logger.info(`Server running on http://localhost:${PORT}`))
