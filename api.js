// Harbour Barbers — frontend API client
// Loaded after /config.js (which provides window.HARBOUR_CONFIG) and the Supabase CDN
;(function () {
  const cfg = window.HARBOUR_CONFIG || {}
  const sb  = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey)

  async function token() {
    const { data } = await sb.auth.getSession()
    return data.session?.access_token || null
  }

  async function req(method, path, body) {
    const t = await token()
    const res = await fetch(`/backend${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(t ? { Authorization: `Bearer ${t}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
    if (res.status === 204) return null
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || res.statusText)
    return json
  }

  window.API = {
    supabase: () => sb,

    // ── Auth ──────────────────────────────────────────────
    async signUp(email, password, full_name, phone) {
      const { data, error } = await sb.auth.signUp({ email, password })
      if (error) throw new Error(error.message)
      // Create profile row (uses service-role bypass so it succeeds immediately after signup)
      await req('POST', '/auth/profile', { full_name, phone: phone || undefined })
      return data
    },

    async signIn(email, password) {
      const { data, error } = await sb.auth.signInWithPassword({ email, password })
      if (error) throw new Error(error.message)
      return data
    },

    async signOut() {
      await sb.auth.signOut()
    },

    async getMe()               { return req('GET',  '/auth/me') },
    async updateProfile(update) { return req('PUT',  '/auth/profile', update) },

    // ── Services & Barbers ────────────────────────────────
    async getServices()              { return req('GET', '/services') },
    async createService(data)        { return req('POST', '/services', data) },
    async updateService(id, data)    { return req('PUT',  `/services/${id}`, data) },
    async deleteService(id)          { return req('DELETE', `/services/${id}`) },

    async getBarbers()               { return req('GET', '/barbers') },
    async getAvailability(id, date)  { return req('GET', `/barbers/${id}/availability?date=${date}`) },

    // ── Appointments (customer) ───────────────────────────
    async getAppointments()          { return req('GET',    '/appointments') },
    async bookAppointment(data)      { return req('POST',   '/appointments', data) },
    async cancelAppointment(id)      { return req('DELETE', `/appointments/${id}`) },
    async rescheduleAppointment(id, scheduled_at, barber_id) {
      return req('PUT', `/appointments/${id}`, { scheduled_at, barber_id })
    },

    // ── Loyalty ───────────────────────────────────────────
    async getLoyalty()               { return req('GET', '/loyalty') },

    // ── Staff ─────────────────────────────────────────────
    async getSchedule(date)          { return req('GET', `/staff/schedule${date ? '?date='+date : ''}`) },
    async setAppointmentStatus(id, status) {
      return req('PUT', `/staff/appointments/${id}/status`, { status })
    },
    async createWalkIn(data)         { return req('POST', '/staff/walk-in', data) },
    async getCustomers(q)            { return req('GET', `/staff/customers${q ? '?q='+encodeURIComponent(q) : ''}`) },
    async setBarberAvailability(id, available) {
      return req('PUT', `/staff/barbers/${id}/availability`, { available })
    },

    // ── Owner ─────────────────────────────────────────────
    async getAnalytics()             { return req('GET', '/owner/analytics') },
  }
})()
