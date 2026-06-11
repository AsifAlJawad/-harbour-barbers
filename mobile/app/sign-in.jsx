import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native'
import { signIn, signUp } from '../lib/api'

export default function SignIn() {
  const [mode, setMode]         = useState('signin') // 'signin' | 'signup'
  const [name, setName]         = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)

  async function submit() {
    if (!email || !password) return
    setLoading(true)
    try {
      if (mode === 'signup') await signUp(email, password, name)
      else                   await signIn(email, password)
    } catch (e) {
      Alert.alert('Error', e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Text style={s.brand}>HARBOUR{'\n'}<Text style={s.brandAccent}>BARBERS</Text></Text>

      {mode === 'signup' && (
        <TextInput style={s.input} placeholder="Full name" value={name} onChangeText={setName} autoCapitalize="words" />
      )}
      <TextInput style={s.input} placeholder="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      <TextInput style={s.input} placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />

      <TouchableOpacity style={s.btn} onPress={submit} disabled={loading}>
        <Text style={s.btnText}>{loading ? 'Please wait…' : mode === 'signup' ? 'Create Account' : 'Sign In'}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>
        <Text style={s.toggle}>
          {mode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
        </Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  )
}

const s = StyleSheet.create({
  root:        { flex: 1, backgroundColor: '#f7f5f0', justifyContent: 'center', padding: 32 },
  brand:       { fontFamily: 'System', fontSize: 36, fontWeight: '700', color: '#18181a', marginBottom: 40, lineHeight: 42 },
  brandAccent: { color: '#8b2635' },
  input:       { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ccc7be', borderRadius: 8, padding: 14, marginBottom: 12, fontSize: 15 },
  btn:         { backgroundColor: '#8b2635', borderRadius: 8, padding: 16, alignItems: 'center', marginTop: 4 },
  btnText:     { color: '#fff', fontWeight: '600', fontSize: 15 },
  toggle:      { textAlign: 'center', color: '#6a6560', marginTop: 20, fontSize: 14 },
})
