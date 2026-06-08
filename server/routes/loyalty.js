import { Router } from 'express'
import { supabase } from '../lib/supabase.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

const TIERS = [
  { name: 'bronze',   min: 0,    max: 199  },
  { name: 'silver',   min: 200,  max: 499  },
  { name: 'gold',     min: 500,  max: 999  },
  { name: 'platinum', min: 1000, max: Infinity },
]

router.get('/', requireAuth, async (req, res) => {
  try {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('loyalty_points, loyalty_tier')
      .eq('id', req.user.id)
      .maybeSingle()
    if (profileError) throw profileError
    if (!profile) return res.status(404).json({ error: 'Profile not found' })

    const { data: transactions, error: txError } = await supabase
      .from('loyalty_transactions')
      .select('*')
      .eq('customer_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(25)
    if (txError) throw txError

    const pts         = profile.loyalty_points
    const currentTier = TIERS.find(t => pts >= t.min && pts <= t.max) || TIERS[0]
    const nextTier    = TIERS[TIERS.indexOf(currentTier) + 1] || null

    res.json({
      points:         pts,
      tier:           currentTier.name,
      next_tier:      nextTier?.name || null,
      points_to_next: nextTier ? nextTier.min - pts : 0,
      tiers:          TIERS.map(t => ({ ...t, active: t.name === currentTier.name })),
      transactions,
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

export default router
