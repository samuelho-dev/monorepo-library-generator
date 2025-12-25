/**
 * Supabase Provider Service Index Template
 *
 * Generates the service barrel export for the Supabase provider.
 *
 * @module monorepo-library-generator/provider/templates/supabase/service-index
 */

import { TypeScriptBuilder } from "../../../../utils/code-builder"
import type { ProviderTemplateOptions } from "../../../../utils/types"

/**
 * Generate Supabase provider service/index.ts file
 */
export function generateSupabaseServiceIndexFile(options: ProviderTemplateOptions) {
  const builder = new TypeScriptBuilder()
  const { packageName } = options

  builder.addFileHeader({
    title: "Supabase Services Barrel Export",
    description: `Re-exports all Supabase service implementations.

This module provides:
- SupabaseClient: Core SDK client management
- SupabaseAuth: Authentication operations
- SupabaseStorage: File storage operations

For granular imports, import directly from service modules.`,
    module: `${packageName}/service`
  })
  builder.addBlankLine()

  // Export all services
  builder.addRaw(`// Core client
export { SupabaseClient, type SupabaseClientServiceInterface } from "./client";

// Authentication
export { SupabaseAuth, type SupabaseAuthServiceInterface } from "./auth";

// Storage
export { SupabaseStorage, type SupabaseStorageServiceInterface } from "./storage";`)

  return builder.toString()
}
