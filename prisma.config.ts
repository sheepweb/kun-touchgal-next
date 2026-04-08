import 'dotenv/config'
import { defineConfig } from 'prisma/config'

const fallbackDatabaseUrl =
  'postgresql://postgres:postgres@127.0.0.1:5432/touchgal?schema=public'

export default defineConfig({
  schema: 'prisma/schema',
  migrations: {
    path: 'prisma/migrations'
  },
  datasource: {
    url: process.env.KUN_DATABASE_URL ?? fallbackDatabaseUrl
  }
})
