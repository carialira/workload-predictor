import { Router } from 'express'
import { Worker } from 'node:worker_threads'
import { fileURLToPath } from 'node:url'

const router = Router()
const WORKER_PATH = fileURLToPath(new URL('../workers/syncWorker.js', import.meta.url))

router.post('/', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()
  res.socket?.setNoDelay(true)

  function send(data) {
    res.write(`data: ${JSON.stringify(data)}\n\n`)
    if (typeof res.flush === 'function') res.flush()
  }

  const { clearEmbeddings = false } = req.body ?? {}

  const worker = new Worker(WORKER_PATH, {
    workerData: { clearEmbeddings },
  })

  worker.on('message', (event) => {
    send(event)
    if (event.type === 'done' || event.type === 'error') {
      res.end()
    }
  })

  worker.on('error', (err) => {
    send({ type: 'error', message: err.message })
    res.end()
  })

  worker.on('exit', (code) => {
    if (code !== 0 && !res.writableEnded) {
      send({ type: 'error', message: `Worker encerrou com código ${code}` })
      res.end()
    }
  })

  req.on('close', () => {
    if (!res.writableEnded) worker.terminate()
  })
})

export default router
