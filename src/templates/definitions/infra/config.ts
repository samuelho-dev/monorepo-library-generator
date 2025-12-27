/**
 * Infrastructure Config Template Definition
 *
 * Declarative template for generating lib/config.ts in infrastructure libraries.
 * Contains service configuration types and defaults.
 *
 * @module monorepo-library-generator/templates/definitions/infra/config
 */

import type { TemplateDefinition } from '../../core/types'

/**
 * Infrastructure Config Template Definition
 *
 * Generates a config.ts file with:
 * - Configuration type interface
 * - Default configuration values
 * - Environment-specific configurations
 * - Configuration helpers and validation
 */
export const infraConfigTemplate: TemplateDefinition = {
  id: 'infra/config',
  meta: {
    title: '{className} Service Configuration',
    description: `Configuration constants and types for {className} service.
Use Effect's Context.Tag pattern for dependency injection if configuration
needs to vary by environment.

TODO: Customize this file for your service:
1. Add service configuration constants
2. Define {className}Config interface
3. Add environment-specific defaults
4. Document configuration requirements`,
    module: '{scope}/infra-{fileName}/config'
  },
  imports: [{ from: '{scope}/env', items: ['env'] }],
  sections: [
    // Configuration Types
    {
      title: 'Configuration Types',
      content: {
        type: 'raw',
        value: `/**
 * {className} Service Configuration
 *
 * TODO: Define configuration properties for your service
 *
 * @example
 * \`\`\`typescript
 * export interface {className}Config {
 *   // Connection settings
 *   readonly host: string
 *   readonly port: number
 *   readonly timeout: number
 *
 *   // Feature flags
 *   readonly enableCache: boolean
 *   readonly cacheTtlMs: number
 *
 *   // Logging
 *   readonly logLevel: 'debug' | 'info' | 'warn' | 'error'
 * }
 * \`\`\`
 */
export interface {className}Config {
  // TODO: Add configuration properties
  readonly timeout?: number
}`
      }
    },
    // Default Configuration
    {
      title: 'Default Configuration',
      content: {
        type: 'raw',
        value: `/**
 * Default {className} configuration
 *
 * TODO: Set reasonable defaults for your service
 */
export const default{className}Config: {className}Config = {
  // TODO: Set defaults for your configuration
  timeout: 30_000 // 30 seconds
}`
      }
    },
    // Environment-Specific Configuration
    {
      title: 'Environment-Specific Configuration',
      content: {
        type: 'raw',
        value: `/**
 * Development configuration
 *
 * TODO: Customize for development environment
 */
export const development{className}Config: {className}Config = {
  ...default{className}Config
  // TODO: Override with development-specific values
}

/**
 * Test configuration
 *
 * TODO: Customize for test environment
 */
export const test{className}Config: {className}Config = {
  ...default{className}Config,
  timeout: 5_000 // Shorter timeout for tests
  // TODO: Override with test-specific values
}

/**
 * Production configuration
 *
 * TODO: Customize for production environment
 */
export const production{className}Config: {className}Config = {
  ...default{className}Config,
  timeout: 60_000 // Longer timeout for production
  // TODO: Override with production-specific values
}`
      }
    },
    // Configuration Helpers
    {
      title: 'Configuration Helpers',
      content: {
        type: 'raw',
        value: `/**
 * Get configuration for environment
 *
 * @param nodeEnv - Environment name ('development', 'test', 'production')
 * @returns Configuration for the environment
 *
 * @example
 * \`\`\`typescript
 * const config = get{className}ConfigForEnvironment(env.NODE_ENV)
 * \`\`\`
 */
export function get{className}ConfigForEnvironment(
  nodeEnv: string = env.NODE_ENV ?? "development"
): {className}Config {
  switch (nodeEnv) {
    case "production":
      return production{className}Config
    case "test":
      return test{className}Config
    case "development":
    default:
      return development{className}Config
  }
}`
      }
    },
    // Configuration Validation
    {
      title: 'Configuration Validation',
      content: {
        type: 'raw',
        value: `/**
 * Validate configuration
 *
 * Performs basic validation on configuration object.
 * Extend with additional validation as needed.
 *
 * @param config - Configuration to validate
 * @throws Error if configuration is invalid
 *
 * @example
 * \`\`\`typescript
 * const config = get{className}ConfigForEnvironment()
 * validate{className}Config(config)
 * \`\`\`
 */
export function validate{className}Config(config: {className}Config): void {
  // Basic validation - extend as needed
  if (config.timeout !== undefined && config.timeout < 0) {
    throw new Error("Invalid timeout: must be non-negative")
  }

  // TODO: Add additional validation logic as needed
}`
      }
    }
  ]
}

export default infraConfigTemplate
