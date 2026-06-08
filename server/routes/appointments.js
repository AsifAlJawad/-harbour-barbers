import { Router } from 'express'
import { supabase } from '../lib/supabase.js'
import { requireAuth } from '../middleware/auth.js'
import { sendBookingConfirmation, sendCancellationNotice } from '../email/index.js'

const router = Router()

router.get('/', requireAuth, async (req, res) => {
  try {
    const { data: rows, error } = await supabase
      .from('appointments')
      .select('*, services(*), barbers(*)')
      .eq('customer_id', req.user.id)
      .order('scheduled_at', { ascending: false })
    if (error) throw error
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
    const { data: conflicts, error: conflictError } = await supabase
      .from('appointments')
      .select('id')
      .eq('barber_id', barber_id)
      .eq('scheduled_at', scheduled_at)
      .in('status', ['pending', 'confirmed'])
    if (conflictError) throw conflictError
    if (conflicts && conflicts.length > 0) {
      return res.status(409).json({ error: 'That slot is no longer available. Please choose another time.' })
    }

    const { data: appt, error: apptError } = await supabase
      .from('appointments')
      .insert({
        customer_id: req.user.id,
        barber_id,
        service_id,
        scheduled_at,
        notes: notes ?? null,
        status: 'confirmed',
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

    const full = { ...appt, services: svc, barbers: bkr }

    // Award loyalty points
    const pts = Math.floor((svc?.price || 0) / 100)
    if (pts > 0) {
      const { error: ltError } = await supabase
        .from('loyalty_transactions')
        .insert({
          customer_id:    req.user.id,
          appointment_id: appt.id,
          points:         pts,
          description:    'Booked ' + svc.name,
        })
      if (ltError) throw ltError

      const { data: profile, error: profileFetchError } = await supabase
        .from('profiles')
        .select('loyalty_points')
        .eq('id', req.user.id)
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
        .eq('id', req.user.id)
      if (profileError) throw profileError
    }

    sendBookingConfirmation(req.user.email, full).catch(() => {})
    res.status(201).json(full)
  } catch (e) { res.status(400).json({ error: e.message }) }
})

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { data: apptRows, error: fetchError } = await supabase
      .from('appointments')
      .select('*, services(price, name)')
      .eq('id', req.params.id)
      .eq('customer_id', req.user.id)
    if (fetchError) throw fetchError
    const appt = apptRows && apptRows[0]
    if (!appt) return res.status(404).json({ error: 'Appointment not found' })
    if (!['pending', 'confirmed'].includes(appt.status)) {
      return res.status(400).json({ error: 'Cannot cancel a completed appointment' })
    }

    const { error: cancelError } = await supabase
      .from('appointments')
      .update({ status: 'cancelled' })
      .eq('id', req.params.id)
    if (cancelError) throw cancelError

    const price = appt.services?.price || 0
    const pts   = Math.floor(price / 100)
    if (pts > 0) {
      const { error: ltError } = await supabase
        .from('loyalty_transactions')
        .insert({
          customer_id:    req.user.id,
          appointment_id: appt.id,
          points:         -pts,
          description:    'Cancelled ' + (appt.services?.name || ''),
        })
      if (ltError) throw ltError

      const { data: profile, error: profileFetchError } = await supabase
        .from('profiles')
        .select('loyalty_points')
        .eq('id', req.user.id)
        .single()
      if (profileFetchError) throw profileFetchError

      const newPoints = Math.max(0, (profile.loyalty_points || 0) - pts)
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ loyalty_points: newPoints })
        .eq('id', req.user.id)
      if (profileError) throw profileError
    }

    sendCancellationNotice(req.user.email, appt).catch(() => {})
    res.status(204).send()
  } catch (e) { res.status(400).json({ error: e.message }) }
})

router.put('/:id', requireAuth, async (req, res) => {
  const { scheduled_at, barber_id } = req.body
  if (!scheduled_at) return res.status(400).json({ error: 'scheduled_at required' })
  try {
    // Fetch current appointment to validate ownership and status
    const { data: existing, error: fetchError } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', req.params.id)
      .eq('customer_id', req.user.id)
      .in('status', ['pending', 'confirmed'])
      .maybeSingle()
    if (fetchError) throw fetchError
    if (!existing) return res.status(404).json({ error: 'Appointment not found' })

    const updates = { scheduled_at }
    if (barber_id !== undefined) updates.barber_id = barber_id

    const { data: appt, error: updateError } = await supabase
      .from('appointments')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single()
    if (updateError) throw updateError

    const { data: svc, error: svcError } = await supabase
      .from('services')
      .select('*')
      .eq('id', appt.service_id)
      .single()
    if (svcError) throw svcError

    const { data: bkr, error: bkrError } = await supabase
      .from('barbers')
      .select('*')
      .eq('id', appt.barber_id)
      .single()
    if (bkrError) throw bkrError

    const full = { ...appt, services: svc, barbers: bkr }

    sendBookingConfirmation(req.user.email, full).catch(() => {})
    res.json(full)
  } catch (e) { res.status(400).json({ error: e.message }) }
})

export default router
