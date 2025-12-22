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
 * Maps infrastructure library names to their provider dependencies
 *
 * Database uses Kysely provider for the query builder SDK.
 * Other infra libraries use Effect primitives directly.
 */
export const INFRA_PROVIDER_MAP: Record<string, string> = {
  database: 'kysely',
};

/**
 * Infrastructure concern types for specialized template generation
 *
 * Each concern type maps to a specific set of Effect primitives:
 * - cache: Effect.Cache with optional Redis L2
 * - database: Kysely ORM with Effect wrapper
 * - logging: Effect Logger with OpenTelemetry export
 * - metrics: Effect.Metric with OpenTelemetry export
 * - queue: Effect.Queue with optional Redis backing
 * - pubsub: Effect.PubSub with optional Redis backing
 * - rpc: @effect/rpc with middleware and transport
 * - generic: Standard CRUD service pattern
 */
export type InfraConcernType =
  | 'cache'
  | 'database'
  | 'logging'
  | 'metrics'
  | 'queue'
  | 'pubsub'
  | 'rpc'
  | 'auth'
  | 'storage'
  | 'generic';

/**
 * Keywords used to detect infrastructure concern type from library name
 */
const CONCERN_KEYWORDS: Record<string, InfraConcernType> = {
  cache: 'cache',
  caching: 'cache',
  database: 'database',
  db: 'database',
  logging: 'logging',
  log: 'logging',
  logger: 'logging',
  metrics: 'metrics',
  metric: 'metrics',
  telemetry: 'metrics',
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
};

/**
 * Detect infrastructure concern type from library name
 *
 * @param name - Library name (e.g., "cache", "my-queue-service")
 * @returns Detected concern type or "generic" if no match
 */
export function detectInfraConcern(name: string) {
  const lowerName = name.toLowerCase();

  for (const [keyword, concern] of Object.entries(CONCERN_KEYWORDS)) {
    if (lowerName.includes(keyword)) {
      return concern;
    }
  }

  return 'generic';
}

/**
 * Type-safe keys for infrastructure libraries with provider mappings
 */
export type InfraName = string;

/**
 * Type guard to check if a string is a valid InfraName
 */
function isInfraName(name: string): name is InfraName {
  return Object.keys(INFRA_PROVIDER_MAP).includes(name);
}

/**
 * Get provider name for infrastructure library
 *
 * @param infraName - Infrastructure library name (e.g., "database")
 * @returns Provider library name (e.g., "kysely") or undefined if no mapping
 */
export function getProviderForInfra(infraName: string) {
  if (isInfraName(infraName)) {
    return INFRA_PROVIDER_MAP[infraName];
  }
  return undefined;
}

/**
 * Get provider package name for infrastructure library
 *
 * @param infraName - Infrastructure library name (e.g., "database")
 * @param scope - Package scope (e.g., "@custom-repo")
 * @returns Full provider package name (e.g., "@custom-repo/provider-kysely")
 */
export function getProviderPackageName(infraName: string, scope: string) {
  const provider = getProviderForInfra(infraName);
  return provider ? `${scope}/provider-${provider}` : undefined;
}

/**
 * Get provider class name for infrastructure library
 *
 * @param infraName - Infrastructure library name (e.g., "database")
 * @returns Provider class name (e.g., "Kysely")
 */
export function getProviderClassName(infraName: string) {
  const provider = getProviderForInfra(infraName);
  if (!provider) return undefined;

  // Convert kebab-case to PascalCase
  // "kysely" -> "Kysely"
  return provider
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

/**
 * Check if infrastructure library has a provider mapping
 *
 * @param infraName - Infrastructure library name
 * @returns true if mapping exists
 */
export function hasProviderMapping(infraName: string) {
  return infraName in INFRA_PROVIDER_MAP;
}

/**
 * Check if infrastructure library uses Effect primitives directly
 *
 * @param infraName - Infrastructure library name
 * @returns true if library uses Effect primitives (not external providers)
 *
 * Includes:
 * - cache: Effect.Cache
 * - logging: Effect Logger
 * - metrics: Effect.Metric
 * - queue: Effect.Queue
 * - pubsub: Effect.PubSub
 * - rpc: @effect/rpc
 *
 * NOT included (uses provider):
 * - database: Uses provider-kysely
 */
export function usesEffectPrimitives(infraName: string) {
  const concern = detectInfraConcern(infraName);
  return [
    'cache',
    'database',
    'logging',
    'metrics',
    'queue',
    'pubsub',
    'rpc',
    'auth',
    'storage',
  ].includes(concern);
}
