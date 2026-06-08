import { Router } from 'express'
import { supabase } from '../lib/supabase.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

router.post('/profile', requireAuth, async (req, res) => {
  const { full_name, phone } = req.body
  if (!full_name) return res.status(400).json({ error: 'full_name required' })
  try {
    const { data: row, error } = await supabase
      .from('profiles')
      .upsert({
        id: req.user.id,
        full_name,
        phone: phone ?? null,
      }, {
        onConflict: 'id',
        ignoreDuplicates: false,
      })
      .select()
      .single()
    if (error) throw error
    res.status(201).json(row)
  } catch (e) { res.status(400).json({ error: e.message }) }
})

router.get('/me', requireAuth, async (req, res) => {
  try {
    const meta = req.user.user_metadata || {}
    const { data: row, error } = await supabase
      .from('profiles')
      .upsert({
        id: req.user.id,
        full_name: meta.full_name || req.user.email,
        phone: meta.phone || null,
      }, {
        onConflict: 'id',
        ignoreDuplicates: false,
      })
      .select()
      .single()
    if (error) throw error
    res.json({ ...row, email: req.user.email })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.put('/profile', requireAuth, async (req, res) => {
  const { full_name, phone, preferred_barber_id, notify_email, notify_sms } = req.body
  try {
    const updates = {}
    if (full_name           !== undefined) updates.full_name           = full_name
    if (phone               !== undefined) updates.phone               = phone
    if (preferred_barber_id !== undefined) updates.preferred_barber_id = preferred_barber_id
    if (notify_email        !== undefined) updates.notify_email        = notify_email
    if (notify_sms          !== undefined) updates.notify_sms          = notify_sms

    const { data: row, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', req.user.id)
      .select()
      .single()
    if (error) throw error
    res.json(row)
  } catch (e) { res.status(400).json({ error: e.message }) }
})

export default router
