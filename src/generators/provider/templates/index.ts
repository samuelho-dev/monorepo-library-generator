/**
 * Provider Generator - Template Exports
 *
 * Central export point for all provider template generation functions.
 * These TypeScript functions replace the previous EJS templates for type-safe code generation.
 *
 * @module monorepo-library-generator/provider/templates
 */

// Core provider templates
export { generateErrorsFile } from "./errors.template"
export { generateIndexFile } from "./index.template"
export { generateServiceSpecFile } from "./service-spec.template"
export { generateTypesFile } from "./types.template"
export { generateValidationFile } from "./validation.template"

// Service templates
export {
  generateProviderServiceFile,
  generateProviderServiceIndexFile
} from "./service/index"

// Kysely provider templates
export {
  generateKyselyErrorsFile,
  generateKyselyIndexFile,
  generateKyselyInterfaceFile,
  generateKyselyProviderServiceFile,
  generateKyselyProviderServiceIndexFile
} from "./kysely/index"

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
} from "./redis/index"

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
} from "./supabase/index"
