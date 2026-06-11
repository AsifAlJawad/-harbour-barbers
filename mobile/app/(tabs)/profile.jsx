import { useEffect, useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView } from 'react-native'
import { getMe, updateProfile, signOut } from '../../lib/api'

export default function Profile() {
  const [me, setMe]           = useState(null)
  const [name, setName]       = useState('')
  const [phone, setPhone]     = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)

  useEffect(() => {
    getMe().then(data => {
      setMe(data)
      setName(data.full_name || '')
      setPhone(data.phone    || '')
    }).finally(() => setLoading(false))
  }, [])

  async function save() {
    setSaving(true)
    try {
      await updateProfile({ full_name: name, phone })
      Alert.alert('Saved', 'Profile updated')
    } catch (e) {
      Alert.alert('Error', e.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <View style={s.center}><ActivityIndicator color="#8b2635" /></View>

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content}>
      <View style={s.avatar}>
        <Text style={s.avatarText}>{(me?.full_name || me?.email || '?')[0].toUpperCase()}</Text>
      </View>
      <Text style={s.email}>{me?.email}</Text>
      <Text style={s.tier}>{me?.loyalty_tier} · {me?.loyalty_points} pts</Text>

      <Text style={s.label}>Full name</Text>
      <TextInput style={s.input} value={name} onChangeText={setName} autoCapitalize="words" />

      <Text style={s.label}>Phone</Text>
      <TextInput style={s.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />

      <TouchableOpacity style={s.btn} onPress={save} disabled={saving}>
        <Text style={s.btnText}>{saving ? 'Saving…' : 'Save Changes'}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={s.signOutBtn} onPress={() => signOut()}>
        <Text style={s.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const s = StyleSheet.create({
  root:       { flex: 1, backgroundColor: '#f7f5f0' },
  content:    { padding: 24, alignItems: 'center' },
  center:     { flex: 1, justifyContent: 'center', alignItems: 'center' },
  avatar:     { width: 80, height: 80, borderRadius: 40, backgroundColor: '#8b2635', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarText: { color: '#fff', fontSize: 32, fontWeight: '700' },
  email:      { fontSize: 15, color: '#6a6560', marginBottom: 4 },
  tier:       { fontSize: 13, color: '#8b2635', fontWeight: '600', textTransform: 'capitalize', marginBottom: 32 },
  label:      { alignSelf: 'flex-start', fontSize: 12, color: '#6a6560', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  input:      { width: '100%', backgroundColor: '#fff', borderWidth: 1, borderColor: '#ccc7be', borderRadius: 8, padding: 14, marginBottom: 18, fontSize: 15 },
  btn:        { width: '100%', backgroundColor: '#8b2635', borderRadius: 8, padding: 16, alignItems: 'center', marginTop: 8 },
  btnText:    { color: '#fff', fontWeight: '600', fontSize: 15 },
  signOutBtn: { marginTop: 24, padding: 12 },
  signOutText:{ color: '#6a6560', fontSize: 14 },
})
