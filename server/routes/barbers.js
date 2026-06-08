import { Router } from 'express'
import db from '../lib/db.js'

const router = Router()

router.get('/', async (req, res) => {
  try {
    const rows = await db`SELECT * FROM barbers ORDER BY name`
    res.json(rows)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.get('/:id/availability', async (req, res) => {
  const { date } = req.query
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'date required (YYYY-MM-DD)' })
  }

  try {
    const booked = await db`
      SELECT a.scheduled_at, s.duration
      FROM appointments a
      JOIN services s ON s.id = a.service_id
      WHERE a.barber_id = ${req.params.id}
        AND a.scheduled_at >= ${date + 'T09:00:00-07:00'}
        AND a.scheduled_at <  ${date + 'T18:00:00-07:00'}
        AND a.status IN ('pending','confirmed')`

    const dayStart = new Date(`${date}T09:00:00-07:00`)
    const dayEnd   = new Date(`${date}T18:00:00-07:00`)
    const slots = []
    const cursor = new Date(dayStart)

    while (cursor < dayEnd) {
      const slotStart = new Date(cursor)
      const taken = booked.some(b => {
        const bStart = new Date(b.scheduled_at)
        const bEnd   = new Date(bStart.getTime() + (b.duration || 30) * 60_000)
        return slotStart >= bStart && slotStart < bEnd
      })
      slots.push({ time: cursor.toISOString(), available: !taken })
      cursor.setMinutes(cursor.getMinutes() + 30)
    }

    res.json(slots)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

export default router
