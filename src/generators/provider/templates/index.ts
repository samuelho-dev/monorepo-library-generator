/**
 * Provider Generator - Template Exports
 *
 * Central export point for all provider template generation functions.
 * These TypeScript functions replace the previous EJS templates for type-safe code generation.
 *
 * @module monorepo-library-generator/provider/templates
 */

// Core provider templates
export { generateErrorsFile } from './errors.template'
export { generateIndexFile } from './index.template'
// Kysely provider templates
export {
  generateKyselyErrorsFile,
  generateKyselyIndexFile,
  generateKyselyInterfaceFile,
  generateKyselyProviderServiceFile,
  generateKyselyProviderServiceIndexFile
} from './kysely/index'
// OpenTelemetry provider templates
export {
  generateOtelErrorsFile,
  generateOtelIndexFile,
  generateOtelServiceFile,
  generateOtelSpecFile,
  generateOtelTypesFile,
  generateOtelTypesOnlyFile
} from './opentelemetry/index'
// Redis provider templates
export {
  generateRedisCacheServiceFile,
  generateRedisErrorsFile,
  generateRedisIndexFile,
  generateRedisPubSubServiceFile,
  generateRedisQueueServiceFile,
  generateRedisServiceFile,
  generateRedisServiceIndexFile,
  generateRedisSpecFile,
  generateRedisTypesFile
} from './redis/index'

// Service templates
export { generateProviderServiceFile, generateProviderServiceIndexFile } from './service/index'
export { generateServiceSpecFile } from './service-spec.template'
// Supabase provider templates
export {
  generateSupabaseAuthServiceFile,
  generateSupabaseClientServiceFile,
  generateSupabaseErrorsFile,
  generateSupabaseIndexFile,
  generateSupabaseServiceIndexFile,
  generateSupabaseSpecFile,
  generateSupabaseStorageServiceFile,
  generateSupabaseTypesFile
} from './supabase/index'
export { generateTypesFile } from './types.template'
export { generateValidationFile } from './validation.template'
