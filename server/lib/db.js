import postgres from 'postgres'
import 'dotenv/config'

// Extract password from DATABASE_URL if DB_PASSWORD not set separately
let password = process.env.DB_PASSWORD
if (!password && process.env.DATABASE_URL) {
  try { password = new URL(process.env.DATABASE_URL).password } catch {}
}

const db = process.env.POSTGRES_URL
  ? postgres(process.env.POSTGRES_URL, { ssl: 'require', max: 1, prepare: false })
  : postgres({
      host:     'aws-0-ca-central-1.pooler.supabase.com',
      port:     5432,
      database: 'postgres',
      username: 'postgres.jzbrxjzvrmvderqkmcei',
      password,
      ssl:      'require',
      max:      1,
      prepare:  false,
    })

export default db
