import { createClient } from '@supabase/supabase-js'
import db from '../lib/db.js'
import 'dotenv/config'

// Used only for JWT verification (auth endpoint, not data API)
const auth = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function verifyToken(req, res) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) { res.status(401).json({ error: 'Unauthorized' }); return null }

  const { data: { user }, error } = await auth.auth.getUser(token)
  if (error || !user) { res.status(401).json({ error: 'Unauthorized' }); return null }
  return user
}

export async function requireAuth(req, res, next) {
  const user = await verifyToken(req, res)
  if (!user) return
  req.user = user
  next()
}

export async function requireStaff(req, res, next) {
  const user = await verifyToken(req, res)
  if (!user) return

  const [profile] = await db`SELECT role FROM profiles WHERE id = ${user.id}`
  if (!profile || !['staff','owner'].includes(profile.role)) {
    return res.status(403).json({ error: 'Forbidden' })
  }
  req.user = user
  next()
}

export async function requireOwner(req, res, next) {
  const user = await verifyToken(req, res)
  if (!user) return

  const [profile] = await db`SELECT role FROM profiles WHERE id = ${user.id}`
  if (!profile || profile.role !== 'owner') {
    return res.status(403).json({ error: 'Forbidden' })
  }
  req.user = user
  next()
}
