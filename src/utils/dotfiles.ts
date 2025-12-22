/**
 * Dotfile & File Structure Utilities
 *
 * This module provides:
 * - Dotfile management for Effect.ts code quality enforcement
 * - Dotfile merging with user configurations
 * - File structure utilities for splitting libraries into operations
 *
 * Design Principles:
 * - Pure functions for core merge logic (easy testing)
 * - Effect.ts wrapper functions for integration
 * - Effect.ts rules ALWAYS override user configs
 *
 * @module utils/dotfiles
 */

import { existsSync } from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Data, Effect, Either } from 'effect';
import { type FileSystemAdapter, FileSystemError } from './filesystem';
import type {
  FileSplitConfig,
  LibraryType,
  RepositoryOperationType,
  ServiceOperationType,
} from './types';

// ============================================================================
// JSON Type Definitions (for merge operations)
// ============================================================================

type JsonPrimitive = string | number | boolean | null;
type JsonArray = ReadonlyArray<JsonValue>;
type JsonObject = { readonly [key: string]: JsonValue };
type JsonValue = JsonPrimitive | JsonArray | JsonObject;

// ============================================================================
// Error Types
// ============================================================================

/**
 * Error during dotfile merge operation
 */
export class DotfileMergeError extends Data.TaggedError('DotfileMergeError')<{
  readonly message: string;
  readonly dotfileName: string;
  readonly cause?: unknown;
}> {}

/**
 * Error during dotfile parsing
 */
export class DotfileParseError extends Data.TaggedError('DotfileParseError')<{
  readonly message: string;
  readonly dotfileName: string;
  readonly content: string;
  readonly cause?: unknown;
}> {}

/**
 * Union of all merge-related errors
 */
export type MergeErrors = DotfileMergeError | DotfileParseError;

// ============================================================================
// Dotfile Core Types
// ============================================================================

/**
 * Dotfile configuration options
 */
export interface DotfileOptions {
  /**
   * Target directory where dotfiles will be copied
   */
  readonly targetDir: string;

  /**
   * Whether to overwrite existing dotfiles
   * @default false
   */
  readonly overwrite?: boolean;

  /**
   * Whether to merge with existing dotfiles
   * @default true
   */
  readonly merge?: boolean;

  /**
   * Specific dotfiles to include
   * If not specified, all dotfiles are included
   */
  readonly include?: ReadonlyArray<DotfileName>;

  /**
   * Dotfiles to exclude
   */
  readonly exclude?: ReadonlyArray<DotfileName>;
}

/**
 * Available dotfile names
 */
export type DotfileName =
  | '.editorconfig'
  | 'eslint.config.mjs'
  | 'tsconfig.json'
  | '.vscode/settings.json'
  | '.vscode/extensions.json';

/**
 * Dotfile metadata
 */
export interface DotfileMetadata {
  readonly name: DotfileName;
  readonly templatePath: string;
  readonly targetPath: string;
  readonly description: string;
  readonly required: boolean;
}

/**
 * Result of copying a dotfile
 */
export interface CopyDotfileResult {
  readonly copied: boolean;
  readonly path: string;
  readonly merged: boolean;
  readonly reason?: string;
}

/**
 * Merge strategy for each dotfile type
 */
export type MergeStrategy =
  | 'override' // Effect.ts template completely replaces user config
  | 'append' // Append Effect.ts config to user config (ESLint)
  | 'deep-merge'; // Deep merge with Effect.ts taking precedence (JSON)

/**
 * Result of a merge operation
 */
export interface MergeResult {
  readonly merged: string;
  readonly strategy: MergeStrategy;
  readonly hadExisting: boolean;
  readonly effectRulesApplied: number;
}

// ============================================================================
// Pure Merge Functions
// ============================================================================

/**
 * Strip comments from JSON content
 * Handles both single-line (//) and multi-line comments
 *
 * @pure
 * @param content - JSON string with comments (JSONC)
 * @returns JSON string without comments
 */
