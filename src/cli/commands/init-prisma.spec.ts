/**
 * Prisma Scaffolding Tests
 *
 * Tests for the Prisma directory structure scaffolding functionality.
 * Uses Effect's in-memory file system for isolated testing.
 */

import { FileSystem } from '@effect/platform';
import { NodePath } from '@effect/platform-node';
import { Effect, Layer } from 'effect';
import { describe, expect, it } from 'vitest';
import { scaffoldPrismaStructure } from './init-prisma';

/**
 * In-memory file system implementation for testing
 */
function makeTestFileSystem() {
  const files = new Map<string, string>();
  const directories = new Set<string>();

  // eslint-disable-next-line no-restricted-syntax -- satisfies cannot replace full interface implementation
  const testFs = {
    access: () => Effect.void,
    copy: () => Effect.void,
    copyFile: () => Effect.void,
    chmod: () => Effect.void,
    chown: () => Effect.void,
    exists: (path: string) => Effect.succeed(files.has(path) || directories.has(path)),
    link: () => Effect.void,
    makeDirectory: (path: string) =>
      Effect.sync(() => {
        directories.add(path);
        // Also add parent directories
        const parts = path.split('/');
        for (let i = 1; i < parts.length; i++) {
          directories.add(parts.slice(0, i).join('/'));
        }
      }),
    makeTempDirectory: () => Effect.succeed('/tmp/test'),
    makeTempDirectoryScoped: () => Effect.succeed('/tmp/test'),
    makeTempFile: () => Effect.succeed('/tmp/test-file'),
    makeTempFileScoped: () => Effect.succeed('/tmp/test-file'),
    open: () => Effect.fail(new Error('Not implemented')),
    readDirectory: () => Effect.succeed([]),
    readFile: (path: string) =>
      files.has(path)
        ? Effect.succeed(new TextEncoder().encode(files.get(path)!))
        : Effect.fail(new Error(`File not found: ${path}`)),
    readFileString: (path: string) =>
      files.has(path)
        ? Effect.succeed(files.get(path)!)
        : Effect.fail(new Error(`File not found: ${path}`)),
    readLink: () => Effect.succeed(''),
    realPath: (path: string) => Effect.succeed(path),
    remove: () => Effect.void,
    rename: () => Effect.void,
    sink: () => Effect.fail(new Error('Not implemented')),
    stat: () => Effect.fail(new Error('Not implemented')),
    stream: () => Effect.fail(new Error('Not implemented')),
    symlink: () => Effect.void,
    truncate: () => Effect.void,
    utimes: () => Effect.void,
    watch: () => Effect.fail(new Error('Not implemented')),
    writeFile: () => Effect.void,
    writeFileString: (path: string, content: string) =>
      Effect.sync(() => {
        files.set(path, content);
      }),
  } as FileSystem.FileSystem;

  return {
    layer: Layer.succeed(FileSystem.FileSystem, testFs),
    files,
    directories,
  };
}

