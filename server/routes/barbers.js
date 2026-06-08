import { Router } from 'express'
import { supabase } from '../lib/supabase.js'

const router = Router()

router.get('/', async (req, res) => {
  try {
    const { data: rows, error } = await supabase
      .from('barbers')
      .select('*')
      .order('name')
    if (error) throw error
    res.json(rows)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.get('/:id/availability', async (req, res) => {
  const { date } = req.query
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'date required (YYYY-MM-DD)' })
  }

  try {
    const { data: booked, error } = await supabase
      .from('appointments')
      .select('scheduled_at, services(duration)')
      .eq('barber_id', req.params.id)
      .gte('scheduled_at', date + 'T09:00:00-07:00')
      .lt('scheduled_at', date + 'T18:00:00-07:00')
      .in('status', ['pending', 'confirmed'])
    if (error) throw error

    const dayStart = new Date(`${date}T09:00:00-07:00`)
    const dayEnd   = new Date(`${date}T18:00:00-07:00`)
    const slots = []
    const cursor = new Date(dayStart)

    while (cursor < dayEnd) {
      const slotStart = new Date(cursor)
      const taken = booked.some(b => {
        const bStart = new Date(b.scheduled_at)
        const duration = b.services?.duration || 30
        const bEnd   = new Date(bStart.getTime() + duration * 60_000)
        return slotStart >= bStart && slotStart < bEnd
      })
      slots.push({ time: cursor.toISOString(), available: !taken })
      cursor.setMinutes(cursor.getMinutes() + 30)
    }

    res.json(slots)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

export default router
