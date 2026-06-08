import { Router } from 'express'
import db from '../lib/db.js'
import { requireOwner } from '../middleware/auth.js'

const router = Router()

router.get('/analytics', requireOwner, async (req, res) => {
  try {
    const now        = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const weekDay    = now.getDay()
    const weekStart  = new Date(now.getFullYear(), now.getMonth(), now.getDate() - weekDay).toISOString()

    const [[monthStats], [weekStats], topServices, barberStats] = await Promise.all([
      db`SELECT
          COUNT(*)                                                     AS appointments,
          COALESCE(SUM(s.price), 0)                                   AS revenue,
          COUNT(DISTINCT a.customer_id)                               AS unique_customers
        FROM appointments a JOIN services s ON s.id = a.service_id
        WHERE a.status = 'completed' AND a.scheduled_at >= ${monthStart}`,

      db`SELECT COUNT(*) AS appointments
        FROM appointments
        WHERE status IN ('confirmed','completed') AND scheduled_at >= ${weekStart}`,

      db`SELECT s.name, COUNT(*) AS bookings, SUM(s.price) AS revenue
        FROM appointments a JOIN services s ON s.id = a.service_id
        WHERE a.status = 'completed' AND a.scheduled_at >= ${monthStart}
        GROUP BY s.name ORDER BY revenue DESC LIMIT 5`,

      db`SELECT b.name, COUNT(*) AS bookings, SUM(s.price) AS revenue
        FROM appointments a
        JOIN services s ON s.id = a.service_id
        JOIN barbers  b ON b.id = a.barber_id
        WHERE a.status = 'completed' AND a.scheduled_at >= ${monthStart}
        GROUP BY b.name ORDER BY revenue DESC`,
    ])

    const [newCustomers] = await db`
      SELECT COUNT(*) AS count FROM profiles
      WHERE role = 'customer' AND created_at >= ${monthStart}`

    res.json({
      month_appointments: Number(monthStats.appointments),
      month_revenue:      Number(monthStats.revenue),
      new_customers:      Number(newCustomers.count),
      week_appointments:  Number(weekStats.appointments),
      top_services:       topServices.map(r => ({ name: r.name, revenue: Number(r.revenue) })),
      barber_stats:       barberStats.map(r => ({ name: r.name, revenue: Number(r.revenue), bookings: Number(r.bookings) })),
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

export default router