describe('init-prisma', () => {
  describe('scaffoldPrismaStructure', () => {
    it('should create prisma directory structure', async () => {
      const { directories, layer } = makeTestFileSystem();
      const testLayer = Layer.merge(layer, NodePath.layer);

      await Effect.runPromise(scaffoldPrismaStructure().pipe(Effect.provide(testLayer)));

      expect(directories.has('prisma/schemas')).toBe(true);
      expect(directories.has('prisma/migrations')).toBe(true);
    });

    it('should create schema.prisma with correct configuration', async () => {
      const { files, layer } = makeTestFileSystem();
      const testLayer = Layer.merge(layer, NodePath.layer);

      await Effect.runPromise(scaffoldPrismaStructure().pipe(Effect.provide(testLayer)));

      const schemaContent = files.get('prisma/schema.prisma');
      expect(schemaContent).toBeTruthy();
      expect(schemaContent).toContain('generator client');
      expect(schemaContent).toContain('generator effectSchemas');
      expect(schemaContent).toContain('provider = "prisma-effect-kysely"');
      expect(schemaContent).toContain('output   = "../libs/contract"');
      expect(schemaContent).toContain('multiFileDomains = "true"');
      expect(schemaContent).toContain('scaffoldLibraries = "true"');
      expect(schemaContent).toContain('datasource db');
      expect(schemaContent).toContain('provider = "postgresql"');
    });

    it('should create .gitkeep files in empty directories', async () => {
      const { files, layer } = makeTestFileSystem();
      const testLayer = Layer.merge(layer, NodePath.layer);

      await Effect.runPromise(scaffoldPrismaStructure().pipe(Effect.provide(testLayer)));

      expect(files.has('prisma/schemas/.gitkeep')).toBe(true);
      expect(files.has('prisma/migrations/.gitkeep')).toBe(true);
    });

    it('should create README.md with documentation', async () => {
      const { files, layer } = makeTestFileSystem();
      const testLayer = Layer.merge(layer, NodePath.layer);

      await Effect.runPromise(scaffoldPrismaStructure().pipe(Effect.provide(testLayer)));

      const readmeContent = files.get('prisma/README.md');
      expect(readmeContent).toBeTruthy();
      expect(readmeContent).toContain('# Prisma Schemas');
      expect(readmeContent).toContain('## Structure');
      expect(readmeContent).toContain('## Usage');
      expect(readmeContent).toContain('### 1. Define Models');
      expect(readmeContent).toContain('### 2. Generate Effect Schemas');
      expect(readmeContent).toContain('pnpm run prisma:generate');
      expect(readmeContent).toContain('Multi-Domain Organization');
    });

    it('should create .env file with DATABASE_URL template', async () => {
      const { files, layer } = makeTestFileSystem();
      const testLayer = Layer.merge(layer, NodePath.layer);

      await Effect.runPromise(scaffoldPrismaStructure().pipe(Effect.provide(testLayer)));

      const envContent = files.get('.env');
      expect(envContent).toBeTruthy();
      expect(envContent).toContain('DATABASE_URL=');
      expect(envContent).toContain('postgresql://');
    });

    it('should include multi-schema preview feature in schema.prisma', async () => {
      const { files, layer } = makeTestFileSystem();
      const testLayer = Layer.merge(layer, NodePath.layer);

      await Effect.runPromise(scaffoldPrismaStructure().pipe(Effect.provide(testLayer)));

      const schemaContent = files.get('prisma/schema.prisma');
      expect(schemaContent).toContain('previewFeatures = ["multiSchema"]');
    });

    it('should reference monorepo-library-generator in schema.prisma', async () => {
      const { files, layer } = makeTestFileSystem();
      const testLayer = Layer.merge(layer, NodePath.layer);

      await Effect.runPromise(scaffoldPrismaStructure().pipe(Effect.provide(testLayer)));

      const schemaContent = files.get('prisma/schema.prisma');
      expect(schemaContent).toContain(
        'libraryGenerator = "../node_modules/monorepo-library-generator"',
      );
    });

    it('should create complete file structure in one call', async () => {
      const { directories, files, layer } = makeTestFileSystem();
      const testLayer = Layer.merge(layer, NodePath.layer);

      await Effect.runPromise(scaffoldPrismaStructure().pipe(Effect.provide(testLayer)));

      // Verify all expected files and directories exist
      expect(files.has('prisma/schema.prisma')).toBe(true);
      expect(files.has('prisma/schemas/.gitkeep')).toBe(true);
      expect(files.has('prisma/migrations/.gitkeep')).toBe(true);
      expect(files.has('prisma/README.md')).toBe(true);
      expect(files.has('.env')).toBe(true);
      expect(directories.has('prisma/schemas')).toBe(true);
      expect(directories.has('prisma/migrations')).toBe(true);
    });

    it('should include usage instructions in README', async () => {
      const { files, layer } = makeTestFileSystem();
      const testLayer = Layer.merge(layer, NodePath.layer);

      await Effect.runPromise(scaffoldPrismaStructure().pipe(Effect.provide(testLayer)));

      const readmeContent = files.get('prisma/README.md');
      expect(readmeContent).toContain('prisma:generate');
      expect(readmeContent).toContain('prisma:migrate');
      expect(readmeContent).toContain('prisma:studio');
      expect(readmeContent).toContain('libs/contract/{domain}/src/generated/');
    });

    it('should explain domain detection in README', async () => {
      const { files, layer } = makeTestFileSystem();
      const testLayer = Layer.merge(layer, NodePath.layer);

      await Effect.runPromise(scaffoldPrismaStructure().pipe(Effect.provide(testLayer)));

      const readmeContent = files.get('prisma/README.md');
      expect(readmeContent).toContain('Domain Detection');
      expect(readmeContent).toContain('prisma/schemas/user.prisma');
      expect(readmeContent).toContain('domain: "user"');
      expect(readmeContent).toContain('Contract Library Generation');
    });
  });
});
