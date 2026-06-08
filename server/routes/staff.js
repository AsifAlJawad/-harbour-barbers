import { Router } from 'express'
import { supabase } from '../lib/supabase.js'
import { requireStaff, requireOwner } from '../middleware/auth.js'

const router = Router()

router.get('/schedule', requireStaff, async (req, res) => {
  const date = req.query.date || new Date().toISOString().slice(0, 10)
  try {
    const { data: rows, error } = await supabase
      .from('appointments')
      .select('*, services(*), barbers(*), profiles(*)')
      .gte('scheduled_at', date + 'T00:00:00')
      .lte('scheduled_at', date + 'T23:59:59')
      .neq('status', 'cancelled')
      .order('scheduled_at')
    if (error) throw error
    res.json(rows)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.put('/appointments/:id/status', requireStaff, async (req, res) => {
  const { status } = req.body
  const valid = ['confirmed', 'completed', 'no_show', 'cancelled']
  if (!valid.includes(status)) return res.status(400).json({ error: `status must be one of: ${valid.join(', ')}` })

  try {
    const { data: appt, error: updateError } = await supabase
      .from('appointments')
      .update({ status })
      .eq('id', req.params.id)
      .select()
      .single()
    if (updateError) throw updateError

    if (status === 'completed' && appt) {
      const { data: svc, error: svcError } = await supabase
        .from('services')
        .select('price, name')
        .eq('id', appt.service_id)
        .single()
      if (svcError) throw svcError

      const pts = Math.floor((svc?.price || 0) / 100)
      if (pts > 0) {
        const { data: existing, error: existingError } = await supabase
          .from('loyalty_transactions')
          .select('id')
          .eq('appointment_id', req.params.id)
          .like('description', 'Completed%')
          .maybeSingle()
        if (existingError) throw existingError

        if (!existing) {
          const { error: ltError } = await supabase
            .from('loyalty_transactions')
            .insert({
              customer_id:    appt.customer_id,
              appointment_id: req.params.id,
              points:         pts,
              description:    'Completed ' + svc.name,
            })
          if (ltError) throw ltError

          const { data: profile, error: profileFetchError } = await supabase
            .from('profiles')
            .select('loyalty_points')
            .eq('id', appt.customer_id)
            .single()
          if (profileFetchError) throw profileFetchError

          const newPoints = (profile.loyalty_points || 0) + pts
          const newTier =
            newPoints >= 1000 ? 'platinum' :
            newPoints >= 500  ? 'gold'     :
            newPoints >= 200  ? 'silver'   : 'bronze'

          const { error: profileError } = await supabase
            .from('profiles')
            .update({ loyalty_points: newPoints, loyalty_tier: newTier })
            .eq('id', appt.customer_id)
          if (profileError) throw profileError
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
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('phone', phone)
        .maybeSingle()
      customerId = existing?.id
    }

    if (!customerId) {
      // profiles.id references auth.users, so we cannot insert with a random UUID.
      // Walk-in customers must be registered. Return an informative error.
      return res.status(400).json({
        error: 'Customer not found. Walk-in customers must be registered in the system first.',
      })
    }

    const { data: appt, error: apptError } = await supabase
      .from('appointments')
      .insert({
        customer_id: customerId,
        barber_id,
        service_id,
        scheduled_at: new Date().toISOString(),
        status: 'confirmed',
        notes: 'Walk-in',
      })
      .select()
      .single()
    if (apptError) throw apptError

    const { data: svc, error: svcError } = await supabase
      .from('services')
      .select('*')
      .eq('id', service_id)
      .single()
    if (svcError) throw svcError

    const { data: bkr, error: bkrError } = await supabase
      .from('barbers')
      .select('*')
      .eq('id', barber_id)
      .single()
    if (bkrError) throw bkrError

    res.status(201).json({ ...appt, services: svc, barbers: bkr })
  } catch (e) { res.status(400).json({ error: e.message }) }
})

router.get('/customers', requireStaff, async (req, res) => {
  const q = req.query.q
  try {
    let query = supabase
      .from('profiles')
      .select('id, full_name, phone, loyalty_points, loyalty_tier, created_at')
      .eq('role', 'customer')
      .order('full_name')
      .limit(100)

    if (q) {
      query = query.ilike('full_name', `%${q}%`)
    }

    const { data: rows, error } = await query
    if (error) throw error
    res.json(rows)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.put('/barbers/:id/availability', requireOwner, async (req, res) => {
  const { available } = req.body
  if (typeof available !== 'boolean') return res.status(400).json({ error: 'available must be boolean' })
  try {
    const { data: row, error } = await supabase
      .from('barbers')
      .update({ available })
      .eq('id', req.params.id)
      .select()
      .single()
    if (error) throw error
    res.json(row)
  } catch (e) { res.status(400).json({ error: e.message }) }
})

export default router
