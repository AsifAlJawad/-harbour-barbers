import { useEffect, useState, useCallback } from 'react'
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, RefreshControl } from 'react-native'
import { getAppointments, cancelAppointment } from '../../lib/api'

const STATUS_COLOR = { confirmed: '#2a6a4a', pending: '#3d5a80', completed: '#6a6560', cancelled: '#8b2635' }

export default function Appointments() {
  const [appts, setAppts]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    try {
      const data = await getAppointments()
      setAppts(data)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function cancel(id) {
    Alert.alert('Cancel appointment', 'Are you sure?', [
      { text: 'No', style: 'cancel' },
      { text: 'Yes, cancel', style: 'destructive', onPress: async () => {
        await cancelAppointment(id)
        load()
      }},
    ])
  }

  if (loading) return <View style={s.center}><ActivityIndicator color="#8b2635" /></View>

  return (
    <View style={s.root}>
      <FlatList
        data={appts}
        keyExtractor={i => i.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} />}
        ListEmptyComponent={<Text style={s.empty}>No appointments yet</Text>}
        renderItem={({ item }) => {
          const d = new Date(item.scheduled_at)
          const canCancel = ['pending', 'confirmed'].includes(item.status)
          return (
            <View style={s.card}>
              <View style={s.row}>
                <Text style={s.service}>{item.services?.name || '—'}</Text>
                <View style={[s.badge, { backgroundColor: STATUS_COLOR[item.status] + '22' }]}>
                  <Text style={[s.badgeText, { color: STATUS_COLOR[item.status] }]}>{item.status}</Text>
                </View>
              </View>
              <Text style={s.meta}>with {item.barbers?.name || '—'}</Text>
              <Text style={s.date}>{d.toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' })} at {d.toLocaleTimeString('en-US', { hour:'numeric', minute:'2-digit' })}</Text>
              <Text style={s.price}>${(item.services?.price / 100 || 0).toFixed(2)}</Text>
              {canCancel && (
                <TouchableOpacity onPress={() => cancel(item.id)}>
                  <Text style={s.cancelBtn}>Cancel</Text>
                </TouchableOpacity>
              )}
            </View>
          )
        }}
      />
    </View>
  )
}

const s = StyleSheet.create({
  root:      { flex: 1, backgroundColor: '#f7f5f0', padding: 16 },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty:     { textAlign: 'center', color: '#6a6560', marginTop: 60, fontSize: 15 },
  card:      { backgroundColor: '#fff', borderRadius: 10, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#eeebe4' },
  row:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  service:   { fontSize: 16, fontWeight: '600', color: '#18181a' },
  badge:     { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  meta:      { fontSize: 13, color: '#6a6560' },
  date:      { fontSize: 14, color: '#18181a', marginTop: 6 },
  price:     { fontSize: 13, color: '#6a6560', marginTop: 2 },
  cancelBtn: { color: '#8b2635', fontSize: 13, marginTop: 10, fontWeight: '500' },
})
