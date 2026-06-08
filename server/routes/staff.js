import { Router } from 'express'
import db from '../lib/db.js'
import { requireStaff } from '../middleware/auth.js'

const router = Router()

router.get('/schedule', requireStaff, async (req, res) => {
  const date = req.query.date || new Date().toISOString().slice(0, 10)
  try {
    const rows = await db`
      SELECT a.*,
        row_to_json(s) AS services,
        row_to_json(b) AS barbers,
        row_to_json(p) AS profiles
      FROM appointments a
      JOIN services  s ON s.id = a.service_id
      JOIN barbers   b ON b.id = a.barber_id
      JOIN profiles  p ON p.id = a.customer_id
      WHERE a.scheduled_at >= ${date + 'T00:00:00'}
        AND a.scheduled_at <= ${date + 'T23:59:59'}
        AND a.status != 'cancelled'
      ORDER BY a.scheduled_at`
    res.json(rows)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.put('/appointments/:id/status', requireStaff, async (req, res) => {
  const { status } = req.body
  const valid = ['confirmed','completed','no_show','cancelled']
  if (!valid.includes(status)) return res.status(400).json({ error: `status must be one of: ${valid.join(', ')}` })

  try {
    const [appt] = await db`
      UPDATE appointments SET status = ${status}
      WHERE id = ${req.params.id}
      RETURNING *`

    if (status === 'completed' && appt) {
      const [svc] = await db`SELECT price, name FROM services WHERE id = ${appt.service_id}`
      const pts   = Math.floor((svc?.price || 0) / 100)
      if (pts > 0) {
        const [existing] = await db`
          SELECT id FROM loyalty_transactions
          WHERE appointment_id = ${req.params.id} AND description LIKE 'Completed%'`
        if (!existing) {
          await db`
            INSERT INTO loyalty_transactions (customer_id, appointment_id, points, description)
            VALUES (${appt.customer_id}, ${req.params.id}, ${pts}, ${'Completed ' + svc.name})`
          await db`
            UPDATE profiles SET
              loyalty_points = loyalty_points + ${pts},
              loyalty_tier = CASE
                WHEN loyalty_points + ${pts} >= 1000 THEN 'platinum'
                WHEN loyalty_points + ${pts} >= 500  THEN 'gold'
                WHEN loyalty_points + ${pts} >= 200  THEN 'silver'
                ELSE 'bronze' END
            WHERE id = ${appt.customer_id}`
        }
      }
    }

    res.json(appt)
  } catch (e) { res.status(400).json({ error: e.message }) }
})

router.post('/walk-in', requireStaff, async (req, res) => {
  const { barber_id, service_id, customer_name, phone } = req.body
  if (!barber_id || !service_id || !customer_name) {
    return res.status(400).json({ error: 'barber_id, service_id and customer_name required' })
  }
  try {
    let customerId
    if (phone) {
      const [existing] = await db`SELECT id FROM profiles WHERE phone = ${phone}`
      customerId = existing?.id
    }
    if (!customerId) {
      const [p] = await db`
        INSERT INTO profiles (id, full_name, phone)
        VALUES (gen_random_uuid(), ${customer_name}, ${phone ?? null})
        RETURNING id`
      customerId = p.id
    }
    const [appt] = await db`
      INSERT INTO appointments (customer_id, barber_id, service_id, scheduled_at, status, notes)
      VALUES (${customerId}, ${barber_id}, ${service_id}, now(), 'confirmed', 'Walk-in')
      RETURNING *`
    const [svc] = await db`SELECT * FROM services WHERE id = ${service_id}`
    const [bkr] = await db`SELECT * FROM barbers  WHERE id = ${barber_id}`
    res.status(201).json({ ...appt, services: svc, barbers: bkr })
  } catch (e) { res.status(400).json({ error: e.message }) }
})

router.get('/customers', requireStaff, async (req, res) => {
  const q = req.query.q
  try {
    const rows = q
      ? await db`SELECT id,full_name,phone,loyalty_points,loyalty_tier,created_at FROM profiles WHERE role='customer' AND full_name ILIKE ${'%'+q+'%'} ORDER BY full_name LIMIT 100`
      : await db`SELECT id,full_name,phone,loyalty_points,loyalty_tier,created_at FROM profiles WHERE role='customer' ORDER BY full_name LIMIT 100`
    res.json(rows)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.put('/barbers/:id/availability', requireStaff, async (req, res) => {
  const { available } = req.body
  if (typeof available !== 'boolean') return res.status(400).json({ error: 'available must be boolean' })
  try {
    const [row] = await db`
      UPDATE barbers SET available = ${available} WHERE id = ${req.params.id} RETURNING *`
    res.json(row)
  } catch (e) { res.status(400).json({ error: e.message }) }
})

export default router
