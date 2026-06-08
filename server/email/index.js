import { Resend } from 'resend'

const FROM = 'Harbour Barbers <bookings@harbourbarbers.ca>'

function getResend() {
  if (!process.env.RESEND_API_KEY) return null
  return new Resend(process.env.RESEND_API_KEY)
}

function formatDate(isoString) {
  return new Date(isoString).toLocaleString('en-CA', {
    weekday: 'long', year: 'numeric', month: 'long',
    day: 'numeric', hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Vancouver'
  })
}

export async function sendBookingConfirmation(toEmail, appointment) {
  const resend = getResend()
  if (!resend) return
  const date = formatDate(appointment.scheduled_at)
  const price = (appointment.services.price / 100).toFixed(2)

  await resend.emails.send({
    from: FROM,
    to: toEmail,
    subject: `Booking confirmed — ${date}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#18181a">
        <h1 style="font-size:26px;font-weight:700;margin-bottom:6px">You're booked.</h1>
        <p style="color:#6a6560;margin-bottom:20px">Your appointment at Harbour Barbers is confirmed.</p>
        <div style="background:#f7f5f0;border-radius:10px;padding:18px 22px;margin-bottom:20px">
          <table style="width:100%;font-size:14px;border-collapse:collapse">
            <tr><td style="padding:6px 0;color:#6a6560">Service</td><td style="text-align:right;font-weight:500">${appointment.services.name}</td></tr>
            <tr><td style="padding:6px 0;color:#6a6560">Barber</td><td style="text-align:right;font-weight:500">${appointment.barbers.name}</td></tr>
            <tr><td style="padding:6px 0;color:#6a6560">Date & Time</td><td style="text-align:right;font-weight:500">${date}</td></tr>
            <tr style="border-top:1px solid #ddd"><td style="padding:10px 0 0;font-weight:700;font-size:16px">Total</td><td style="text-align:right;font-weight:700;font-size:16px;color:#8b2635">$${price}</td></tr>
          </table>
        </div>
        <p style="font-size:13px;color:#6a6560">4857 Elliott St Unit 107, Delta, BC V4K 2X7</p>
        <p style="font-size:13px;color:#6a6560">+1 604-946-8033 · 24-hour cancellation policy applies</p>
      </div>
    `
  })
}

export async function sendCancellationNotice(toEmail, appointment) {
  const resend = getResend()
  if (!resend) return
  const date = formatDate(appointment.scheduled_at)

  await resend.emails.send({
    from: FROM,
    to: toEmail,
    subject: `Appointment cancelled — ${date}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#18181a">
        <h1 style="font-size:26px;font-weight:700;margin-bottom:6px">Appointment cancelled</h1>
        <p style="color:#6a6560">Your ${appointment.services.name} appointment on ${date} has been cancelled.</p>
        <p style="color:#6a6560;margin-top:16px">To rebook, visit <a href="https://harbourbarbers.ca/portal.html" style="color:#8b2635">harbourbarbers.ca</a>.</p>
      </div>
    `
  })
}
