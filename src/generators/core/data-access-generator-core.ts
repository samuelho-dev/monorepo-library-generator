/**
 * Data Access Generator Core
 *
 * Shared core logic for generating data-access libraries.
 * Works with both Nx Tree API and Effect FileSystem via FileSystemAdapter.
 *
 * @module monorepo-library-generator/generators/core/data-access-generator-core
 */

import { Effect } from 'effect';
import { names } from '@nx/devkit';
import type { FileSystemAdapter, FileSystemErrors } from '../../utils/filesystem-adapter';
import { generateErrorsFile } from '../data-access/templates/errors.template';
import { generateTypesFile } from '../data-access/templates/types.template';
import { generateValidationFile } from '../data-access/templates/validation.template';
import { generateQueriesFile } from '../data-access/templates/queries.template';
import { generateRepositoryFile } from '../data-access/templates/repository.template';
import { generateLayersFile } from '../data-access/templates/layers.template';
import { generateIndexFile } from '../data-access/templates/index.template';
import { generateRepositorySpecFile } from '../data-access/templates/repository-spec.template';
import { generateLayersSpecFile } from '../data-access/templates/layers-spec.template';
import type { DataAccessTemplateOptions } from '../../utils/shared/types';
import type { GeneratorResult } from './contract-generator-core';
export type { GeneratorResult };

/**
 * Data Access Generator Options
 */
export interface DataAccessGeneratorCoreOptions {
  readonly name: string;
  readonly description?: string;
  readonly tags?: string;
  readonly workspaceRoot?: string;
  readonly directory?: string;
}

/**
 * Generate Data Access Library (Core Logic)
 */
export function generateDataAccessCore(
  adapter: FileSystemAdapter,
  options: DataAccessGeneratorCoreOptions
): Effect.Effect<GeneratorResult, FileSystemErrors, unknown> {
  return Effect.gen(function* () {
    // 1. Get workspace root
    const workspaceRoot = options.workspaceRoot ?? adapter.getWorkspaceRoot();

    // 2. Generate naming variants
    const nameVariants = names(options.name);
    const projectName = `data-access-${nameVariants.fileName}`;
    const packageName = `@custom-repo/${projectName}`;

    // 3. Determine project location
    const projectRoot = options.directory
      ? `${options.directory}/${projectName}`
      : `libs/data-access/${nameVariants.fileName}`;

    const sourceRoot = `${projectRoot}/src`;
    const offsetFromRoot = calculateOffsetFromRoot(projectRoot);

    // 4. Parse tags
    const parsedTags = parseTags(options.tags, [
      'type:data-access',
      'scope:shared',
      'platform:server',
    ]);

    // 5. Generate infrastructure files
    yield* generateInfrastructureFiles(adapter, {
      workspaceRoot,
      projectRoot,
      projectName,
      packageName,
      description: options.description ?? `Data access library for ${nameVariants.className}`,
      offsetFromRoot,
    });

    // 6. Prepare template options
    const templateOptions: DataAccessTemplateOptions = {
      name: options.name,
      className: nameVariants.className,
      propertyName: nameVariants.propertyName,
      fileName: nameVariants.fileName,
      constantName: nameVariants.constantName,
      libraryType: 'data-access',
      packageName,
      projectName,
      projectRoot,
      sourceRoot,
      offsetFromRoot,
      description: options.description ?? `Data access library for ${nameVariants.className}`,
      tags: parsedTags,
      includeCache: false,
      contractLibrary: `@custom-repo/contract-${nameVariants.fileName}`,
    };

    // 7. Generate domain files
    const filesGenerated = yield* generateDomainFiles(adapter, sourceRoot, templateOptions);

    return {
      projectName,
      projectRoot,
      packageName,
      sourceRoot,
      filesGenerated,
    };
  });
}

/**
 * Generate infrastructure files
 */
