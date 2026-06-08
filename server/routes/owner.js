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

    // Fetch completed appointments this month with service and barber info
    const { data: monthAppts, error: monthError } = await supabase
      .from('appointments')
      .select('*, services(price, name), barbers(name)')
      .eq('status', 'completed')
      .gte('scheduled_at', monthStart)
    if (monthError) throw monthError

    // Fetch appointments this week (confirmed + completed)
    const { data: weekAppts, error: weekError } = await supabase
      .from('appointments')
      .select('id')
      .in('status', ['confirmed', 'completed'])
      .gte('scheduled_at', weekStart)
    if (weekError) throw weekError

    // Fetch new customers this month
    const { data: newCustomerRows, error: newCustError } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'customer')
      .gte('created_at', monthStart)
    if (newCustError) throw newCustError

    // Compute month aggregates in JS
    const monthRevenue        = monthAppts.reduce((sum, a) => sum + (a.services?.price || 0), 0)
    const uniqueCustomerIds   = new Set(monthAppts.map(a => a.customer_id))

    // Top services by revenue
    const serviceMap = {}
    for (const a of monthAppts) {
      const name = a.services?.name || 'Unknown'
      if (!serviceMap[name]) serviceMap[name] = { name, bookings: 0, revenue: 0 }
      serviceMap[name].bookings += 1
      serviceMap[name].revenue  += a.services?.price || 0
    }
    const topServices = Object.values(serviceMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)

    // Barber stats by revenue
    const barberMap = {}
    for (const a of monthAppts) {
      const name = a.barbers?.name || 'Unknown'
      if (!barberMap[name]) barberMap[name] = { name, bookings: 0, revenue: 0 }
      barberMap[name].bookings += 1
      barberMap[name].revenue  += a.services?.price || 0
    }
    const barberStats = Object.values(barberMap).sort((a, b) => b.revenue - a.revenue)

    res.json({
      month_appointments: monthAppts.length,
      month_revenue:      monthRevenue,
      new_customers:      newCustomerRows.length,
      week_appointments:  weekAppts.length,
      top_services:       topServices,
      barber_stats:       barberStats,
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

export default router
