import { Router } from 'express'
import { getLabels } from '../services/TrackerService.js'
import { logger } from '../lib/logger.js'

const router = Router()

router.get('/', async (req, res) => {
  try {
    const labels = await getLabels()
    res.json(labels)
  } catch (err) {
    logger.error({ err }, 'Erro em GET /labels')
    res.status(500).json({ error: err.message })
  }
})

export default router