function generateInfrastructureFiles(
  adapter: FileSystemAdapter,
  options: {
    workspaceRoot: string;
    projectRoot: string;
    projectName: string;
    packageName: string;
    description: string;
    offsetFromRoot: string;
  }
): Effect.Effect<void, FileSystemErrors, unknown> {
  return Effect.gen(function* () {
    const { workspaceRoot, projectRoot, packageName, description, offsetFromRoot } = options;

    yield* adapter.makeDirectory(`${workspaceRoot}/${projectRoot}`);

    const packageJson = {
      name: packageName,
      version: '0.0.1',
      type: 'module' as const,
      description,
      exports: {
        '.': {
          import: './src/index.ts',
          types: './src/index.ts',
        },
      },
      peerDependencies: {
        effect: '*',
      },
    };

    yield* adapter.writeFile(
      `${workspaceRoot}/${projectRoot}/package.json`,
      JSON.stringify(packageJson, null, 2)
    );

    const tsConfig = {
      extends: `${offsetFromRoot}tsconfig.base.json`,
      compilerOptions: {
        outDir: './dist',
        rootDir: './src',
      },
      include: ['src/**/*.ts'],
      exclude: ['node_modules', 'dist', '**/*.spec.ts'],
    };

    yield* adapter.writeFile(
      `${workspaceRoot}/${projectRoot}/tsconfig.json`,
      JSON.stringify(tsConfig, null, 2)
    );

    const readme = `# ${packageName}

${description}

## Overview

Repository-oriented data access library with Effect patterns.

## Structure

- **shared/**: Shared types, errors, and validation
- **lib/**: Repository implementation and queries
- **server/**: Server-side layers

## Usage

\`\`\`typescript
import { /* repository */ } from '${packageName}';
\`\`\`
`;

    yield* adapter.writeFile(`${workspaceRoot}/${projectRoot}/README.md`, readme);
    yield* adapter.makeDirectory(`${workspaceRoot}/${projectRoot}/src`);
  });
}

/**
 * Generate domain-specific files
 */
function generateDomainFiles(
  adapter: FileSystemAdapter,
  sourceRoot: string,
  templateOptions: DataAccessTemplateOptions
): Effect.Effect<readonly string[], FileSystemErrors, unknown> {
  return Effect.gen(function* () {
    const workspaceRoot = adapter.getWorkspaceRoot();
    const sourceLibPath = `${workspaceRoot}/${sourceRoot}/lib`;
    const sourceSharedPath = `${sourceLibPath}/shared`;
    const sourceServerPath = `${sourceLibPath}/server`;
    const files: string[] = [];

    // Create directories
    yield* adapter.makeDirectory(sourceLibPath);
    yield* adapter.makeDirectory(sourceSharedPath);
    yield* adapter.makeDirectory(sourceServerPath);

    // Generate shared files
    const sharedFiles = [
      { path: `${sourceSharedPath}/errors.ts`, generator: generateErrorsFile },
      { path: `${sourceSharedPath}/types.ts`, generator: generateTypesFile },
      { path: `${sourceSharedPath}/validation.ts`, generator: generateValidationFile },
    ];

    for (const { path, generator } of sharedFiles) {
      const content = generator(templateOptions);
      yield* adapter.writeFile(path, content);
      files.push(path);
    }

    // Generate repository files
    const repoFiles = [
      { path: `${sourceLibPath}/queries.ts`, generator: generateQueriesFile },
      { path: `${sourceLibPath}/repository.ts`, generator: generateRepositoryFile },
      { path: `${sourceLibPath}/repository.spec.ts`, generator: generateRepositorySpecFile },
    ];

    for (const { path, generator } of repoFiles) {
      const content = generator(templateOptions);
      yield* adapter.writeFile(path, content);
      files.push(path);
    }

    // Generate server files
    yield* adapter.writeFile(
      `${sourceServerPath}/layers.ts`,
      generateLayersFile(templateOptions)
    );
    files.push(`${sourceServerPath}/layers.ts`);

    yield* adapter.writeFile(
      `${sourceLibPath}/layers.spec.ts`,
      generateLayersSpecFile(templateOptions)
    );
    files.push(`${sourceLibPath}/layers.spec.ts`);

    // Generate index
    const indexPath = `${workspaceRoot}/${sourceRoot}/index.ts`;
    yield* adapter.writeFile(indexPath, generateIndexFile(templateOptions));
    files.push(indexPath);

    return files;
  });
}

function calculateOffsetFromRoot(projectRoot: string): string {
  const depth = projectRoot.split('/').length;
  return '../'.repeat(depth);
}

function parseTags(tags: string | undefined, defaults: string[]): string[] {
  if (!tags) return defaults;
  const parsed = tags.split(',').map((t) => t.trim()).filter(Boolean);
  return Array.from(new Set([...defaults, ...parsed]));
}
