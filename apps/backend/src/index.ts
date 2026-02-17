import express from 'express'
import cors from 'cors'

const app = express()
const PORT = process.env['PORT'] ?? 3001

app.use(cors())
app.use(express.json())

app.get('/', (_req, res) => {
  res.json({ status: 'ds-map-tool', timestamp: new Date().toISOString() })
})

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`)
})
