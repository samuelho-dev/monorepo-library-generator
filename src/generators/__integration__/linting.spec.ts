/**
 * Linting Integration Tests
 *
 * Validates that all generators produce code that follows Effect patterns and ESLint rules.
 * Uses pattern-based validation to check generated code in virtual workspace.
 *
 * @module monorepo-library-generator/integration-tests
 */
import type { Tree } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';

import { contractGenerator } from '../contract/contract';
import { dataAccessGenerator } from '../data-access/data-access';
import { featureGenerator } from '../feature/feature';
import { infraGenerator } from '../infra/infra';
import { providerGenerator } from '../provider/provider';
import { lintTreeFiles } from './utils/linter';

// ============================================================================
// Contract Generator Lint Tests
// ============================================================================

describe('Contract Generator - Linting', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
  });

  it('should generate lint-compliant code with default options', async () => {
    await contractGenerator(tree, { name: 'product' });

    const result = lintTreeFiles(tree, 'libs/contract/product/src');
    expect(result.success).toBe(true);
    expect(result.fileCount).toBeGreaterThan(0);
  });

  it('should generate lint-compliant code with CQRS option', async () => {
    await contractGenerator(tree, { name: 'order', includeCQRS: true });

    const result = lintTreeFiles(tree, 'libs/contract/order/src');
    expect(result.success).toBe(true);
  });

  it('should generate lint-compliant code with RPC option', async () => {
    await contractGenerator(tree, { name: 'user', includeRPC: true });

    const result = lintTreeFiles(tree, 'libs/contract/user/src');
    expect(result.success).toBe(true);
  });

  it('should generate lint-compliant code with all options', async () => {
    await contractGenerator(tree, {
      name: 'payment',
      includeCQRS: true,
      includeRPC: true,
    });

    const result = lintTreeFiles(tree, 'libs/contract/payment/src');
    expect(result.success).toBe(true);
  });
});

// ============================================================================
// Data Access Generator Lint Tests
// ============================================================================

describe('Data Access Generator - Linting', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
  });

  it('should generate lint-compliant code with default options', async () => {
    await dataAccessGenerator(tree, { name: 'product' });

    const result = lintTreeFiles(tree, 'libs/data-access/product/src');
    expect(result.success).toBe(true);
    expect(result.fileCount).toBeGreaterThan(0);
  });

  it('should generate lint-compliant code with CQRS option', async () => {
    await dataAccessGenerator(tree, { name: 'order', includeCQRS: true });

    const result = lintTreeFiles(tree, 'libs/data-access/order/src');
    expect(result.success).toBe(true);
  });

  it('should generate lint-compliant code with multiple operations', async () => {
    await dataAccessGenerator(tree, {
      name: 'user',
      operations: ['create', 'read', 'update', 'delete', 'list', 'count'],
    });

    const result = lintTreeFiles(tree, 'libs/data-access/user/src');
    expect(result.success).toBe(true);
  });
});

// ============================================================================
// Feature Generator Lint Tests
// ============================================================================

describe('Feature Generator - Linting', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
  });

  it('should generate lint-compliant code with default options', async () => {
    await featureGenerator(tree, { name: 'product' });

    const result = lintTreeFiles(tree, 'libs/feature/product/src');
    expect(result.success).toBe(true);
    expect(result.fileCount).toBeGreaterThan(0);
  });

  it('should generate lint-compliant code with sub-services', async () => {
    await featureGenerator(tree, {
      name: 'order',
      subServices: ['validation', 'pricing', 'notification'],
    });

    const result = lintTreeFiles(tree, 'libs/feature/order/src');
    expect(result.success).toBe(true);
  });
});

// ============================================================================
// Infrastructure Generator Lint Tests
// ============================================================================

