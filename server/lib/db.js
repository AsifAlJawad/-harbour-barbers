import postgres from 'postgres'
import 'dotenv/config'

// Use individual params to avoid URL-encoding issues with special chars in password.
// Pooler (IPv4-compatible) for Vercel; falls back to URL string if POSTGRES_URL set by Vercel integration.
const db = process.env.POSTGRES_URL
  ? postgres(process.env.POSTGRES_URL, { ssl: 'require', max: 1, prepare: false })
  : postgres({
      host:     'aws-0-ca-central-1.pooler.supabase.com',
      port:     5432,
      database: 'postgres',
      username: 'postgres.jzbrxjzvrmvderqkmcei',
      password: process.env.DB_PASSWORD,
      ssl:      'require',
      max:      1,
      prepare:  false,
    })

export default db
