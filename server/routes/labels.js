import { Router } from 'express'
import { getLabels } from '../services/TrackerService.js'

const router = Router()

router.get('/', async (req, res) => {
  try {
    const labels = await getLabels()
    res.json(labels)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

export default router
