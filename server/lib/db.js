import postgres from 'postgres'
import 'dotenv/config'

const db = process.env.DATABASE_URL
  ? postgres(process.env.DATABASE_URL, { ssl: 'require', max: 1, prepare: false })
  : postgres({
      host:     process.env.DB_HOST,
      port:     5432,
      database: 'postgres',
      username: 'postgres',
      password: process.env.DB_PASSWORD,
      ssl:      'require',
      max:      10,
    })

export default db
