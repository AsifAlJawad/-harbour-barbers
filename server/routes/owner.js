import { Router } from 'express'
import { supabase } from '../lib/supabase.js'
import { requireOwner } from '../middleware/auth.js'

const router = Router()

router.get('/analytics', requireOwner, async (req, res) => {
  try {
    const now        = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const weekDay    = now.getDay()
    const weekStart  = new Date(now.getFullYear(), now.getMonth(), now.getDate() - weekDay).toISOString()

    // Fetch completed appointments this month with service prices (for revenue/unique customers)
    const { data: monthAppts, error: monthError } = await supabase
      .from('appointments')
      .select('customer_id, services(price, name), barbers(name)')
      .eq('status', 'completed')
      .gte('scheduled_at', monthStart)
    if (monthError) throw monthError

    // Fetch confirmed+completed appointments this week (for week count)
    const { data: weekAppts, error: weekError } = await supabase
      .from('appointments')
      .select('id')
      .in('status', ['confirmed', 'completed'])
      .gte('scheduled_at', weekStart)
    if (weekError) throw weekError

    // Fetch new customers this month
    const { data: newCustRows, error: newCustError } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'customer')
      .gte('created_at', monthStart)
    if (newCustError) throw newCustError

    // Compute aggregates in JS
    const monthAppointments = monthAppts.length
    const monthRevenue      = monthAppts.reduce((sum, a) => sum + (a.services?.price || 0), 0)
    const uniqueCustomers   = new Set(monthAppts.map(a => a.customer_id)).size
    const weekAppointments  = weekAppts.length
    const newCustomers      = newCustRows.length

    // Top services by revenue
    const serviceMap = {}
    for (const a of monthAppts) {
      const name = a.services?.name
      const price = a.services?.price || 0
      if (!name) continue
      if (!serviceMap[name]) serviceMap[name] = { name, bookings: 0, revenue: 0 }
      serviceMap[name].bookings++
      serviceMap[name].revenue += price
    }
    const topServices = Object.values(serviceMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)

    // Barber stats by revenue
    const barberMap = {}
    for (const a of monthAppts) {
      const name = a.barbers?.name
      const price = a.services?.price || 0
      if (!name) continue
      if (!barberMap[name]) barberMap[name] = { name, bookings: 0, revenue: 0 }
      barberMap[name].bookings++
      barberMap[name].revenue += price
    }
    const barberStats = Object.values(barberMap)
      .sort((a, b) => b.revenue - a.revenue)

    res.json({
      month_appointments: monthAppointments,
      month_revenue:      monthRevenue,
      new_customers:      newCustomers,
      week_appointments:  weekAppointments,
      unique_customers:   uniqueCustomers,
      top_services:       topServices,
      barber_stats:       barberStats,
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

export default router
