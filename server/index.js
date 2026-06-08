import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'

import authRouter         from './routes/auth.js'
import servicesRouter     from './routes/services.js'
import barbersRouter      from './routes/barbers.js'
import appointmentsRouter from './routes/appointments.js'
import loyaltyRouter      from './routes/loyalty.js'
import staffRouter        from './routes/staff.js'
import ownerRouter        from './routes/owner.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root      = path.join(__dirname, '..')

const app = express()

app.use(cors())
app.use(express.json())

// Inject public Supabase credentials into a generated config script
app.get('/config.js', (req, res) => {
  res.type('application/javascript').send(
    `window.HARBOUR_CONFIG = ${JSON.stringify({
      supabaseUrl:     process.env.SUPABASE_URL     || '',
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
    })};`
  )
})

// Diagnostic route
app.get('/backend/debug', async (req, res) => {
  const connStr = process.env.DATABASE_URL || process.env.POSTGRES_URL
  let dbHost = 'MISSING'
  if (connStr) { try { dbHost = new URL(connStr).hostname } catch {} }
  let dbTest = 'not tested'
  try {
    const { default: db } = await import('./lib/db.js')
    await db`SELECT 1`
    dbTest = 'OK'
  } catch (e) {
    dbTest = e.message
  }
  res.json({
    DATABASE_URL:          process.env.DATABASE_URL          ? 'SET' : 'missing',
    POSTGRES_URL:          process.env.POSTGRES_URL          ? 'SET' : 'missing',
    DATABASE_HOST:         dbHost,
    SUPABASE_URL:          process.env.SUPABASE_URL          ? 'set' : 'missing',
    SERVICE_KEY:           (process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY) ? 'set' : 'MISSING',
    SUPABASE_ANON_KEY:     process.env.SUPABASE_ANON_KEY     ? 'set' : 'missing',
    DB_TEST:               dbTest,
  })
})

// API routes (using /backend prefix to avoid Vercel/Supabase proxy on /api)
app.use('/backend/auth',         authRouter)
app.use('/backend/services',     servicesRouter)
app.use('/backend/barbers',      barbersRouter)
app.use('/backend/appointments', appointmentsRouter)
app.use('/backend/loyalty',      loyaltyRouter)
app.use('/backend/staff',        staffRouter)
app.use('/backend/owner',        ownerRouter)

// Serve static files (HTML, uploads, JS)
app.use(express.static(root))

if (process.env.NODE_ENV !== 'production' || process.env.PORT) {
  const PORT = process.env.PORT || 3000
  app.listen(PORT, () => console.log(`Harbour Barbers running at http://localhost:${PORT}`))
}

export default app