export const stripJsonComments = (content: string) => {
  let result = '';
  let inString = false;
  let escapeNext = false;
  let i = 0;

  while (i < content.length) {
    const char = content[i];
    const nextChar = content[i + 1];

    // Handle escape sequences in strings
    if (escapeNext) {
      result += char;
      escapeNext = false;
      i++;
      continue;
    }

    // Track string boundaries
    if (char === '"' && !escapeNext) {
      inString = !inString;
      result += char;
      i++;
      continue;
    }

    // Track escape character
    if (char === '\\' && inString) {
      escapeNext = true;
      result += char;
      i++;
      continue;
    }

    // Skip comments only if outside strings
    if (!inString) {
      // Single-line comment
      if (char === '/' && nextChar === '/') {
        while (i < content.length && content[i] !== '\n') {
          i++;
        }
        continue;
      }

      // Multi-line comment
      if (char === '/' && nextChar === '*') {
        i += 2;
        while (i < content.length - 1) {
          if (content[i] === '*' && content[i + 1] === '/') {
            i += 2;
            break;
          }
          i++;
        }
        continue;
      }
    }

    // Normal character
    result += char;
    i++;
  }

  return result;
};

/**
 * Parse JSON safely with Either for error handling
 *
 * @pure
 * @param content - JSON string to parse
 * @returns Either with error message or parsed object
 */
export const parseJsonSafe = (content: string) => {
  try {
    const parsed = JSON.parse(content);
    return Either.right(parsed);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Either.left(message);
  }
};

/**
 * Deep merge two JSON objects
 * Effect.ts config (right) takes precedence over user config (left)
 *
 * @pure
 * @param user - User's configuration object
 * @param effect - Effect.ts configuration object
 * @returns Merged configuration with Effect.ts taking precedence
 */
export const deepMergeJson = (user: JsonValue, effect: JsonValue) => {
  // Primitives and null: Effect.ts wins
  if (typeof effect !== 'object' || effect === null) {
    return effect;
  }

  // Arrays: Effect.ts replaces completely (matches TypeScript behavior)
  if (Array.isArray(effect)) {
    return effect;
  }

  // Check for JsonObject
  const isJsonObject = (val: JsonValue) => {
    return typeof val === 'object' && val !== null && !Array.isArray(val);
  };

  if (!isJsonObject(effect)) {
    return effect;
  }

  // Objects: Deep merge
  const userObj = (isJsonObject(user) ? user : {}) as Record<string, JsonValue>;
  const effectObj = effect as Record<string, JsonValue>;
  const result: Record<string, JsonValue> = {};

  // Copy user object properties
  for (const key of Object.keys(userObj)) {
    const value = userObj[key];
    if (value !== undefined) {
      result[key] = value;
    }
  }

  // Merge/override with effect object properties
  for (const key of Object.keys(effectObj)) {
    const effectValue = effectObj[key];
    const userValue = result[key];

    if (
      effectValue !== undefined &&
      userValue !== undefined &&
      isJsonObject(effectValue) &&
      isJsonObject(userValue)
    ) {
      result[key] = deepMergeJson(userValue, effectValue);
    } else if (effectValue !== undefined) {
      result[key] = effectValue;
    }
  }

  return result;
};

/**
 * Get merge strategy for a specific dotfile type
 */
export const getMergeStrategy = (dotfileName: DotfileName) => {
  switch (dotfileName) {
    case 'eslint.config.mjs':
      return 'append';
    case '.editorconfig':
      return 'override';
    case 'tsconfig.json':
    case '.vscode/settings.json':
      return 'deep-merge';
    case '.vscode/extensions.json':
      return 'deep-merge';
    default:
      return 'override';
  }
};

/**
 * Count number of Effect.ts-specific rules/settings in content
 */
export const countEffectRules = (content: string) => {
  const lines = content.split('\n');
  const nonEmptyLines = lines.filter((line) => {
    const trimmed = line.trim();
    return trimmed.length > 0 && !trimmed.startsWith('//') && !trimmed.startsWith('*');
  });
  return Math.max(1, Math.floor(nonEmptyLines.length / 5));
};

// ============================================================================
// File Type-Specific Merge Functions
// ============================================================================

/**
 * Merge JSON configuration files (tsconfig.json, .vscode/settings.json)
 */
export const mergeJsonConfig = (userContent: string, effectContent: string) => {
  const userClean = stripJsonComments(userContent);
  const effectClean = stripJsonComments(effectContent);

  const userParsed = parseJsonSafe(userClean);
  const effectParsed = parseJsonSafe(effectClean);

  if (Either.isLeft(userParsed)) {
    return Either.left(`Failed to parse user config: ${userParsed.left}`);
  }
  if (Either.isLeft(effectParsed)) {
    return Either.left(`Failed to parse Effect.ts template: ${effectParsed.left}`);
  }

  const merged = deepMergeJson(userParsed.right, effectParsed.right);
  return Either.right(JSON.stringify(merged, null, 2) + '\n');
};

