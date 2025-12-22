/**
 * Consolidated Type Definitions
 *
 * All type definitions for the monorepo library generator.
 * This is the single source of truth for types across all utilities.
 *
 * @module monorepo-library-generator/types
 */

// ============================================================================
// Core Library Types
// ============================================================================

/**
 * Library types supported by the generator
 */
export type LibraryType = 'contract' | 'data-access' | 'feature' | 'provider' | 'infra' | 'util';

/**
 * Platform type for build configuration
 */
export type PlatformType = 'node' | 'browser' | 'universal' | 'edge';

/**
 * Runtime platforms supported by libraries
 */
export type Platform = 'client' | 'server' | 'edge' | 'universal';

// ============================================================================
// Naming Variants
// ============================================================================

/**
 * Common naming variants for code generation
 */
export interface NamingVariants {
  /**
   * Original input name
   */
  readonly name: string;

  /**
   * PascalCase variant (for class names)
   * @example "UserProfile"
   */
  readonly className: string;

  /**
   * camelCase variant (for property/variable names)
   * @example "userProfile"
   */
  readonly propertyName: string;

  /**
   * kebab-case variant (for file names)
   * @example "user-profile"
   */
  readonly fileName: string;

  /**
   * SCREAMING_SNAKE_CASE variant (for constants)
   * @example "USER_PROFILE"
   */
  readonly constantName: string;
}

// ============================================================================
// Template Options
// ============================================================================

/**
 * Base template options shared across all generators
 */
export interface BaseTemplateOptions extends NamingVariants {
  /**
   * Library type
   */
  readonly libraryType: LibraryType;

  /**
   * Package name with scope
   * @example "@myorg/contract-user"
   */
  readonly packageName: string;

  /**
   * NX project name
   * @example "contract-user"
   */
  readonly projectName: string;

  /**
   * Project root directory (relative to workspace root)
   * @example "libs/contract/user"
   */
  readonly projectRoot: string;

  /**
   * Source root directory (relative to workspace root)
   * @example "libs/contract/user/src"
   */
  readonly sourceRoot: string;

  /**
   * Relative path from project root to workspace root
   * @example "../../.."
   */
  readonly offsetFromRoot: string;

  /**
   * Library description
   */
  readonly description: string;

  /**
   * Library tags for organization
   */
  readonly tags: ReadonlyArray<string>;
}

/**
 * Contract library specific options
 */
export interface ContractTemplateOptions extends BaseTemplateOptions {
  /**
   * List of entity names to generate
   * Used for bundle optimization with separate entity files
   */
  readonly entities: ReadonlyArray<string>;

  /**
   * Whether to include CQRS patterns (commands, queries, projections)
   */
  readonly includeCQRS: boolean;

  /**
   * Whether to include RPC schema definitions
   */
  readonly includeRPC: boolean;
}

/**
 * Feature library specific options
 */
export interface FeatureTemplateOptions extends BaseTemplateOptions {
  /**
   * Whether to include client-side code
   */
  readonly includeClient: boolean;

  /**
   * Whether to include server-side code
   */
  readonly includeServer: boolean;

  /**
   * Whether to include edge runtime code
   */
  readonly includeEdge: boolean;

  /**
   * Whether to include RPC handlers
   */
  readonly includeRPC: boolean;

  /**
   * Whether to include CQRS implementation
   */
  readonly includeCQRS: boolean;
}

/**
 * Data access library specific options
 */
export interface DataAccessTemplateOptions extends BaseTemplateOptions {
  /**
   * Database type (for type-specific query builders)
   */
  readonly databaseType?: 'postgres' | 'mysql' | 'sqlite';

  /**
   * Contract library this data-access implements
   */
  readonly contractLibrary: string;
}

/**
 * Infrastructure library specific options (deprecated - use InfraTemplateOptions)
 */
export interface InfrastructureTemplateOptions extends BaseTemplateOptions {
  /**
   * Type of infrastructure service
   */
  readonly infraType:
    | 'cache'
    | 'logging'
    | 'metrics'
    | 'auth'
    | 'config'
    | 'storage'
    | 'messaging'
    | 'custom';

  /**
   * Platforms this infrastructure service supports
   */
  readonly platforms: ReadonlyArray<Platform>;
}

/**
 * Infrastructure library specific options
 */
export interface InfraTemplateOptions extends BaseTemplateOptions {
  /**
   * Whether to include client-side and server-side code (multi-platform)
   */
  readonly includeClientServer: boolean;

  /**
   * Whether to include edge runtime code
   */
  readonly includeEdge: boolean;
}

/**
 * Provider library specific options
 */
export interface ProviderTemplateOptions extends BaseTemplateOptions {
  /**
   * External service/SDK being wrapped
   */
  readonly externalService: string;

  /**
   * Platform-specific implementations needed
   */
  readonly platforms: ReadonlyArray<Platform>;

