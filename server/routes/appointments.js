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
      .limit(1)
    if (conflictError) throw conflictError
    if (conflicts && conflicts.length > 0) {
      return res.status(409).json({ error: 'That slot is no longer available. Please choose another time.' })
    }

    const { data: appt, error: insertError } = await supabase
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
    if (insertError) throw insertError

    const { data: svc } = await supabase.from('services').select('*').eq('id', service_id).maybeSingle()
    const { data: bkr } = await supabase.from('barbers').select('*').eq('id', barber_id).maybeSingle()
    const full = { ...appt, services: svc, barbers: bkr }

    // Award loyalty points
    const pts = Math.floor((svc?.price || 0) / 100)
    if (pts > 0) {
      await supabase.from('loyalty_transactions').insert({
        customer_id:    req.user.id,
        appointment_id: appt.id,
        points:         pts,
        description:    'Booked ' + svc.name,
      })

      // Fetch current points to compute new tier
      const { data: prof } = await supabase
        .from('profiles')
        .select('loyalty_points')
        .eq('id', req.user.id)
        .maybeSingle()
      const newPts = (prof?.loyalty_points || 0) + pts
      const tier =
        newPts >= 1000 ? 'platinum' :
        newPts >= 500  ? 'gold'     :
        newPts >= 200  ? 'silver'   : 'bronze'

      await supabase.from('profiles').update({
        loyalty_points: newPts,
        loyalty_tier:   tier,
      }).eq('id', req.user.id)
    }

    sendBookingConfirmation(req.user.email, full).catch(() => {})
    res.status(201).json(full)
  } catch (e) { res.status(400).json({ error: e.message }) }
})

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { data: appt, error: fetchError } = await supabase
      .from('appointments')
      .select('*, services(name, price)')
      .eq('id', req.params.id)
      .eq('customer_id', req.user.id)
      .maybeSingle()
    if (fetchError) throw fetchError
    if (!appt) return res.status(404).json({ error: 'Appointment not found' })
    if (!['pending','confirmed'].includes(appt.status)) {
      return res.status(400).json({ error: 'Cannot cancel a completed appointment' })
    }

    const { error: cancelError } = await supabase
      .from('appointments')
      .update({ status: 'cancelled' })
      .eq('id', req.params.id)
    if (cancelError) throw cancelError

    const servicePrice = appt.services?.price || 0
    const serviceName  = appt.services?.name  || ''
    const pts = Math.floor(servicePrice / 100)
    if (pts > 0) {
      await supabase.from('loyalty_transactions').insert({
        customer_id:    req.user.id,
        appointment_id: appt.id,
        points:         -pts,
        description:    'Cancelled ' + serviceName,
      })

      const { data: prof } = await supabase
        .from('profiles')
        .select('loyalty_points')
        .eq('id', req.user.id)
        .maybeSingle()
      const newPts = Math.max(0, (prof?.loyalty_points || 0) - pts)

      await supabase.from('profiles').update({ loyalty_points: newPts }).eq('id', req.user.id)
    }

    // Build appt-like shape the cancellation email expects (with service_name at top level)
    sendCancellationNotice(req.user.email, { ...appt, service_name: serviceName }).catch(() => {})
    res.status(204).send()
  } catch (e) { res.status(400).json({ error: e.message }) }
})

router.put('/:id', requireAuth, async (req, res) => {
  const { scheduled_at, barber_id } = req.body
  if (!scheduled_at) return res.status(400).json({ error: 'scheduled_at required' })
  try {
    // Ownership + status check
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

    const { data: svc } = await supabase.from('services').select('*').eq('id', appt.service_id).maybeSingle()
    const { data: bkr } = await supabase.from('barbers').select('*').eq('id', appt.barber_id).maybeSingle()
    const full = { ...appt, services: svc, barbers: bkr }

    sendBookingConfirmation(req.user.email, full).catch(() => {})
    res.json(full)
  } catch (e) { res.status(400).json({ error: e.message }) }
})

export default router