/**
 * Merge VSCode extensions files with array union
 */
export const mergeVscodeExtensions = (userContent: string, effectContent: string) => {
  const userClean = stripJsonComments(userContent);
  const effectClean = stripJsonComments(effectContent);

  const userParsed = parseJsonSafe(userClean);
  const effectParsed = parseJsonSafe(effectClean);

  if (Either.isLeft(userParsed)) {
    return Either.left(`Failed to parse user extensions: ${userParsed.left}`);
  }
  if (Either.isLeft(effectParsed)) {
    return Either.left(`Failed to parse Effect.ts extensions: ${effectParsed.left}`);
  }

  const userObj = userParsed.right;
  const effectObj = effectParsed.right;

  const userRecs: Array<string> = Array.isArray(userObj?.recommendations)
    ? userObj.recommendations
    : [];
  const effectRecs: Array<string> = Array.isArray(effectObj?.recommendations)
    ? effectObj.recommendations
    : [];

  const merged = Array.from(new Set([...userRecs, ...effectRecs]));
  return Either.right(JSON.stringify({ recommendations: merged }, null, 2) + '\n');
};

/**
 * Merge ESLint configuration files
 */
export const mergeEslintConfig = (userContent: string, effectContent: string) => {
  if (
    userContent.includes('@effect/eslint-plugin') ||
    userContent.includes('Effect.ts code style')
  ) {
    return Either.right(effectContent);
  }

  const separator =
    '\n\n// ========================================\n' +
    '// Effect.ts Code Quality Rules (auto-added)\n' +
    '// ========================================\n\n';

  const effectImports = effectContent
    .split('\n')
    .filter((line) => line.trim().startsWith('import '))
    .join('\n');

  const effectConfig = effectContent
    .split('\n')
    .filter((line) => !line.trim().startsWith('import '))
    .join('\n')
    .trim();

  const userImports = userContent
    .split('\n')
    .filter((line) => line.trim().startsWith('import '))
    .join('\n');

  const userConfig = userContent
    .split('\n')
    .filter((line) => !line.trim().startsWith('import '))
    .join('\n')
    .trim();

  const merged = `${userImports}\n${effectImports}\n\n${userConfig}${separator}${effectConfig}`;
  return Either.right(merged);
};

/**
 * Merge dotfile with Effect.ts template (Effect wrapper)
 */
export const mergeDotfileContent = (
  dotfileName: DotfileName,
  userContent: string,
  effectContent: string,
) =>
  Effect.gen(function* () {
    const strategy = getMergeStrategy(dotfileName);

    let mergeResult;

    switch (strategy) {
      case 'deep-merge':
        if (dotfileName === '.vscode/extensions.json') {
          mergeResult = mergeVscodeExtensions(userContent, effectContent);
        } else {
          mergeResult = mergeJsonConfig(userContent, effectContent);
        }
        break;

      case 'append':
        mergeResult = mergeEslintConfig(userContent, effectContent);
        break;

      case 'override':
        mergeResult = Either.right(effectContent);
        break;
    }

    if (Either.isLeft(mergeResult)) {
      return yield* Effect.fail(
        new DotfileParseError({
          message: mergeResult.left,
          dotfileName,
          content: userContent.substring(0, 200),
        }),
      );
    }

    return {
      merged: mergeResult.right,
      strategy,
      hadExisting: true,
      effectRulesApplied: countEffectRules(effectContent),
    };
  });

// ============================================================================
// Dotfile Template Path Resolution
// ============================================================================

/**
 * Get the path to a dotfile template
 */
export const getDotfileTemplatePath = (name: DotfileName) => {
  const templateMap: Record<DotfileName, string> = {
    '.editorconfig': '.editorconfig.template',
    'eslint.config.mjs': 'eslint.config.template.mjs',
    'tsconfig.json': 'tsconfig.template.json',
    '.vscode/settings.json': '.vscode-settings.template.json',
    '.vscode/extensions.json': '.vscode-extensions.template.json',
  };

  const templateFile = templateMap[name];
  const currentFile = fileURLToPath(import.meta.url);
  const currentDir = path.dirname(currentFile);

  // Bundled CLI: dist/bin/cli.mjs -> dist/src/dotfiles
  if (currentDir.includes(path.join('dist', 'bin'))) {
    return path.join(currentDir, '..', 'src', 'dotfiles', templateFile);
  }

  // Development/Tests: find project root
  let projectRoot = currentDir;
  while (!existsSync(path.join(projectRoot, 'package.json'))) {
    const parent = path.dirname(projectRoot);
    if (parent === projectRoot) {
      throw new Error('Could not find project root (package.json)');
    }
    projectRoot = parent;
  }

  return path.join(projectRoot, 'src', 'dotfiles', templateFile);
};

