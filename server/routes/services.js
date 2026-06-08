import { Router } from 'express'
import db from '../lib/db.js'
import { requireStaff, requireOwner } from '../middleware/auth.js'

const router = Router()

router.get('/', async (req, res) => {
  try {
    const rows = await db`SELECT * FROM services WHERE active = true ORDER BY category, price`
    res.json(rows)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.post('/', requireStaff, async (req, res) => {
  const { name, description, price, duration, category = 'haircut' } = req.body
  if (!name || !price || !duration) return res.status(400).json({ error: 'name, price and duration required' })
  try {
    const [row] = await db`
      INSERT INTO services (name, description, price, duration, category)
      VALUES (${name}, ${description ?? null}, ${price}, ${duration}, ${category})
      RETURNING *`
    res.status(201).json(row)
  } catch (e) { res.status(400).json({ error: e.message }) }
})

router.put('/:id', requireStaff, async (req, res) => {
  const { name, description, price, duration, category } = req.body
  try {
    const [row] = await db`
      UPDATE services SET
        name        = COALESCE(${name        ?? null}, name),
        description = COALESCE(${description ?? null}, description),
        price       = COALESCE(${price       ?? null}, price),
        duration    = COALESCE(${duration    ?? null}, duration),
        category    = COALESCE(${category    ?? null}, category)
      WHERE id = ${req.params.id}
      RETURNING *`
    if (!row) return res.status(404).json({ error: 'Not found' })
    res.json(row)
  } catch (e) { res.status(400).json({ error: e.message }) }
})

router.delete('/:id', requireOwner, async (req, res) => {
  try {
    await db`UPDATE services SET active = false WHERE id = ${req.params.id}`
    res.status(204).send()
  } catch (e) { res.status(400).json({ error: e.message }) }
})

export default router
