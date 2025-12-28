/**
 * Library Types Registry
 *
 * Single source of truth for all library type metadata.
 * Used by both CLI commands and TUI panels.
 *
 * @module monorepo-library-generator/cli/core/config/library-types
 */

import type { LibraryTypeMetadata, WizardActionMetadata } from "../types"

/**
 * All single library types with their metadata
 */
export const LIBRARY_TYPES: ReadonlyArray<LibraryTypeMetadata> = Object.freeze([
  Object.freeze({
    type: "contract",
    label: "Contract",
    description: "Domain types, schemas, and interfaces",
    icon: "📝",
    generatedFiles: [
      "src/index.ts",
      "src/lib/entities.ts",
      "src/lib/errors.ts",
      "src/lib/events.ts",
      "src/lib/ports.ts",
      "src/lib/rpc.ts"
    ]
  }),
  Object.freeze({
    type: "data-access",
    label: "Data-Access",
    description: "Repository with database operations",
    icon: "💾",
    generatedFiles: [
      "src/index.ts",
      "src/lib/repository.ts",
      "src/lib/repository.spec.ts",
      "src/lib/types.ts"
    ]
  }),
  Object.freeze({
    type: "feature",
    label: "Feature",
    description: "Business logic with server/client support",
    icon: "⚙️",
    defaultPlatform: "universal",
    generatedFiles: [
      "src/index.ts",
      "src/lib/service.ts",
      "src/lib/service.spec.ts",
      "src/lib/rpc/"
    ]
  }),
  Object.freeze({
    type: "infra",
    label: "Infra",
    description: "Infrastructure services and implementations",
    icon: "🔧",
    defaultPlatform: "node",
    generatedFiles: [
      "src/index.ts",
      "src/lib/service.ts",
      "src/lib/service.spec.ts",
      "src/lib/layers.ts",
      "src/lib/types.ts"
    ]
  }),
  Object.freeze({
    type: "provider",
    label: "Provider",
    description: "External service integrations",
    icon: "🔌",
    defaultPlatform: "node",
    generatedFiles: [
      "src/index.ts",
      "src/lib/service.ts",
      "src/lib/service.spec.ts",
      "src/lib/layers.ts",
      "src/lib/types.ts",
      "src/lib/errors.ts"
    ]
  })
])

/**
 * Special wizard actions (shown separately from library types)
 */
export const WIZARD_ACTIONS: ReadonlyArray<WizardActionMetadata> = Object.freeze([
  Object.freeze({
    type: "init",
    label: "Init",
    description: "Generate all built-in provider and infra libraries",
    icon: "🚀",
    generatesTo: [
      "libs/provider/kysely/",
      "libs/provider/supabase/",
      "libs/env/",
      "libs/infra/cache/",
      "libs/infra/database/",
      "libs/infra/logging/",
      "libs/infra/metrics/",
      "libs/infra/queue/",
      "libs/infra/pubsub/",
      "libs/infra/auth/",
      "libs/infra/storage/",
      "libs/infra/rpc/"
    ]
  }),
  Object.freeze({
    type: "domain",
    label: "Domain",
    description: "Complete domain with contract, data-access, and feature",
    icon: "📦",
    generatesTo: [
      "libs/contract/<name>/",
      "libs/data-access/<name>/",
      "libs/feature/<name>/"
    ]
  })
])

/**
 * Get library type metadata by type
 */
export function getLibraryTypeMetadata(type: string): LibraryTypeMetadata | undefined {
  return LIBRARY_TYPES.find((t) => t.type === type)
}

/**
 * Get wizard action metadata by type
 */
export function getWizardActionMetadata(type: string): WizardActionMetadata | undefined {
  return WIZARD_ACTIONS.find((a) => a.type === type)
}

/**
 * Check if a type requires external service input
 */
export function requiresExternalService(type: string): boolean {
  const metadata = getLibraryTypeMetadata(type)
  return metadata?.hasExternalService === true
}

/**
 * Check if selection is a wizard action (init/domain)
 */
export function isWizardAction(type: string): type is "init" | "domain" {
  return type === "init" || type === "domain"
}

/**
 * Check if selection is a single library type
 */
export function isSingleLibraryType(
  type: string
): type is "contract" | "data-access" | "feature" | "infra" | "provider" {
  return LIBRARY_TYPES.some((t) => t.type === type)
}
