import postgres from 'postgres'
import 'dotenv/config'

const db = postgres({
  host:     process.env.DB_HOST,
  port:     5432,
  database: 'postgres',
  username: 'postgres',
  password: process.env.DB_PASSWORD,
  ssl:      'require',
  max:      10,
})

export default db