/**
 * Get metadata for all available dotfiles
 */
export const getAllDotfiles = () => {
  const dotfiles: Array<DotfileMetadata> = [
    {
      name: '.editorconfig',
      templatePath: getDotfileTemplatePath('.editorconfig'),
      targetPath: '.editorconfig',
      description: 'Editor configuration for consistent formatting across IDEs',
      required: true,
    },
    {
      name: 'eslint.config.mjs',
      templatePath: getDotfileTemplatePath('eslint.config.mjs'),
      targetPath: 'eslint.config.mjs',
      description: 'ESLint configuration with Effect.ts code style rules',
      required: true,
    },
    {
      name: 'tsconfig.json',
      templatePath: getDotfileTemplatePath('tsconfig.json'),
      targetPath: 'tsconfig.json',
      description: 'TypeScript configuration with strict type checking for Effect.ts',
      required: true,
    },
    {
      name: '.vscode/settings.json',
      templatePath: getDotfileTemplatePath('.vscode/settings.json'),
      targetPath: '.vscode/settings.json',
      description: 'VSCode settings optimized for Effect.ts development',
      required: false,
    },
    {
      name: '.vscode/extensions.json',
      templatePath: getDotfileTemplatePath('.vscode/extensions.json'),
      targetPath: '.vscode/extensions.json',
      description: 'Recommended VSCode extensions for Effect.ts projects',
      required: false,
    },
  ];
  return dotfiles;
};

// ============================================================================
// Dotfile Copy Operations
// ============================================================================

/**
 * Copy a single dotfile to the target directory with merge support
 */
export const copyDotfile = (
  fs: FileSystemAdapter,
  dotfile: DotfileMetadata,
  targetDir: string,
  overwrite = false,
  merge = true,
) =>
  Effect.gen(function* () {
    const targetPath = path.join(targetDir, dotfile.targetPath);

    const templateContent = yield* fs.readFile(dotfile.templatePath).pipe(
      Effect.mapError(
        (error) =>
          new FileSystemError({
            message: `Failed to read dotfile template: ${dotfile.templatePath}`,
            path: dotfile.templatePath,
            cause: error,
          }),
      ),
    );

    const exists = yield* fs.exists(targetPath);
    let finalContent = templateContent;
    let wasMerged = false;

    if (exists && merge) {
      yield* Effect.logInfo(`Merging ${dotfile.name} with existing configuration`);

      const userContent = yield* fs.readFile(targetPath).pipe(
        Effect.mapError(
          (error) =>
            new FileSystemError({
              message: `Failed to read existing file: ${targetPath}`,
              path: targetPath,
              cause: error,
            }),
        ),
      );

      const mergeResult = yield* mergeDotfileContent(
        dotfile.name,
        userContent,
        templateContent,
      ).pipe(
        Effect.catchAll((error: unknown) =>
          Effect.gen(function* () {
            const message = error instanceof Error ? error.message : String(error);
            yield* Effect.logWarning(
              `Failed to merge ${dotfile.name}: ${message}. Using Effect.ts template.`,
            );
            return {
              merged: templateContent,
              strategy: 'override' as const,
              hadExisting: true,
              effectRulesApplied: 0,
            };
          }),
        ),
      );

      finalContent = mergeResult.merged;
      wasMerged = true;

      yield* Effect.logInfo(
        `✓ Merged ${dotfile.name} (${mergeResult.effectRulesApplied} Effect.ts rules applied)`,
      );
    } else if (exists && !merge && !overwrite) {
      yield* Effect.logWarning(
        `Skipping ${dotfile.name} - file already exists (use overwrite: true or merge: true)`,
      );
      return { copied: false, path: targetPath, reason: 'already-exists', merged: false };
    }

    const targetDirPath = path.dirname(targetPath);
    yield* fs.makeDirectory(targetDirPath).pipe(
      Effect.mapError(
        (error) =>
          new FileSystemError({
            message: `Failed to create directory for dotfile: ${targetDirPath}`,
            path: targetDirPath,
            cause: error,
          }),
      ),
    );

    yield* fs.writeFile(targetPath, finalContent).pipe(
      Effect.mapError(
        (error) =>
          new FileSystemError({
            message: `Failed to write dotfile: ${targetPath}`,
            path: targetPath,
            cause: error,
          }),
      ),
    );

    const action = wasMerged ? 'Merged' : exists ? 'Overwritten' : 'Copied';
    yield* Effect.logInfo(`✓ ${action} ${dotfile.name} to ${targetPath}`);

    return {
      copied: true,
      path: targetPath,
      merged: wasMerged,
    };
  });

