/** Database infrastructure and generic Kysely repository helpers. */
export { DatabaseError } from '@samuelho-dev/contract-database'
export {
  type DatabaseClientConfig,
  db,
  makeDatabaseClient
} from './lib/db-instance'
export {
  DataAccessConnectionError,
  DataAccessTimeoutError,
  DataAccessTransactionError,
  DatabaseConfigError,
  DatabaseConnectionError
} from './lib/errors'
export * from './lib/query-helpers'
export { RealtimeService } from './lib/realtime'
export { makeRepository, type Repository } from './lib/repository'
export type { DB } from './lib/schema'
export { DatabaseService } from './lib/service'
