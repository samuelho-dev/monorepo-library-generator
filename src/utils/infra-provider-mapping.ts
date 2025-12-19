/**
 * Infrastructure-Provider Mapping
 *
 * Defines which provider library each infrastructure library should use.
 * This enables automatic integration during code generation.
 *
 * @module utils/infra-provider-mapping
 */

/**
 * Maps infrastructure library names to their provider dependencies
 *
 * Example:
 * - infra-database uses provider-kysely
 * - infra-cache uses provider-effect-cache
 */
export const INFRA_PROVIDER_MAP = {
  cache: "effect-cache",
  database: "kysely",
  logging: "effect-logger",
  metrics: "effect-metrics",
  queue: "effect-queue",
  pubsub: "effect-pubsub"
}

/**
 * Type-safe keys for infrastructure libraries
 */
export type InfraName = keyof typeof INFRA_PROVIDER_MAP

/**
 * Type guard to check if a string is a valid InfraName
 */
function isInfraName(name: string): name is InfraName {
  return name in INFRA_PROVIDER_MAP
}

/**
 * Get provider name for infrastructure library
 *
 * @param infraName - Infrastructure library name (e.g., "database")
 * @returns Provider library name (e.g., "kysely") or undefined if no mapping
 */
export function getProviderForInfra(
  infraName: string
) {
  if (isInfraName(infraName)) {
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
export function getProviderPackageName(
  infraName: string,
  scope: string
) {
  const provider = getProviderForInfra(infraName)
  return provider ? `${scope}/provider-${provider}` : undefined
}

/**
 * Get provider class name for infrastructure library
 *
 * @param infraName - Infrastructure library name (e.g., "database")
 * @returns Provider class name (e.g., "Kysely")
 */
export function getProviderClassName(
  infraName: string
) {
  const provider = getProviderForInfra(infraName)
  if (!provider) return undefined

  // Convert kebab-case to PascalCase
  // "effect-cache" -> "EffectCache"
  // "kysely" -> "Kysely"
  return provider
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("")
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
