/**
 * Infrastructure Config Template
 *
 * Generates service configuration types and defaults.
 *
 * @module monorepo-library-generator/infra-templates
 */

import { TypeScriptBuilder } from "../../../utils/code-generation/typescript-builder"
import type { InfraTemplateOptions } from "../../../utils/shared/types"

/**
 * Generate config file for infrastructure service
 */
export function generateConfigFile(options: InfraTemplateOptions) {
  const builder = new TypeScriptBuilder()
  const { className, fileName } = options

  // File header
  builder.addFileHeader({
    title: `${className} Service Configuration`,
    description:
      `Configuration constants and types for ${className} service.\nUse Effect's Context.Tag pattern for dependency injection if configuration\nneeds to vary by environment.\n\nTODO: Customize this file for your service:\n1. Add service configuration constants\n2. Define ${className}Config interface\n3. Add environment-specific defaults\n4. Document configuration requirements`,
    module: `@custom-repo/infra-${fileName}/config`,
    see: [
      "https://effect.website/docs/guides/context-management for config patterns"
    ]
  })

  // Section: Configuration Types
  builder.addSectionComment("Configuration Types")

  // Config interface
  builder.addRaw(`/**
 * ${className} Service Configuration
 *
 * TODO: Define configuration properties for your service
 *
 * @example
 * \`\`\`typescript
 * export interface ${className}Config {
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
 * \`\`\`
 */
export interface ${className}Config {
  // TODO: Add configuration properties
  readonly timeout?: number;
}`)
  builder.addBlankLine()

  // Section: Default Configuration
  builder.addSectionComment("Default Configuration")

  builder.addRaw(`/**
 * Default ${className} configuration
 *
 * TODO: Set reasonable defaults for your service
 */
export const default${className}Config: ${className}Config = {
  // TODO: Set defaults for your configuration
  timeout: 30_000, // 30 seconds
};`)
  builder.addBlankLine()

  // Section: Environment-Specific Configuration
  builder.addSectionComment("Environment-Specific Configuration")

  builder.addRaw(`/**
 * Development configuration
 *
 * TODO: Customize for development environment
 */
export const development${className}Config: ${className}Config = {
  ...default${className}Config,
  // TODO: Override with development-specific values
};`)
  builder.addBlankLine()

  builder.addRaw(`/**
 * Test configuration
 *
 * TODO: Customize for test environment
 */
export const test${className}Config: ${className}Config = {
  ...default${className}Config,
  timeout: 5_000, // Shorter timeout for tests
  // TODO: Override with test-specific values
};`)
  builder.addBlankLine()

  builder.addRaw(`/**
 * Production configuration
 *
 * TODO: Customize for production environment
 */
export const production${className}Config: ${className}Config = {
  ...default${className}Config,
  timeout: 60_000, // Longer timeout for production
  // TODO: Override with production-specific values
};`)
  builder.addBlankLine()

  // Section: Configuration Helpers
  builder.addSectionComment("Configuration Helpers")

  builder.addFunction({
    name: `get${className}ConfigForEnvironment`,
    params: [
      {
        name: "env",
        type: "string",
        defaultValue: "process.env[\"NODE_ENV\"] || 'development'"
      }
    ],
    body: `switch (env) {
  case 'production':
    return production${className}Config;
  case 'test':
    return test${className}Config;
  case 'development':
  default:
    return development${className}Config;
}`,
    jsdoc:
      `Get configuration for environment\n\n@param env - Environment name ('development', 'test', 'production')\n@returns Configuration for the environment\n\n@example\n\`\`\`typescript\nconst config = get${className}ConfigForEnvironment(process.env["NODE_ENV"]);\n\`\`\``
  })

  // Section: Configuration Validation
  builder.addSectionComment("Configuration Validation")

  builder.addFunction({
    name: `validate${className}Config`,
    params: [{ name: "config", type: `${className}Config` }],
    body: `// TODO: Add validation logic
// Example:
// if (!config.timeout || config.timeout < 0) {
//   throw new Error('Invalid timeout: must be positive number');
// }`,
    jsdoc:
      `Validate configuration\n\nTODO: Add configuration validation logic\n\n@param config - Configuration to validate\n@throws Error if configuration is invalid\n\n@example\n\`\`\`typescript\nvalidate${className}Config(config);\n\`\`\``
  })

  return builder.toString()
}
