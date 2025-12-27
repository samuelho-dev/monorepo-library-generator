/**
 * TypeScript Configuration Templates
 *
 * Generates tsconfig.json, tsconfig.lib.json, and tsconfig.spec.json
 * for library compilation.
 *
 * @module monorepo-library-generator/infrastructure/tsconfig-template
 */

import type { LibraryType } from "../../../utils/types"

export interface TsConfigBaseOptions {
  readonly offsetFromRoot: string
  readonly types?: ReadonlyArray<string>
}

export interface TsConfigLibOptions {
  readonly projectRoot: string
  readonly references?: ReadonlyArray<{ path: string }>
}

export interface TsConfigSpecOptions {
  readonly types?: ReadonlyArray<string>
}

/**
 * Generate tsconfig.json (base configuration)
 */
export function generateBaseTsConfig(options: TsConfigBaseOptions) {
  const normalizedOffset = options.offsetFromRoot
    .replace(/\/+$/, "")
    .replace(/\/+/g, "/")

  return {
    extends: `${normalizedOffset}/tsconfig.base.json`,
    compilerOptions: {
      outDir: "./dist",
      module: "ESNext",
      moduleResolution: "bundler",
      verbatimModuleSyntax: true,
      types: options.types ?? ["node"]
    },
    include: ["src/**/*.ts"],
    exclude: ["node_modules", "dist", "**/*.spec.ts"],
    references: undefined
  }
}

/**
 * Generate tsconfig.lib.json (library build configuration)
 */
export function generateLibTsConfig(options: TsConfigLibOptions) {
  const config: Record<string, unknown> = {
    extends: "./tsconfig.json",
    compilerOptions: {
      outDir: `../../dist/${options.projectRoot}`,
      declaration: true,
      declarationMap: true,
      noEmit: false
    },
    include: ["src/**/*.ts"],
    exclude: ["src/**/*.spec.ts", "src/**/*.test.ts", "**/*.spec.ts"]
  }

  if (options.references && options.references.length > 0) {
    config.references = options.references
  }

  return config
}

/**
 * Generate tsconfig.spec.json (test configuration)
 */
export function generateSpecTsConfig(options: TsConfigSpecOptions = {}) {
  return {
    extends: "./tsconfig.json",
    compilerOptions: {
      outDir: "./dist-test",
      types: options.types ?? ["vitest/globals", "node"]
    },
    include: ["src/**/*.test.ts", "src/**/*.spec.ts", "src/**/*.d.ts", "vitest.config.ts"]
  }
}

/**
 * Get library-type specific compiler options
 */
export function getLibraryTypeCompilerOptions(libraryType: LibraryType) {
  switch (libraryType) {
    case "contract":
      return { noEmitOnError: true }
    case "data-access":
      return { strictNullChecks: true, strictPropertyInitialization: true }
    case "feature":
    case "provider":
    case "infra":
    case "util":
    default:
      return {}
  }
}
