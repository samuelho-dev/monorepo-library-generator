import { env } from '@samuelho-dev/env'
import { Redacted } from 'effect'
import { Kysely } from 'kysely'
import { PostgresJSDialect } from 'kysely-postgres-js'
import postgres from 'postgres'
import type { DB } from './schema'

export interface DatabaseClientConfig {
  readonly connectionString: string
  readonly maxConnections?: number
  readonly idleTimeoutSeconds?: number
  readonly connectTimeoutSeconds?: number
}

/** Create a direct Kysely client for code that does not run inside Effect. */
export const makeDatabaseClient = <Database = DB>(
  config: DatabaseClientConfig
): Kysely<Database> => {
  let ssl: { rejectUnauthorized: boolean } | undefined
  try {
    const sslMode = new URL(config.connectionString).searchParams.get('sslmode')
    if (sslMode === 'no-verify' || sslMode === 'require') {
      ssl = { rejectUnauthorized: false }
    }
  } catch {
    // postgres.js reports malformed connection strings when it connects.
  }

  const connection = postgres(config.connectionString, {
    max: config.maxConnections ?? 10,
    idle_timeout: config.idleTimeoutSeconds ?? 30,
    connect_timeout: config.connectTimeoutSeconds ?? 5,
    ...(ssl ? { ssl } : {})
  })

  return new Kysely<Database>({
    dialect: new PostgresJSDialect({ postgres: connection })
  })
}

let instance: Kysely<DB> | undefined

/** Lazy singleton using `DATABASE_URL`; no connection is created at import time. */
export const db = new Proxy({} as Kysely<DB>, {
  get(_target, property, receiver) {
    if (!instance) {
      const connectionString = env.DATABASE_URL
      if (!connectionString) {
        throw new Error('DATABASE_URL environment variable is required')
      }
      instance = makeDatabaseClient({
        connectionString: Redacted.value(connectionString)
      })
    }
    const value = Reflect.get(instance, property, receiver)
    return typeof value === 'function' ? value.bind(instance) : value
  }
})
