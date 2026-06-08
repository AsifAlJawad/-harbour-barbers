import postgres from 'postgres'
import 'dotenv/config'

// POSTGRES_URL is auto-set by Vercel-Supabase integration with correct pooler format
// DATABASE_URL is a manual override
const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL

const db = connectionString
  ? postgres(connectionString, { ssl: 'require', max: 1, prepare: false })
  : postgres({
      host:     process.env.DB_HOST     || process.env.POSTGRES_HOST,
      port:     5432,
      database: process.env.POSTGRES_DATABASE || 'postgres',
      username: process.env.POSTGRES_USER     || 'postgres',
      password: process.env.DB_PASSWORD       || process.env.POSTGRES_PASSWORD,
      ssl:      'require',
      max:      10,
    })

export default db
