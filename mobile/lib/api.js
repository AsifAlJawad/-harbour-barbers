import { supabase } from './supabase'

const BASE = 'https://harbour-barbers.vercel.app/backend'

async function req(method, path, body) {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (res.status === 204) return null
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || res.statusText)
  return json
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export async function signUp(email, password, full_name, phone) {
  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) throw new Error(error.message)
  await req('POST', '/auth/profile', { full_name, phone: phone || undefined })
  return data
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw new Error(error.message)
  return data
}

export async function signOut() {
  await supabase.auth.signOut()
}

export const getMe           = ()           => req('GET', '/auth/me')
export const updateProfile   = (update)     => req('PUT', '/auth/profile', update)

// ── Services & Barbers ────────────────────────────────────────────────────────
export const getServices     = ()           => req('GET', '/services')
export const getBarbers      = ()           => req('GET', '/barbers')
export const getAvailability = (id, date)   => req('GET', `/barbers/${id}/availability?date=${date}`)

// ── Appointments ──────────────────────────────────────────────────────────────
export const getAppointments    = ()                          => req('GET',    '/appointments')
export const bookAppointment    = (data)                      => req('POST',   '/appointments', data)
export const cancelAppointment  = (id)                        => req('DELETE', `/appointments/${id}`)
export const rescheduleAppointment = (id, scheduled_at, barber_id) =>
  req('PUT', `/appointments/${id}`, { scheduled_at, barber_id })

// ── Loyalty ───────────────────────────────────────────────────────────────────
export const getLoyalty = () => req('GET', '/loyalty')
