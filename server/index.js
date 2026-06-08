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

// API routes
app.use('/api/auth',         authRouter)
app.use('/api/services',     servicesRouter)
app.use('/api/barbers',      barbersRouter)
app.use('/api/appointments', appointmentsRouter)
app.use('/api/loyalty',      loyaltyRouter)
app.use('/api/staff',        staffRouter)
app.use('/api/owner',        ownerRouter)

// Serve static files (HTML, uploads, JS)
app.use(express.static(root))

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Harbour Barbers running at http://localhost:${PORT}`)
})
