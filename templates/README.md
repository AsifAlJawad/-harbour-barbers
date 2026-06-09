# Frontend Templates

Each folder here is an independent frontend that connects to the live Harbour Barbers backend.
Copy `starter/` to a new folder and start building your own design.

## How It Works

Every template loads the same two files from the root:
```html
<script src="/config.js"></script>          <!-- injects Supabase credentials -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js"></script>
<script src="/api.js"></script>             <!-- exposes window.API -->
```

After that, `window.API` has everything you need. No backend changes, no extra config.

---

## API Reference

### Auth
```js
API.signUp(email, password, full_name, phone)  // register new customer
API.signIn(email, password)                     // returns Supabase session
API.signOut()
API.getMe()           // { id, email, full_name, phone, role, loyalty_points, loyalty_tier }
API.updateProfile({ full_name, phone, notify_email, notify_sms })
```

### Services & Barbers
```js
API.getServices()
// → [{ id, name, description, price (cents), duration_minutes, active }]

API.getBarbers()
// → [{ id, name, bio, photo_url, available }]

API.getAvailability(barber_id, 'YYYY-MM-DD')
// → ['09:00', '09:30', '10:00', ...]  (available time slots)
```

### Appointments (customer)
```js
API.getAppointments()
// → [{ id, scheduled_at, status, services: {...}, barbers: {...} }]

API.bookAppointment({ barber_id, service_id, scheduled_at, notes })
API.cancelAppointment(id)
API.rescheduleAppointment(id, scheduled_at, barber_id)
```

### Loyalty
```js
API.getLoyalty()
// → { points, tier, transactions: [...] }
```

### Staff (requires staff or owner role)
```js
API.getSchedule('YYYY-MM-DD')   // omit date for today
API.setAppointmentStatus(id, 'confirmed' | 'completed' | 'cancelled')
API.createWalkIn({ barber_id, service_id, customer_name, notes })
API.getCustomers('search term')
API.setBarberAvailability(barber_id, true | false)
```

### Owner (requires owner role)
```js
API.getAnalytics()
// → { month_appointments, month_revenue (cents), new_customers,
//     top_services: [{ name, bookings, revenue }],
//     barber_stats:  [{ name, bookings, revenue }] }

API.createService({ name, description, price (cents), duration_minutes })
API.updateService(id, { price, name, ... })
API.deleteService(id)
```

---

## Auth Flow

1. User calls `API.signIn(email, password)` — Supabase stores the session in `localStorage`
2. On the next page load, `api.js` reads the session automatically
3. Every `API.*` call attaches the JWT as `Authorization: Bearer <token>`
4. No cookies, no extra setup

### Redirect after sign-in
```js
const data = await API.signIn(email, password)
const me = await API.getMe()
if (me.role === 'staff' || me.role === 'owner') location.href = '/staff.html'
else location.href = 'portal.html'
```

---

## Prices
Prices are stored in **cents** in the database. Divide by 100 to display:
```js
const display = `$${(service.price / 100).toFixed(2)}`
```

---

## Templates

| Folder    | Description                        |
|-----------|------------------------------------|
| `starter` | Minimal working baseline — copy this |
