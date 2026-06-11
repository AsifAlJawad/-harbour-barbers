import { useEffect, useState } from 'react'
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native'
import { getServices, getBarbers, getAvailability, bookAppointment } from '../../lib/api'

const STEPS = ['service', 'barber', 'time', 'confirm']

export default function Book() {
  const [step, setStep]         = useState(0)
  const [services, setServices] = useState([])
  const [barbers, setBarbers]   = useState([])
  const [slots, setSlots]       = useState([])
  const [service, setService]   = useState(null)
  const [barber, setBarber]     = useState(null)
  const [slot, setSlot]         = useState(null)
  const [loading, setLoading]   = useState(true)
  const [booking, setBooking]   = useState(false)

  useEffect(() => {
    Promise.all([getServices(), getBarbers()])
      .then(([svcs, bkrs]) => { setServices(svcs); setBarbers(bkrs) })
      .finally(() => setLoading(false))
  }, [])

  async function pickBarber(b) {
    setBarber(b)
    setLoading(true)
    const date = new Date().toISOString().slice(0, 10)
    const available = await getAvailability(b.id, date)
    setSlots(available)
    setLoading(false)
    setStep(2)
  }

  async function confirm() {
    setBooking(true)
    try {
      const date = new Date().toISOString().slice(0, 10)
      await bookAppointment({
        service_id:   service.id,
        barber_id:    barber.id,
        scheduled_at: `${date}T${slot}:00`,
      })
      Alert.alert('Booked!', `${service.name} with ${barber.name} at ${slot}`)
      setStep(0); setService(null); setBarber(null); setSlot(null)
    } catch (e) {
      Alert.alert('Error', e.message)
    } finally {
      setBooking(false)
    }
  }

  if (loading) return <View style={s.center}><ActivityIndicator color="#8b2635" /></View>

  return (
    <View style={s.root}>
      {/* Step indicator */}
      <View style={s.steps}>
        {STEPS.map((label, i) => (
          <View key={label} style={[s.stepDot, i <= step && s.stepDotActive]}>
            <Text style={[s.stepLabel, i === step && s.stepLabelActive]}>{label}</Text>
          </View>
        ))}
      </View>

      {step === 0 && (
        <>
          <Text style={s.heading}>Choose a service</Text>
          <FlatList data={services} keyExtractor={i => i.id} renderItem={({ item }) => (
            <TouchableOpacity style={s.card} onPress={() => { setService(item); setStep(1) }}>
              <Text style={s.cardTitle}>{item.name}</Text>
              <Text style={s.cardSub}>{item.duration_minutes} min · ${(item.price / 100).toFixed(0)}</Text>
            </TouchableOpacity>
          )} />
        </>
      )}

      {step === 1 && (
        <>
          <Text style={s.heading}>Choose a barber</Text>
          <FlatList data={barbers.filter(b => b.available)} keyExtractor={i => i.id} renderItem={({ item }) => (
            <TouchableOpacity style={s.card} onPress={() => pickBarber(item)}>
              <Text style={s.cardTitle}>{item.name}</Text>
              <Text style={s.cardSub}>{item.bio || 'Available now'}</Text>
            </TouchableOpacity>
          )} />
        </>
      )}

      {step === 2 && (
        <>
          <Text style={s.heading}>Pick a time (today)</Text>
          {slots.length === 0
            ? <Text style={s.empty}>No slots available today</Text>
            : <FlatList data={slots} keyExtractor={i => i} numColumns={3} renderItem={({ item }) => (
                <TouchableOpacity style={[s.slot, slot === item && s.slotActive]} onPress={() => { setSlot(item); setStep(3) }}>
                  <Text style={[s.slotText, slot === item && s.slotTextActive]}>{item}</Text>
                </TouchableOpacity>
              )} />
          }
        </>
      )}

      {step === 3 && (
        <View style={s.confirm}>
          <Text style={s.heading}>Confirm booking</Text>
          <View style={s.summary}>
            <Row label="Service" value={service?.name} />
            <Row label="Price"   value={`$${(service?.price / 100).toFixed(2)}`} />
            <Row label="Barber"  value={barber?.name} />
            <Row label="Time"    value={slot} />
          </View>
          <TouchableOpacity style={s.btn} onPress={confirm} disabled={booking}>
            <Text style={s.btnText}>{booking ? 'Booking…' : 'Confirm Appointment'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setStep(2)}>
            <Text style={s.back}>← Change time</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}

function Row({ label, value }) {
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={s.rowValue}>{value}</Text>
    </View>
  )
}

const s = StyleSheet.create({
  root:          { flex: 1, backgroundColor: '#f7f5f0', padding: 20 },
  center:        { flex: 1, justifyContent: 'center', alignItems: 'center' },
  steps:         { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  stepDot:       { alignItems: 'center', opacity: 0.3 },
  stepDotActive: { opacity: 1 },
  stepLabel:     { fontSize: 11, color: '#6a6560', textTransform: 'capitalize' },
  stepLabelActive:{ color: '#8b2635', fontWeight: '600' },
  heading:       { fontSize: 22, fontWeight: '700', color: '#18181a', marginBottom: 16 },
  card:          { backgroundColor: '#fff', borderRadius: 10, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#eeebe4' },
  cardTitle:     { fontSize: 16, fontWeight: '600', color: '#18181a' },
  cardSub:       { fontSize: 13, color: '#6a6560', marginTop: 4 },
  empty:         { color: '#6a6560', textAlign: 'center', marginTop: 40 },
  slot:          { flex: 1, margin: 4, backgroundColor: '#fff', borderRadius: 8, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#eeebe4' },
  slotActive:    { backgroundColor: '#8b2635', borderColor: '#8b2635' },
  slotText:      { fontSize: 13, color: '#18181a' },
  slotTextActive:{ color: '#fff', fontWeight: '600' },
  confirm:       { flex: 1 },
  summary:       { backgroundColor: '#fff', borderRadius: 10, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: '#eeebe4' },
  row:           { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eeebe4' },
  rowLabel:      { color: '#6a6560', fontSize: 14 },
  rowValue:      { fontWeight: '600', color: '#18181a', fontSize: 14 },
  btn:           { backgroundColor: '#8b2635', borderRadius: 10, padding: 16, alignItems: 'center' },
  btnText:       { color: '#fff', fontWeight: '600', fontSize: 16 },
  back:          { textAlign: 'center', color: '#6a6560', marginTop: 16, fontSize: 14 },
})
