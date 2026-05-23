import { Router } from 'express'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { logger } from '../lib/logger.js'
import { MODEL_PATH, AI_START_DATE_ISO, LOCAL_CARDS_PATH } from '../config/constants.js'

const router = Router()
const EXAMPLE_CARDS_PATH = path.resolve('./data/tracker-cards.example.json')

router.get('/', (req, res) => {
  try {
    const statsPath = path.resolve(`${MODEL_PATH}/stats.json`)
    if (!fs.existsSync(statsPath)) {
      return res.status(404).json({ error: 'Model not trained' })
    }

    const stats = JSON.parse(fs.readFileSync(statsPath, 'utf-8'))
    const trainingDate = fs.statSync(statsPath).mtime.toISOString()

    const demoMode = process.env.DEMO_MODE === 'true'
    const cardsPath = path.resolve(demoMode ? EXAMPLE_CARDS_PATH : LOCAL_CARDS_PATH)

    let timeline = []
    let totalCards = 0

    if (fs.existsSync(cardsPath)) {
      const cards = JSON.parse(fs.readFileSync(cardsPath, 'utf-8'))
      totalCards = cards.length

      const byMonth = {}
      for (const card of cards) {
        if (!card.resolvedAt || !card.hoursToResolve) continue
        const month = card.resolvedAt.slice(0, 7)
        if (!byMonth[month]) byMonth[month] = { totalHours: 0, count: 0 }
        byMonth[month].totalHours += card.hoursToResolve
        byMonth[month].count++
      }

      timeline = Object.entries(byMonth)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, { totalHours, count }]) => ({
          month,
          avgHours: parseFloat((totalHours / count).toFixed(2)),
          cardCount: count,
        }))
    }

    res.json({
      accelerationRate: stats.accelerationRate ?? null,
      totalCards,
      aiStartDate: AI_START_DATE_ISO,
      trainingDate,
      timeline,
    })
  } catch (err) {
    logger.error({ err }, 'Erro em GET /stats')
    res.status(500).json({ error: err.message })
  }
})

export default router
