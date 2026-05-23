import { Router } from 'express'
import { getOpenCards, getOpenCardsByStory } from '../services/TrackerService.js'
import { logger } from '../lib/logger.js'

const router = Router()

router.get('/', async (req, res) => {
  try {
    const { mode = 'epic', epicKey, parentKey, labels } = req.query

    if (mode === 'epic') {
      if (!epicKey || typeof epicKey !== 'string') {
        return res.status(400).json({ error: 'epicKey é obrigatório para modo epic' })
      }
      const cards = await getOpenCards(epicKey, labels ?? null)
      return res.json(cards)
    }

    if (mode === 'story') {
      if (!parentKey || typeof parentKey !== 'string') {
        return res.status(400).json({ error: 'parentKey é obrigatório para modo história' })
      }
      const cards = await getOpenCardsByStory(parentKey, labels ?? null)
      return res.json(cards)
    }

    res.status(400).json({ error: 'mode inválido. Use "epic" ou "story"' })
  } catch (err) {
    logger.error({ err }, 'Erro em GET /cards')
    res.status(500).json({ error: err.message })
  }
})

export default router