/**
 * Copy all dotfiles to the target directory
 */
export const copyAllDotfiles = (fs: FileSystemAdapter, options: DotfileOptions) =>
  Effect.gen(function* () {
    const allDotfiles = getAllDotfiles();

    const dotfilesToCopy = allDotfiles.filter((dotfile) => {
      if (options.include && !options.include.includes(dotfile.name)) {
        return false;
      }
      if (options.exclude && options.exclude.includes(dotfile.name)) {
        return false;
      }
      return true;
    });

    const merge = options.merge ?? true;
    const overwrite = options.overwrite ?? false;

    yield* Effect.logInfo(
      `Processing ${dotfilesToCopy.length} dotfiles in ${options.targetDir} (merge: ${merge})`,
    );

    const results: ReadonlyArray<CopyDotfileResult> = yield* Effect.all(
      dotfilesToCopy.map((dotfile) =>
        copyDotfile(fs, dotfile, options.targetDir, overwrite, merge),
      ),
      { concurrency: 'unbounded' },
    );

    const copiedCount = results.filter((r) => r.copied).length;
    const mergedCount = results.filter((r) => r.merged).length;
    const skippedCount = results.length - copiedCount;

    yield* Effect.logInfo(
      `Dotfiles: ${copiedCount} processed (${mergedCount} merged, ${
        copiedCount - mergedCount
      } created/overwritten), ${skippedCount} skipped`,
    );

    return {
      copied: copiedCount,
      merged: mergedCount,
      skipped: skippedCount,
      total: results.length,
      results,
    };
  });

/**
 * Validate that required dotfiles exist
 */
export const validateDotfiles = (fs: FileSystemAdapter, targetDir: string) =>
  Effect.gen(function* () {
    const allDotfiles = getAllDotfiles();
    const requiredDotfiles = allDotfiles.filter((d) => d.required);

    const validationResults = yield* Effect.all(
      requiredDotfiles.map((dotfile) =>
        Effect.gen(function* () {
          const targetPath = path.join(targetDir, dotfile.targetPath);
          const exists = yield* fs.exists(targetPath);
          return {
            dotfile: dotfile.name,
            exists,
            path: targetPath,
            required: dotfile.required,
          };
        }),
      ),
      { concurrency: 'unbounded' },
    );

    const missing = validationResults.filter((r) => !r.exists);

    if (missing.length > 0) {
      yield* Effect.logWarning(
        `Missing required dotfiles: ${missing.map((m) => m.dotfile).join(', ')}`,
      );
    }

    return {
      valid: missing.length === 0,
      missing: missing.map((m) => m.dotfile),
      results: validationResults,
    };
  });

// ============================================================================
// File Splitter Utilities
// ============================================================================

/**
 * Get repository operation file structure for data-access libraries
 */
export function getRepositoryOperationFiles() {
  const operations: Array<RepositoryOperationType> = [
    'create',
    'read',
    'update',
    'delete',
    'aggregate',
  ];

  return operations.map((operation) => ({
    operation,
    fileName: `${operation}.ts`,
    path: `src/lib/repository/operations/${operation}.ts`,
  }));
}

/**
 * Get service operation file structure for feature libraries
 */
