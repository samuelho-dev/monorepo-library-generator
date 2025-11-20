/**
 * Barrel Export Utilities
 *
 * Shared utilities for generating barrel export (index.ts) files across all generators.
 * Consolidates duplicated export patterns and provides consistent API for export generation.
 *
 * @module monorepo-library-generator/barrel-export-utils
 */

import type { TypeScriptBuilder } from '../template-utils';

/**
 * Configuration for standard error exports
 */
export interface StandardErrorExportConfig {
  /**
   * Class name prefix (e.g., "User" for UserError, UserNotFoundError, etc.)
   */
  readonly className: string;

  /**
   * Import path for error exports
   * @example "./lib/shared/errors.js"
   */
  readonly importPath: string;

  /**
   * Union type name suffix
   * @example "RepositoryError" or "ServiceError"
   * @default "ServiceError"
   */
  readonly unionTypeSuffix?: string;
}

/**
 * Generates standard error exports used across multiple generators
 *
 * Creates exports for:
 * - Base error class
 * - NotFoundError
 * - ValidationError
 * - ConflictError
 * - ConfigError
 * - ConnectionError
 * - TimeoutError
 * - InternalError
 * - Union type (ServiceError or RepositoryError)
 *
 * @example
 * ```typescript
 * const errorExports = generateStandardErrorExports({
 *   className: 'User',
 *   importPath: './lib/shared/errors.js',
 *   unionTypeSuffix: 'RepositoryError'
 * });
 * builder.addRaw(errorExports);
 * ```
 */
export function generateStandardErrorExports(
  config: StandardErrorExportConfig,
): string {
  const { className, importPath, unionTypeSuffix = 'ServiceError' } = config;

  const errorTypes = [
    `${className}Error`,
    `${className}NotFoundError`,
    `${className}ValidationError`,
    `${className}ConflictError`,
    `${className}ConfigError`,
    `${className}ConnectionError`,
    `${className}TimeoutError`,
    `${className}InternalError`,
  ];

  let output = `export {\n`;
  output += errorTypes.map((e) => `  ${e},`).join('\n');
  output += `\n} from "${importPath}";\n`;
  output += `export type { ${className}${unionTypeSuffix} } from "${importPath}";`;

  return output;
}

/**
 * Export section item configuration
 */
export interface ExportSectionItem {
  /**
   * Optional comment above the export
   */
  readonly comment?: string;

  /**
   * The export statement
   * @example "export * from './lib/errors';"
   */
  readonly exports: string;
}

/**
 * Export section configuration
 */
export interface ExportSection {
  /**
   * Section title for the section comment
   */
  readonly title: string;

  /**
   * Export items within this section
   */
  readonly items: ReadonlyArray<ExportSectionItem>;
}

/**
 * Generates organized export sections with comments
 *
 * Creates well-structured barrel exports with:
 * - Section headers
 * - Optional inline comments
 * - Proper spacing between sections
 *
 * @example
 * ```typescript
 * const sections: ExportSection[] = [
 *   {
 *     title: 'Core Exports',
 *     items: [
 *       { comment: 'Errors', exports: 'export * from "./lib/errors.js";' },
 *       { comment: 'Entities', exports: 'export * from "./lib/entities.js";' }
 *     ]
 *   },
 *   {
 *     title: 'Service Exports',
 *     items: [
 *       { exports: 'export { MyService } from "./lib/service.js";' }
 *     ]
 *   }
 * ];
 *
 * generateExportSections(builder, sections);
 * ```
 */
export function generateExportSections(
  builder: TypeScriptBuilder,
  sections: ReadonlyArray<ExportSection>,
): void {
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];

    builder.addSectionComment(section.title);
    builder.addBlankLine();

    for (const item of section.items) {
      if (item.comment) {
        builder.addComment(item.comment);
      }
      builder.addRaw(item.exports);
      builder.addBlankLine();
    }

    // Add extra spacing between sections (except after last section)
    if (i < sections.length - 1) {
      builder.addBlankLine();
    }
  }
}

/**
 * Conditional export configuration
 */
export interface ConditionalExport {
  /**
   * Condition that must be true for exports to be generated
   */
  readonly condition: boolean;

  /**
   * Section title when condition is true
   */
  readonly sectionTitle: string;

  /**
   * Export items to generate when condition is true
   */
  readonly exports: ReadonlyArray<ExportSectionItem>;
}

/**
 * Adds conditional export sections based on feature flags
 *
 * Useful for generators with optional features (CQRS, RPC, client/server, etc.)
 *
 * @example
 * ```typescript
 * addConditionalExports(builder, [
 *   {
 *     condition: includeCQRS,
 *     sectionTitle: 'CQRS Exports',
 *     exports: [
 *       { comment: 'Commands', exports: 'export * from "./lib/commands.js";' },
 *       { comment: 'Queries', exports: 'export * from "./lib/queries.js";' }
 *     ]
 *   },
 *   {
 *     condition: includeRPC,
 *     sectionTitle: 'RPC Exports',
 *     exports: [
 *       { exports: 'export * from "./lib/rpc.js";' }
 *     ]
 *   }
 * ]);
 * ```
 */
export function addConditionalExports(
  builder: TypeScriptBuilder,
  exports: ReadonlyArray<ConditionalExport>,
): void {
  for (const item of exports) {
    if (item.condition) {
      builder.addBlankLine();
      builder.addSectionComment(item.sectionTitle);
      builder.addBlankLine();

      for (const exp of item.exports) {
        if (exp.comment) {
          builder.addComment(exp.comment);
        }
        builder.addRaw(exp.exports);
        builder.addBlankLine();
      }
    }
  }
}

/**
 * Platform-specific barrel export configuration
 */
export interface PlatformExportConfig {
  /**
   * Package name
   * @example "@custom-repo/infra-cache"
   */
  readonly packageName: string;

  /**
   * Export type (determines description)
   */
  readonly exportType: 'server' | 'client' | 'edge' | 'main';

  /**
   * Optional custom title
   */
  readonly title?: string;

  /**
   * Optional custom module path
   */
  readonly module?: string;
}

/**
 * Adds platform-specific barrel export file header
 *
 * Generates appropriate documentation for server/client/edge/main entry points.
 *
 * @example
 * ```typescript
 * addPlatformExportHeader(builder, {
 *   packageName: '@custom-repo/infra-cache',
 *   exportType: 'server'
 * });
 * ```
 */
export function addPlatformExportHeader(
  builder: TypeScriptBuilder,
  config: PlatformExportConfig,
): void {
  const descriptions = {
    server: `Server-side exports for ${config.packageName}.\nContains service implementations, layers, and server-specific functionality.`,
    client: `Client-side exports for ${config.packageName}.\nContains React hooks, client-specific layers, and browser-safe functionality.`,
    edge: `Edge runtime exports for ${config.packageName}.\nContains edge-specific layers and functionality for edge runtime environments.`,
    main: `Main entry point for ${config.packageName}.`,
  };

  builder.addFileHeader({
    title: config.title || `${config.packageName} - ${config.exportType}`,
    description: descriptions[config.exportType],
    module: config.module || config.packageName,
  });
}
