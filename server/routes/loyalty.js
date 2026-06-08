import { Router } from 'express'
import db from '../lib/db.js'
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
    const [profile] = await db`
      SELECT loyalty_points, loyalty_tier FROM profiles WHERE id = ${req.user.id}`
    if (!profile) return res.status(404).json({ error: 'Profile not found' })

    const transactions = await db`
      SELECT * FROM loyalty_transactions
      WHERE customer_id = ${req.user.id}
      ORDER BY created_at DESC LIMIT 25`

    const pts         = profile.loyalty_points
    const currentTier = TIERS.find(t => pts >= t.min && pts <= t.max) || TIERS[0]
    const nextTier    = TIERS[TIERS.indexOf(currentTier) + 1] || null

    res.json({
      points:        pts,
      tier:          currentTier.name,
      next_tier:     nextTier?.name || null,
      points_to_next: nextTier ? nextTier.min - pts : 0,
      tiers:         TIERS.map(t => ({ ...t, active: t.name === currentTier.name })),
      transactions,
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

export default router
