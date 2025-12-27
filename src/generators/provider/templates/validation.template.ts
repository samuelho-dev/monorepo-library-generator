/**
 * Provider Generator - Validation Template
 *
 * Generates client-safe validation utilities for provider libraries.
 * All validation functions are safe to export in client.ts (no secrets, no server logic).
 *
 * @module monorepo-library-generator/provider/templates/validation
 */

import { TypeScriptBuilder } from '../../../utils/code-builder'
import type { ProviderTemplateOptions } from '../../../utils/types'
import { names } from '../../../utils/naming'

/**
 * Generate validation.ts file for provider library
 *
 * Creates client-safe validation functions for common input types.
 *
 * @param options - Provider template options
 * @returns Generated TypeScript code
 */
export function generateValidationFile(options: ProviderTemplateOptions) {
  const builder = new TypeScriptBuilder()
  const { externalService, name: projectClassName } = options
  const className = names(externalService).className

  // File header
  builder.addRaw('/**')
  builder.addRaw(` * ${projectClassName} - Validation Utilities`)
  builder.addRaw(' *')
  builder.addRaw(' * Client-safe validation functions (no secrets, no server logic)')
  builder.addRaw(' * Safe to export in client.ts')
  builder.addRaw(' */')
  builder.addBlankLine()

  // Type imports
  builder.addImport('./types', `${className}Config`, true)
  builder.addBlankLine()

  // Validate config function (type guard)
  builder.addFunction({
    name: `validate${className}Config`,
    exported: true,
    jsdoc: `Validate ${className} configuration\n\n@param config - Configuration to validate\n@returns true if configuration is valid`,
    params: [{ name: 'config', type: 'unknown' }],
    returnType: `config is ${className}Config`,
    body: `if (!config || typeof config !== "object") {
  return false;
}

const cfg = config as Record<string, unknown>;

// API key is required and must be a non-empty string
if (!cfg.apiKey || typeof cfg.apiKey !== "string" || cfg.apiKey.length < 10) {
  return false;
}

// Timeout must be positive if provided
if (cfg.timeout !== undefined) {
  if (typeof cfg.timeout !== "number" || cfg.timeout <= 0 || cfg.timeout > 300000) {
    return false;
  }
}

// Base URL must be valid if provided
if (cfg.baseUrl !== undefined) {
  if (typeof cfg.baseUrl !== "string") {
    return false;
  }
  try {
    new URL(cfg.baseUrl);
  } catch {
    return false;
  }
}

return true;`
  })

  // Validate input function
  builder.addFunction({
    name: `validate${className}Input`,
    exported: true,
    jsdoc: `Validate ${className} input\n\nGeneric input validation for API calls.\n\n@param input - Input to validate\n@returns true if input is valid`,
    params: [{ name: 'input', type: 'unknown' }],
    returnType: 'boolean',
    body: `if (!input || typeof input !== "object") {
  return false;
}

// Add specific validation rules based on your API requirements
return true;`
  })

  // Validate API key format
  builder.addFunction({
    name: 'validateApiKey',
    exported: true,
    jsdoc: 'Validate API key format',
    params: [{ name: 'apiKey', type: 'string' }],
    body: `if (!apiKey || typeof apiKey !== "string") {
  return false;
}

// TODO: Add ${externalService} specific validation
// Example: Check key prefix, length, format
return apiKey.length >= 10;`
  })

  // Validate timeout value
  builder.addFunction({
    name: 'validateTimeout',
    exported: true,
    jsdoc: 'Validate timeout value',
    params: [{ name: 'timeout', type: 'number' }],
    body: `return (
  typeof timeout === "number" && timeout > 0 && timeout <= 300000 // Max 5 minutes
)`
  })

  // Validate email format
  builder.addFunction({
    name: 'validateEmail',
    exported: true,
    jsdoc: 'Validate email format (client-safe)',
    params: [{ name: 'email', type: 'string' }],
    body: `if (!email || typeof email !== "string") {
  return false;
}

const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
return emailRegex.test(email)`
  })

  // Validate URL format
  builder.addFunction({
    name: 'validateUrl',
    exported: true,
    jsdoc: 'Validate URL format (client-safe)',
    params: [{ name: 'url', type: 'string' }],
    body: `if (!url || typeof url !== "string") {
  return false;
}

try {
  new URL(url)
  return true;
} catch {
  return false;
}`
  })

  // Validate required field
  builder.addFunction({
    name: 'validateRequired',
    exported: true,
    jsdoc: 'Validate required field',
    typeParams: ['T'],
    params: [{ name: 'value', type: 'T | null | undefined' }],
    body: `return value !== null && value !== undefined && value !== "";`
  })

  // Sanitize string input
  builder.addFunction({
    name: 'sanitizeString',
    exported: true,
    jsdoc: 'Sanitize string input (client-safe)',
    params: [{ name: 'input', type: 'string' }],
    body: `if (!input || typeof input !== "string") {
  return "";
}

return input.trim().slice(0, 1000) // Max 1000 chars`
  })

  return builder.toString()
}
