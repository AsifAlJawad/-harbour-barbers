import { useEffect, useState } from 'react'
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native'
import { getLoyalty } from '../../lib/api'

const TIERS = [
  { name: 'Bronze',   min: 0,    color: '#cd7f32' },
  { name: 'Silver',   min: 200,  color: '#aaa9ad' },
  { name: 'Gold',     min: 500,  color: '#d4af37' },
  { name: 'Platinum', min: 1000, color: '#6a9ab0' },
]

export default function Rewards() {
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getLoyalty().then(setData).finally(() => setLoading(false))
  }, [])

  if (loading) return <View style={s.center}><ActivityIndicator color="#8b2635" /></View>
  if (!data)   return null

  const pts      = data.points || 0
  const tierIdx  = TIERS.map(t => t.min).filter(m => pts >= m).length - 1
  const tier     = TIERS[tierIdx]
  const nextTier = TIERS[tierIdx + 1]
  const progress = nextTier ? (pts - tier.min) / (nextTier.min - tier.min) : 1

  return (
    <View style={s.root}>
      {/* Points card */}
      <View style={[s.card, { borderColor: tier.color }]}>
        <Text style={[s.tierName, { color: tier.color }]}>{tier.name} Member</Text>
        <Text style={s.points}>{pts}</Text>
        <Text style={s.pointsLabel}>loyalty points</Text>

        {nextTier && (
          <>
            <View style={s.bar}>
              <View style={[s.barFill, { width: `${Math.round(progress * 100)}%`, backgroundColor: tier.color }]} />
            </View>
            <Text style={s.barLabel}>{nextTier.min - pts} pts to {nextTier.name}</Text>
          </>
        )}
      </View>

      {/* Transaction history */}
      <Text style={s.heading}>History</Text>
      <FlatList
        data={data.transactions || []}
        keyExtractor={i => i.id}
        ListEmptyComponent={<Text style={s.empty}>No transactions yet</Text>}
        renderItem={({ item }) => (
          <View style={s.txRow}>
            <View>
              <Text style={s.txDesc}>{item.description}</Text>
              <Text style={s.txDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
            </View>
            <Text style={[s.txPts, { color: item.points > 0 ? '#2a6a4a' : '#8b2635' }]}>
              {item.points > 0 ? '+' : ''}{item.points}
            </Text>
          </View>
        )}
      />
    </View>
  )
}

const s = StyleSheet.create({
  root:        { flex: 1, backgroundColor: '#f7f5f0', padding: 20 },
  center:      { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card:        { backgroundColor: '#fff', borderRadius: 14, padding: 24, alignItems: 'center', marginBottom: 28, borderWidth: 2 },
  tierName:    { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  points:      { fontSize: 56, fontWeight: '700', color: '#18181a' },
  pointsLabel: { color: '#6a6560', fontSize: 14, marginBottom: 16 },
  bar:         { width: '100%', height: 6, backgroundColor: '#eeebe4', borderRadius: 3, overflow: 'hidden' },
  barFill:     { height: '100%', borderRadius: 3 },
  barLabel:    { color: '#6a6560', fontSize: 12, marginTop: 8 },
  heading:     { fontSize: 18, fontWeight: '700', color: '#18181a', marginBottom: 12 },
  empty:       { textAlign: 'center', color: '#6a6560', marginTop: 20 },
  txRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 14, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: '#eeebe4' },
  txDesc:      { fontSize: 14, color: '#18181a' },
  txDate:      { fontSize: 12, color: '#6a6560', marginTop: 2 },
  txPts:       { fontSize: 16, fontWeight: '700' },
})
