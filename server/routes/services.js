import { Router } from 'express'
import { supabase } from '../lib/supabase.js'
import { requireStaff, requireOwner } from '../middleware/auth.js'

const router = Router()

router.get('/', async (req, res) => {
  try {
    const { data: rows, error } = await supabase
      .from('services')
      .select('*')
      .eq('active', true)
      .order('category')
      .order('price')
    if (error) throw error
    res.json(rows)
  } catch (e) {
    console.error('DB_ERROR services:', e.message, process.env.SUPABASE_URL ? 'SUPABASE_URL set' : 'SUPABASE_URL missing')
    res.status(500).json({ error: e.message })
  }
})

router.post('/', requireStaff, async (req, res) => {
  const { name, description, price, duration, category = 'haircut' } = req.body
  if (!name || !price || !duration) return res.status(400).json({ error: 'name, price and duration required' })
  try {
    const { data: row, error } = await supabase
      .from('services')
      .insert({ name, description: description ?? null, price, duration, category })
      .select()
      .single()
    if (error) throw error
    res.status(201).json(row)
  } catch (e) { res.status(400).json({ error: e.message }) }
})

router.put('/:id', requireStaff, async (req, res) => {
  const { name, description, price, duration, category } = req.body
  try {
    const updates = {}
    if (name        !== undefined) updates.name        = name
    if (description !== undefined) updates.description = description
    if (price       !== undefined) updates.price       = price
    if (duration    !== undefined) updates.duration    = duration
    if (category    !== undefined) updates.category    = category

    const { data: row, error } = await supabase
      .from('services')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single()
    if (error) throw error
    if (!row) return res.status(404).json({ error: 'Not found' })
    res.json(row)
  } catch (e) { res.status(400).json({ error: e.message }) }
})

router.delete('/:id', requireOwner, async (req, res) => {
  try {
    const { error } = await supabase
      .from('services')
      .update({ active: false })
      .eq('id', req.params.id)
    if (error) throw error
    res.status(204).send()
  } catch (e) { res.status(400).json({ error: e.message }) }
})

export default router