  /**
   * Type of provider integration
   */
  readonly providerType?: 'sdk' | 'cli' | 'http' | 'graphql';

  /**
   * CLI command name (for CLI providers)
   */
  readonly cliCommand?: string;

  /**
   * Base URL (for HTTP/GraphQL providers)
   */
  readonly baseUrl?: string;

  /**
   * Authentication type (for HTTP/GraphQL providers)
   */
  readonly authType?: 'bearer' | 'apikey' | 'oauth' | 'basic' | 'none';
}

// ============================================================================
// File Structure Types
// ============================================================================

/**
 * Operation category for data-access repositories
 */
export type RepositoryOperationType = 'create' | 'read' | 'update' | 'delete' | 'aggregate';

/**
 * Operation category for feature services
 */
export type ServiceOperationType = 'create' | 'update' | 'delete' | 'query' | 'batch';

/**
 * Handler category for RPC handlers
 */
export type HandlerCategory = 'mutation' | 'query' | 'batch' | 'subscription';

/**
 * Query builder category
 */
export type QueryBuilderType = 'find' | 'mutation' | 'aggregate';

/**
 * File split configuration
 */
export interface FileSplitConfig {
  libraryType: LibraryType;
  entityName: string;
  className: string;
  operationTypes?: Array<RepositoryOperationType | ServiceOperationType>;
  includeTests?: boolean;
}

/**
 * Split result containing file paths and contents
 */
export interface SplitFileResult {
  path: string;
  content: string;
  category: string;
}

// ============================================================================
// Generator Types
// ============================================================================

/**
 * Template function type
 *
 * A function that generates file content from options
 */
export type TemplateFunction<TOptions = BaseTemplateOptions> = (options: TOptions) => string;

/**
 * File to be generated
 */
export interface GeneratedFileSpec {
  /**
   * Absolute path to the file
   */
  readonly path: string;

  /**
   * File content
   */
  readonly content: string;

  /**
   * Whether this file should overwrite existing files
   * @default false
   */
  readonly overwrite?: boolean;
}

/**
 * Generator configuration
 */
export interface GeneratorConfig<TOptions = BaseTemplateOptions> {
  /**
   * Library type this generator creates
   */
  readonly libraryType: LibraryType;

  /**
   * Default files always generated
   */
  readonly defaultFiles: ReadonlyArray<string>;

  /**
   * Conditional files based on feature flags
   */
  readonly conditionalFiles?: Readonly<Record<string, ReadonlyArray<string>>>;

  /**
   * Template functions for each file
   */
  readonly templates?: Readonly<Record<string, TemplateFunction<TOptions>>>;

  /**
   * Default tags for this library type
   */
  readonly defaultTags: ReadonlyArray<string>;
}

/**
 * Validation result
 */
export interface ValidationResult {
  /**
   * Whether validation passed
   */
  readonly valid: boolean;

  /**
   * Validation errors (if any)
   */
  readonly errors: ReadonlyArray<string>;
}

/**
 * Generator context
 *
 * Provides access to workspace information and utilities
 */
export interface GeneratorContext {
  /**
   * Workspace root directory
   */
  readonly workspaceRoot: string;

  /**
   * Package manager being used
   */
  readonly packageManager: 'npm' | 'yarn' | 'pnpm';

  /**
   * Whether this is an NX workspace
   */
  readonly isNxWorkspace: boolean;

  /**
   * Whether this is an Effect native monorepo
   */
  readonly isEffectNative: boolean;
}

/**
 * File generation result
 */
export interface FileGenerationResult {
  /**
   * Files that were generated
   */
  readonly generatedFiles: ReadonlyArray<string>;

  /**
   * Files that were skipped (already exist)
   */
  readonly skippedFiles: ReadonlyArray<string>;

  /**
   * Any warnings during generation
   */
  readonly warnings: ReadonlyArray<string>;
}

/**
 * Template registry
 *
 * Maps file names to template functions
 */
export type TemplateRegistry<TOptions = BaseTemplateOptions> = Readonly<
  Record<string, TemplateFunction<TOptions>>
>;

/**
 * Generator hooks
 *
 * Allow customization at different stages of generation
 */
export interface GeneratorHooks<TOptions = BaseTemplateOptions> {
  /**
   * Called before any files are generated
   */
  readonly beforeGenerate?: (options: TOptions) => void | Promise<void>;

  /**
   * Called after all files are generated
   */
  readonly afterGenerate?: (
    options: TOptions,
    result: FileGenerationResult,
  ) => void | Promise<void>;

  /**
   * Called before each file is written
   */
  readonly beforeFileWrite?: (filePath: string, content: string) => string | Promise<string>;

  /**
   * Called after each file is written
   */
  readonly afterFileWrite?: (filePath: string) => void | Promise<void>;
}
