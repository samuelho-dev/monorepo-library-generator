/**
 * Template Registry Types
 *
 * Type definitions for the template registry system.
 *
 * @module monorepo-library-generator/templates/registry/types
 */

import type { TemplateDefinition } from "../core/types"

/**
 * Library types supported by the generator
 */
export type LibraryType =
  | "contract"
  | "data-access"
  | "feature"
  | "infra"
  | "provider"
  | "env"

/**
 * File types that can be generated
 */
export type FileType =
  | "errors"
  | "events"
  | "ports"
  | "layers"
  | "service"
  | "types"
  | "index"
  | "config"

/**
 * Template key combining library type and file type
 */
export type TemplateKey = `${LibraryType}/${FileType}`

/**
 * Template metadata for registry entries
 */
export interface TemplateMetadata {
  /** Unique template identifier */
  readonly id: string
  /** Library type this template belongs to */
  readonly libraryType: LibraryType
  /** File type this template generates */
  readonly fileType: FileType
  /** Human-readable description */
  readonly description: string
  /** Required context variables */
  readonly requiredContext: ReadonlyArray<string>
  /** Optional context variables */
  readonly optionalContext?: ReadonlyArray<string>
}

/**
 * Registry entry combining template definition and metadata
 */
export interface TemplateRegistryEntry {
  /** Template definition */
  readonly template: TemplateDefinition
  /** Template metadata */
  readonly metadata: TemplateMetadata
}

/**
 * Template registry interface
 */
export interface TemplateRegistry {
  /** Get template by key */
  readonly get: (key: TemplateKey) => TemplateRegistryEntry | undefined
  /** Get all templates for a library type */
  readonly getByLibraryType: (libraryType: LibraryType) => ReadonlyArray<TemplateRegistryEntry>
  /** Get all registered template keys */
  readonly keys: () => ReadonlyArray<TemplateKey>
  /** Check if a template exists */
  readonly has: (key: TemplateKey) => boolean
  /** Get template count */
  readonly size: () => number
}

/**
 * Generator options with template context
 */
export interface GeneratorOptions {
  /** Name of the entity/domain */
  readonly name: string
  /** Library type to generate */
  readonly libraryType: LibraryType
  /** NPM scope (e.g., "@myorg") */
  readonly scope: string
  /** File types to generate (defaults to all available) */
  readonly fileTypes?: ReadonlyArray<FileType>
  /** Additional context variables */
  readonly context?: Record<string, unknown>
}

/**
 * Generation result for a single file
 */
export interface GeneratedFile {
  /** Relative file path */
  readonly path: string
  /** Generated content */
  readonly content: string
  /** Template used */
  readonly templateId: string
}

/**
 * Generation result for a library
 */
export interface GenerationResult {
  /** Library type generated */
  readonly libraryType: LibraryType
  /** Generated files */
  readonly files: ReadonlyArray<GeneratedFile>
  /** Generation duration in milliseconds */
  readonly durationMs: number
  /** Any warnings during generation */
  readonly warnings?: ReadonlyArray<string>
}