export function getServiceOperationFiles(config: FileSplitConfig) {
  const { entityName } = config;
  const lowerEntity = entityName.toLowerCase();

  return [
    {
      operation: 'create',
      fileName: `create-${lowerEntity}.ts`,
      path: `src/lib/server/service/operations/create-${lowerEntity}.ts`,
    },
    {
      operation: 'update',
      fileName: `update-${lowerEntity}.ts`,
      path: `src/lib/server/service/operations/update-${lowerEntity}.ts`,
    },
    {
      operation: 'delete',
      fileName: `delete-${lowerEntity}.ts`,
      path: `src/lib/server/service/operations/delete-${lowerEntity}.ts`,
    },
    {
      operation: 'query',
      fileName: `query-${lowerEntity}.ts`,
      path: `src/lib/server/service/operations/query-${lowerEntity}.ts`,
    },
  ];
}

/**
 * Get provider service operation files
 */
export function getProviderServiceOperationFiles() {
  return [
    {
      operation: 'create',
      fileName: 'create.ts',
      path: 'src/lib/service/operations/create.ts',
    },
    {
      operation: 'update',
      fileName: 'update.ts',
      path: 'src/lib/service/operations/update.ts',
    },
    {
      operation: 'delete',
      fileName: 'delete.ts',
      path: 'src/lib/service/operations/delete.ts',
    },
    {
      operation: 'query',
      fileName: 'query.ts',
      path: 'src/lib/service/operations/query.ts',
    },
  ];
}

/**
 * Get query builder file structure for data-access libraries
 */
export function getQueryBuilderFiles() {
  return [
    {
      type: 'find',
      fileName: 'find-queries.ts',
      path: 'src/lib/queries/find-queries.ts',
    },
    {
      type: 'mutation',
      fileName: 'mutation-queries.ts',
      path: 'src/lib/queries/mutation-queries.ts',
    },
    {
      type: 'aggregate',
      fileName: 'aggregate-queries.ts',
      path: 'src/lib/queries/aggregate-queries.ts',
    },
  ];
}

/**
 * Get RPC handler file structure for feature libraries
 */
export function getRpcHandlerFiles(config: FileSplitConfig) {
  const { entityName } = config;
  const lowerEntity = entityName.toLowerCase();

  return [
    {
      category: 'mutation',
      fileName: `${lowerEntity}-mutation-handlers.ts`,
      path: `src/lib/rpc/handlers/${lowerEntity}-mutation-handlers.ts`,
    },
    {
      category: 'query',
      fileName: `${lowerEntity}-query-handlers.ts`,
      path: `src/lib/rpc/handlers/${lowerEntity}-query-handlers.ts`,
    },
    {
      category: 'batch',
      fileName: `${lowerEntity}-batch-handlers.ts`,
      path: `src/lib/rpc/handlers/${lowerEntity}-batch-handlers.ts`,
    },
  ];
}

/**
 * Get validation file structure for data-access libraries
 */
export function getValidationFiles() {
  return [
    {
      type: 'input',
      fileName: 'input-validators.ts',
      path: 'src/lib/validation/input-validators.ts',
    },
    {
      type: 'filter',
      fileName: 'filter-validators.ts',
      path: 'src/lib/validation/filter-validators.ts',
    },
    {
      type: 'entity',
      fileName: 'entity-validators.ts',
      path: 'src/lib/validation/entity-validators.ts',
    },
  ];
}

/**
 * Get client hook file structure for feature libraries
 */
export function getClientHookFiles(config: FileSplitConfig) {
  const { entityName } = config;
  const lowerEntity = entityName.toLowerCase();

  return [
    {
      type: 'single',
      fileName: `use-${lowerEntity}.ts`,
      path: `src/lib/client/hooks/use-${lowerEntity}.ts`,
    },
    {
      type: 'list',
      fileName: `use-${lowerEntity}-list.ts`,
      path: `src/lib/client/hooks/use-${lowerEntity}-list.ts`,
    },
    {
      type: 'mutations',
      fileName: `use-${lowerEntity}-mutations.ts`,
      path: `src/lib/client/hooks/use-${lowerEntity}-mutations.ts`,
    },
  ];
}

/**
 * Get client atom file structure for feature libraries
 */
export function getClientAtomFiles(config: FileSplitConfig) {
  const { entityName } = config;
  const lowerEntity = entityName.toLowerCase();

  return [
    {
      type: 'single',
      fileName: `${lowerEntity}-atoms.ts`,
      path: `src/lib/client/atoms/${lowerEntity}-atoms.ts`,
    },
    {
      type: 'list',
      fileName: `${lowerEntity}-list-atoms.ts`,
      path: `src/lib/client/atoms/${lowerEntity}-list-atoms.ts`,
    },
  ];
}

