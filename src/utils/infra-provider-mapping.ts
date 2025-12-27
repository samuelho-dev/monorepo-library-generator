/**
 * Infrastructure-Provider Mapping
 *
 * Defines which provider library each infrastructure library should use.
 * This enables automatic integration during code generation.
 *
 * Architecture:
 * - cache, logging, metrics, queue, pubsub: Use Effect primitives directly
 * - database: Uses provider-kysely for Kysely SDK integration
 *
 * The database infrastructure is special - it depends on provider-kysely
 * which wraps the Kysely query builder. Types come from prisma-effect-kysely.
 *
 * @module utils/infra-provider-mapping
 */

/**
 * Valid infrastructure names that have provider mappings
 */
export type InfraWithProvider = 'database'

/**
 * Maps infrastructure library names to their provider dependencies
 *
 * Database uses Kysely provider for the query builder SDK.
 * Other infra libraries use Effect primitives directly.
 */
export const INFRA_PROVIDER_MAP: Record<InfraWithProvider, string> = {
  database: 'kysely'
}

/**
 * Infrastructure concern types for specialized template generation
 *
 * Each concern type maps to a specific set of Effect primitives:
 * - cache: Effect.Cache with optional Redis L2
 * - database: Kysely ORM with Effect wrapper
 * - queue: Effect.Queue with optional Redis backing
 * - pubsub: Effect.PubSub with optional Redis backing
 * - rpc: @effect/rpc with middleware and transport
 * - observability: Unified OTEL SDK + LoggingService + MetricsService
 * - generic: Standard CRUD service pattern
 *
 * NOTE: logging and metrics are now part of observability.
 * Use infra-observability for unified tracing, logging, and metrics.
 */
export type InfraConcernType =
  | 'cache'
  | 'database'
  | 'queue'
  | 'pubsub'
  | 'rpc'
  | 'auth'
  | 'storage'
  | 'observability'
  | 'generic'

/**
 * Keywords used to detect infrastructure concern type from library name
 *
 * NOTE: logging, metrics, and telemetry keywords now map to observability.
 * The observability concern provides unified OTEL SDK + LoggingService + MetricsService.
 */
const CONCERN_KEYWORDS: Record<string, InfraConcernType> = {
  cache: 'cache',
  caching: 'cache',
  database: 'database',
  db: 'database',
  queue: 'queue',
  job: 'queue',
  worker: 'queue',
  task: 'queue',
  pubsub: 'pubsub',
  event: 'pubsub',
  messaging: 'pubsub',
  broadcast: 'pubsub',
  rpc: 'rpc',
  api: 'rpc',
  remote: 'rpc',
  auth: 'auth',
  authentication: 'auth',
  authorization: 'auth',
  storage: 'storage',
  file: 'storage',
  blob: 'storage',
  upload: 'storage',
  // Observability: unified tracing, logging, and metrics
  observability: 'observability',
  otel: 'observability',
  opentelemetry: 'observability',
  tracing: 'observability',
  trace: 'observability',
  logging: 'observability',
  log: 'observability',
  logger: 'observability',
  metrics: 'observability',
  metric: 'observability',
  telemetry: 'observability'
}

/**
 * Detect infrastructure concern type from library name
 *
 * @param name - Library name (e.g., "cache", "my-queue-service")
 * @returns Detected concern type or "generic" if no match
 */
export function detectInfraConcern(name: string) {
  const lowerName = name.toLowerCase()

  for (const [keyword, concern] of Object.entries(CONCERN_KEYWORDS)) {
    if (lowerName.includes(keyword)) {
      return concern
    }
  }

  return 'generic'
}

/**
 * Type guard to check if a string is a valid InfraWithProvider
 */
function isInfraWithProvider(name: string): name is InfraWithProvider {
  return Object.keys(INFRA_PROVIDER_MAP).includes(name)
}

/**
 * Get provider name for infrastructure library
 *
 * @param infraName - Infrastructure library name (e.g., "database")
 * @returns Provider library name (e.g., "kysely") or undefined if no mapping
 */
export function getProviderForInfra(infraName: string) {
  if (isInfraWithProvider(infraName)) {
    return INFRA_PROVIDER_MAP[infraName]
  }
  return undefined
}

/**
 * Get provider package name for infrastructure library
 *
 * @param infraName - Infrastructure library name (e.g., "database")
 * @param scope - Package scope (e.g., "@custom-repo")
 * @returns Full provider package name (e.g., "@custom-repo/provider-kysely")
 */
export function getProviderPackageName(infraName: string, scope: string) {
  const provider = getProviderForInfra(infraName)
  return provider ? `${scope}/provider-${provider}` : undefined
}

/**
 * Get provider class name for infrastructure library
 *
 * @param infraName - Infrastructure library name (e.g., "database")
 * @returns Provider class name (e.g., "Kysely")
 */
export function getProviderClassName(infraName: string) {
  const provider = getProviderForInfra(infraName)
  if (!provider) return undefined

  // Convert kebab-case to PascalCase
  // "kysely" -> "Kysely"
  return provider
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
}

/**
 * Check if infrastructure library has a provider mapping
 *
 * @param infraName - Infrastructure library name
 * @returns true if mapping exists
 */
export function hasProviderMapping(infraName: string) {
  return infraName in INFRA_PROVIDER_MAP
}

/**
 * Check if infrastructure library uses Effect primitives directly
 *
 * @param infraName - Infrastructure library name
 * @returns true if library uses Effect primitives (not external providers)
 *
 * Includes:
 * - cache: Effect.Cache
 * - queue: Effect.Queue
 * - pubsub: Effect.PubSub
 * - rpc: @effect/rpc
 * - observability: OTEL SDK + Effect Logger + Effect.Metric
 *
 * NOT included (uses provider):
 * - database: Uses provider-kysely
 */
export function usesEffectPrimitives(infraName: string) {
  const concern = detectInfraConcern(infraName)
  return [
    'cache',
    'database',
    'queue',
    'pubsub',
    'rpc',
    'auth',
    'storage',
    'observability'
  ].includes(concern)
}