describe('Infrastructure Generator - Linting', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
  });

  it('should generate lint-compliant code with default options', async () => {
    await infraGenerator(tree, { name: 'cache' });

    const result = lintTreeFiles(tree, 'libs/infra/cache/src');
    expect(result.success).toBe(true);
    expect(result.fileCount).toBeGreaterThan(0);
  });

  it('should generate lint-compliant code with client/server option', async () => {
    await infraGenerator(tree, { name: 'storage', includeClientServer: true });

    const result = lintTreeFiles(tree, 'libs/infra/storage/src');
    expect(result.success).toBe(true);
  });

  it('should generate lint-compliant code with edge option', async () => {
    await infraGenerator(tree, { name: 'config', includeEdge: true });

    const result = lintTreeFiles(tree, 'libs/infra/config/src');
    expect(result.success).toBe(true);
  });

  it('should generate lint-compliant code with all options', async () => {
    await infraGenerator(tree, {
      name: 'metrics',
      includeClientServer: true,
      includeEdge: true,
    });

    const result = lintTreeFiles(tree, 'libs/infra/metrics/src');
    expect(result.success).toBe(true);
  });
});

// ============================================================================
// Provider Generator Lint Tests
// ============================================================================

describe('Provider Generator - Linting', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
  });

  it('should generate lint-compliant code with default options', async () => {
    await providerGenerator(tree, { name: 'stripe', externalService: 'Stripe API' });

    const result = lintTreeFiles(tree, 'libs/provider/stripe/src');
    expect(result.success).toBe(true);
    expect(result.fileCount).toBeGreaterThan(0);
  });

  it('should generate lint-compliant code with operations', async () => {
    await providerGenerator(tree, {
      name: 'twilio',
      externalService: 'Twilio API',
      operations: ['create', 'read', 'update', 'delete', 'query'],
    });

    const result = lintTreeFiles(tree, 'libs/provider/twilio/src');
    expect(result.success).toBe(true);
  });
});

// ============================================================================
// Specific Rule Tests
// ============================================================================

describe('Specific Lint Rules', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
  });

  describe('No Type Assertions', () => {
    it("should not use 'as Type' in generated code", async () => {
      // Generate all types of libraries
      await contractGenerator(tree, { name: 'test1', includeCQRS: true, includeRPC: true });
      await dataAccessGenerator(tree, { name: 'test2', includeCQRS: true });
      await featureGenerator(tree, { name: 'test3', subServices: ['sub1'] });
      await infraGenerator(tree, { name: 'test4', includeClientServer: true, includeEdge: true });
      await providerGenerator(tree, { name: 'test5', externalService: 'Test API' });

      // Check each library
      const libs = [
        'libs/contract/test1/src',
        'libs/data-access/test2/src',
        'libs/feature/test3/src',
        'libs/infra/test4/src',
        'libs/provider/test5/src',
      ];

      for (const lib of libs) {
        const result = lintTreeFiles(tree, lib);
        const typeAssertionErrors = result.errors.filter((e) => e.rule === 'no-type-assertion');
        expect(typeAssertionErrors).toHaveLength(0);
      }
    });
  });

  describe('No File Extensions', () => {
    it('should not use .js extensions in imports', async () => {
      await contractGenerator(tree, { name: 'test', includeCQRS: true });

      const result = lintTreeFiles(tree, 'libs/contract/test/src');
      const extensionErrors = result.errors.filter((e) => e.rule === 'no-file-extension');
      expect(extensionErrors).toHaveLength(0);
    });
  });

  describe('No Effect.Do', () => {
    it('should not use deprecated Effect.Do', async () => {
      await dataAccessGenerator(tree, { name: 'test', includeCQRS: true });
      await featureGenerator(tree, { name: 'test2' });

      const result1 = lintTreeFiles(tree, 'libs/data-access/test/src');
      const result2 = lintTreeFiles(tree, 'libs/feature/test2/src');

      const doErrors = [
        ...result1.errors.filter((e) => e.rule === 'no-effect-do'),
        ...result2.errors.filter((e) => e.rule === 'no-effect-do'),
      ];
      expect(doErrors).toHaveLength(0);
    });
  });

  describe('Yield Star in Effect.gen', () => {
    it('should use yield* not yield in Effect.gen', async () => {
      await dataAccessGenerator(tree, { name: 'test' });
      await providerGenerator(tree, { name: 'test2', externalService: 'Test Service' });

      const result1 = lintTreeFiles(tree, 'libs/data-access/test/src');
      const result2 = lintTreeFiles(tree, 'libs/provider/test2/src');

      const yieldErrors = [
        ...result1.errors.filter((e) => e.rule === 'yield-star-required'),
        ...result2.errors.filter((e) => e.rule === 'yield-star-required'),
      ];
      expect(yieldErrors).toHaveLength(0);
    });
  });
});
