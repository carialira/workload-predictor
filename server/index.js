import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import path from 'node:path'
import recommendRouter from './routes/recommend.js'
import cardsRouter from './routes/cards.js'
import trainRouter from './routes/train.js'
import labelsRouter from './routes/labels.js'
import syncCardsRouter from './routes/sync-cards.js'

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

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`))