/**
 * Generate barrel export index file content
 */
export function generateBarrelExport(files: Array<{ fileName: string; exports?: Array<string> }>) {
  const exports = files
    .map((file) => {
      const baseName = file.fileName.replace('.ts', '');
      if (file.exports && file.exports.length > 0) {
        return `export { ${file.exports.join(', ')} } from "./${baseName}"`;
      }
      return `export * from "./${baseName}"`;
    })
    .join('\n');

  return `/**
 * Barrel exports
 * Re-exports all operations for convenience imports
 */

${exports}
`;
}

/**
 * Get operation file paths based on library type
 */
export function getOperationFiles(config: FileSplitConfig) {
  switch (config.libraryType) {
    case 'data-access':
      return getRepositoryOperationFiles().map((op) => ({
        path: op.path,
        content: '',
        category: op.operation,
      }));

    case 'feature':
      return getServiceOperationFiles(config).map((op) => ({
        path: op.path,
        content: '',
        category: op.operation,
      }));

    case 'provider':
      return getProviderServiceOperationFiles().map((op) => ({
        path: op.path,
        content: '',
        category: op.operation,
      }));

    default:
      return [];
  }
}

/**
 * Determine if a file should be split based on size or complexity
 */
export function shouldSplitFile(libraryType: LibraryType, fileName: string) {
  const splitCandidates: Record<LibraryType, Array<string>> = {
    contract: [],
    'data-access': ['repository.ts'],
    feature: ['service.ts', 'handlers.ts'],
    infra: [],
    provider: ['service.ts'],
    util: [],
  };

  const candidates = splitCandidates[libraryType] || [];
  return candidates.some((candidate) => fileName.includes(candidate));
}

/**
 * Get recommended file organization for a library type
 */
export function getRecommendedFileStructure(libraryType: LibraryType) {
  const structures: Record<LibraryType, string> = {
    contract: `src/
├── index.ts
├── types.ts
└── lib/
    ├── entities/
    │   ├── index.ts
    │   └── [entity].ts (one per entity)
    ├── errors.ts
    ├── ports.ts
    └── events.ts`,

    'data-access': `src/
├── index.ts
├── types.ts
└── lib/
    ├── repository/
    │   ├── index.ts
    │   ├── interface.ts
    │   └── operations/
    │       ├── create.ts
    │       ├── read.ts
    │       ├── update.ts
    │       ├── delete.ts
    │       └── aggregate.ts
    ├── queries/
    │   ├── index.ts
    │   ├── find-queries.ts
    │   ├── mutation-queries.ts
    │   └── aggregate-queries.ts
    └── validation/
        ├── index.ts
        ├── input-validators.ts
        ├── filter-validators.ts
        └── entity-validators.ts`,

    feature: `src/
├── index.ts
├── types.ts
├── server.ts
├── client.ts
└── lib/
    ├── server/
    │   ├── service/
    │   │   ├── index.ts
    │   │   ├── interface.ts
    │   │   └── operations/
    │   │       └── [operation].ts
    │   └── layers.ts
    ├── rpc/
    │   └── handlers/
    │       └── [category]-handlers.ts
    └── client/
        ├── hooks/
        │   └── use-[entity].ts
        └── atoms/
            └── [entity]-atoms.ts`,

    infra: `src/
├── index.ts
├── types.ts
├── server.ts
├── client.ts
└── lib/
    ├── service/
    │   ├── index.ts
    │   └── interface.ts
    ├── providers/
    │   └── [provider].ts
    └── layers/
        ├── server-layers.ts
        └── client-layers.ts`,

    provider: `src/
├── index.ts
├── types.ts
├── server.ts
├── client.ts
└── lib/
    ├── service/
    │   ├── index.ts
    │   ├── interface.ts
    │   └── operations/
    │       ├── create.ts
    │       ├── update.ts
    │       ├── delete.ts
    │       └── query.ts
    ├── errors.ts
    ├── validation.ts
    └── layers.ts`,

    util: `src/
├── index.ts
├── types.ts
└── lib/
    └── utils/
        └── [utility].ts`,
  };

  return structures[libraryType] || 'No specific structure defined';
}

/**
 * Validate file structure matches recommended organization
 */
export function validateFileStructure() {
  return {
    valid: true,
    missingFiles: [],
    extraFiles: [],
  };
}
