/**
 * Env Service Configuration
 *
 * Configuration constants and types for Env service.
Use Effect's Context.Tag pattern for dependency injection if configuration
needs to vary by environment.

TODO: Customize this file for your service:
1. Add service configuration constants
2. Define EnvConfig interface
3. Add environment-specific defaults
4. Document configuration requirements
 *
 * @module @custom-repo/infra-env/config
 * @see https://effect.website/docs/guides/context-management for config patterns
 */

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Env Service Configuration
 *
 * TODO: Define configuration properties for your service
 *
 * @example
 * ```typescript
 * export interface EnvConfig {
 *   // Connection settings
 *   readonly host: string;
 *   readonly port: number;
 *   readonly timeout: number;
 *
 *   // Feature flags
 *   readonly enableCache: boolean;
 *   readonly cacheTtlMs: number;
 *
 *   // Logging
 *   readonly logLevel: 'debug' | 'info' | 'warn' | 'error';
 * }
 * ```
 */
export interface EnvConfig {
  // TODO: Add configuration properties
  readonly timeout?: number;
}

// ============================================================================
// Default Configuration
// ============================================================================

/**
 * Default Env configuration
 *
 * TODO: Set reasonable defaults for your service
 */
export const defaultEnvConfig: EnvConfig = {
  // TODO: Set defaults for your configuration
  timeout: 30_000, // 30 seconds
};

// ============================================================================
// Environment-Specific Configuration
// ============================================================================

/**
 * Development configuration
 *
 * TODO: Customize for development environment
 */
export const developmentEnvConfig: EnvConfig = {
  ...defaultEnvConfig,
  // TODO: Override with development-specific values
};

/**
 * Test configuration
 *
 * TODO: Customize for test environment
 */
export const testEnvConfig: EnvConfig = {
  ...defaultEnvConfig,
  timeout: 5_000, // Shorter timeout for tests
  // TODO: Override with test-specific values
};

/**
 * Production configuration
 *
 * TODO: Customize for production environment
 */
export const productionEnvConfig: EnvConfig = {
  ...defaultEnvConfig,
  timeout: 60_000, // Longer timeout for production
  // TODO: Override with production-specific values
};

// ============================================================================
// Configuration Helpers
// ============================================================================

/**
 * Get configuration for environment
 *
 * @param env - Environment name ('development', 'test', 'production')
 * @returns Configuration for the environment
 *
 * @example
 * ```typescript
 * const config = getEnvConfigForEnvironment(process.env["NODE_ENV"]);
 * ```
 */
export function getEnvConfigForEnvironment(env: string = process.env["NODE_ENV"] || 'development'): EnvConfig {
  switch (env) {
    case 'production':
      return productionEnvConfig;
    case 'test':
      return testEnvConfig;
    case 'development':
    default:
      return developmentEnvConfig;
  }
}

// ============================================================================
// Configuration Validation
// ============================================================================

/**
 * Validate configuration
 *
 * TODO: Add configuration validation logic
 *
 * @param config - Configuration to validate
 * @throws Error if configuration is invalid
 *
 * @example
 * ```typescript
 * validateEnvConfig(config);
 * ```
 */
export function validateEnvConfig(config: EnvConfig): void {
  // TODO: Add validation logic
  // Example:
  // if (!config.timeout || config.timeout < 0) {
  //   throw new Error('Invalid timeout: must be positive number');
  // }
}
