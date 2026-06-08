import { Router } from 'express'
import db from '../lib/db.js'
import { requireAuth } from '../middleware/auth.js'
import { sendBookingConfirmation, sendCancellationNotice } from '../email/index.js'

const router = Router()

router.get('/', requireAuth, async (req, res) => {
  try {
    const rows = await db`
      SELECT a.*,
        row_to_json(s) AS services,
        row_to_json(b) AS barbers
      FROM appointments a
      JOIN services s ON s.id = a.service_id
      JOIN barbers  b ON b.id = a.barber_id
      WHERE a.customer_id = ${req.user.id}
      ORDER BY a.scheduled_at DESC`
    res.json(rows)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.post('/', requireAuth, async (req, res) => {
  const { barber_id, service_id, scheduled_at, notes } = req.body
  if (!barber_id || !service_id || !scheduled_at) {
    return res.status(400).json({ error: 'barber_id, service_id and scheduled_at required' })
  }

  try {
    // Conflict check
    const [conflict] = await db`
      SELECT id FROM appointments
      WHERE barber_id = ${barber_id}
        AND scheduled_at = ${scheduled_at}
        AND status IN ('pending','confirmed')`
    if (conflict) return res.status(409).json({ error: 'That slot is no longer available. Please choose another time.' })

    const [appt] = await db`
      INSERT INTO appointments (customer_id, barber_id, service_id, scheduled_at, notes, status)
      VALUES (${req.user.id}, ${barber_id}, ${service_id}, ${scheduled_at}, ${notes ?? null}, 'confirmed')
      RETURNING *`

    const [svc] = await db`SELECT * FROM services WHERE id = ${service_id}`
    const [bkr] = await db`SELECT * FROM barbers  WHERE id = ${barber_id}`
    const full  = { ...appt, services: svc, barbers: bkr }

    // Award loyalty points
    const pts = Math.floor((svc?.price || 0) / 100)
    if (pts > 0) {
      await db`
        INSERT INTO loyalty_transactions (customer_id, appointment_id, points, description)
        VALUES (${req.user.id}, ${appt.id}, ${pts}, ${'Booked ' + svc.name})`
      await db`
        UPDATE profiles SET
          loyalty_points = loyalty_points + ${pts},
          loyalty_tier = CASE
            WHEN loyalty_points + ${pts} >= 1000 THEN 'platinum'
            WHEN loyalty_points + ${pts} >= 500  THEN 'gold'
            WHEN loyalty_points + ${pts} >= 200  THEN 'silver'
            ELSE 'bronze' END
        WHERE id = ${req.user.id}`
    }

    sendBookingConfirmation(req.user.email, full).catch(() => {})
    res.status(201).json(full)
  } catch (e) { res.status(400).json({ error: e.message }) }
})

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const [appt] = await db`
      SELECT a.*, s.price, s.name AS service_name
      FROM appointments a JOIN services s ON s.id = a.service_id
      WHERE a.id = ${req.params.id} AND a.customer_id = ${req.user.id}`
    if (!appt) return res.status(404).json({ error: 'Appointment not found' })
    if (!['pending','confirmed'].includes(appt.status)) {
      return res.status(400).json({ error: 'Cannot cancel a completed appointment' })
    }

    await db`UPDATE appointments SET status = 'cancelled' WHERE id = ${req.params.id}`

    const pts = Math.floor((appt.price || 0) / 100)
    if (pts > 0) {
      await db`
        INSERT INTO loyalty_transactions (customer_id, appointment_id, points, description)
        VALUES (${req.user.id}, ${appt.id}, ${-pts}, ${'Cancelled ' + appt.service_name})`
      await db`
        UPDATE profiles SET loyalty_points = GREATEST(0, loyalty_points - ${pts})
        WHERE id = ${req.user.id}`
    }

    sendCancellationNotice(req.user.email, appt).catch(() => {})
    res.status(204).send()
  } catch (e) { res.status(400).json({ error: e.message }) }
})

router.put('/:id', requireAuth, async (req, res) => {
  const { scheduled_at, barber_id } = req.body
  if (!scheduled_at) return res.status(400).json({ error: 'scheduled_at required' })
  try {
    const [appt] = await db`
      UPDATE appointments SET
        scheduled_at = ${scheduled_at},
        barber_id    = COALESCE(${barber_id ?? null}, barber_id)
      WHERE id = ${req.params.id} AND customer_id = ${req.user.id}
        AND status IN ('pending','confirmed')
      RETURNING *`
    if (!appt) return res.status(404).json({ error: 'Appointment not found' })

    const [svc] = await db`SELECT * FROM services WHERE id = ${appt.service_id}`
    const [bkr] = await db`SELECT * FROM barbers  WHERE id = ${appt.barber_id}`
    const full  = { ...appt, services: svc, barbers: bkr }

    sendBookingConfirmation(req.user.email, full).catch(() => {})
    res.json(full)
  } catch (e) { res.status(400).json({ error: e.message }) }
})

export default router
