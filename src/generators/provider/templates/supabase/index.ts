/**
 * Supabase Provider Templates - Export Index
 *
 * Specialized templates for the Supabase provider library.
 * Generates three distinct services:
 * - SupabaseClient: Core client for SDK initialization
 * - SupabaseAuth: Authentication operations (sign in, sign out, verify token)
 * - SupabaseStorage: File storage operations (upload, download, delete)
 *
 * @module monorepo-library-generator/provider/templates/supabase
 */

export { generateSupabaseAuthServiceFile } from "./supabase-auth.template"
export { generateSupabaseClientServiceFile } from "./supabase-client.template"
export { generateSupabaseErrorsFile } from "./supabase-errors.template"
export { generateSupabaseIndexFile } from "./supabase-index.template"
export { generateSupabaseServiceIndexFile } from "./supabase-service-index.template"
export { generateSupabaseSpecFile } from "./supabase-spec.template"
export { generateSupabaseStorageServiceFile } from "./supabase-storage.template"
export { generateSupabaseTypesFile } from "./supabase-types.template"
