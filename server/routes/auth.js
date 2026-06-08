import { Router } from 'express'
import db from '../lib/db.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

router.post('/profile', requireAuth, async (req, res) => {
  const { full_name, phone } = req.body
  if (!full_name) return res.status(400).json({ error: 'full_name required' })
  try {
    const [row] = await db`
      INSERT INTO profiles (id, full_name, phone)
      VALUES (${req.user.id}, ${full_name}, ${phone ?? null})
      ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        phone     = COALESCE(EXCLUDED.phone, profiles.phone)
      RETURNING *`
    res.status(201).json(row)
  } catch (e) { res.status(400).json({ error: e.message }) }
})

router.get('/me', requireAuth, async (req, res) => {
  try {
    const meta = req.user.user_metadata || {}
    const [row] = await db`
      INSERT INTO profiles (id, full_name, phone)
      VALUES (${req.user.id}, ${meta.full_name || req.user.email}, ${meta.phone || null})
      ON CONFLICT (id) DO UPDATE SET
        full_name = COALESCE(profiles.full_name, EXCLUDED.full_name)
      RETURNING *`
    res.json({ ...row, email: req.user.email })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.put('/profile', requireAuth, async (req, res) => {
  const { full_name, phone, preferred_barber_id, notify_email, notify_sms } = req.body
  try {
    const [row] = await db`
      UPDATE profiles SET
        full_name            = COALESCE(${full_name            ?? null}, full_name),
        phone                = COALESCE(${phone                ?? null}, phone),
        preferred_barber_id  = COALESCE(${preferred_barber_id ?? null}, preferred_barber_id),
        notify_email         = COALESCE(${notify_email        ?? null}, notify_email),
        notify_sms           = COALESCE(${notify_sms          ?? null}, notify_sms)
      WHERE id = ${req.user.id}
      RETURNING *`
    res.json(row)
  } catch (e) { res.status(400).json({ error: e.message }) }
})

export default router
