/**
 * Provider Generator - Service Spec Template
 *
 * Generates test file for provider service using @effect/vitest.
 * Tests verify proper SDK wrapping with Effect patterns.
 *
 * @module monorepo-library-generator/provider/templates/service-spec
 */

import { TypeScriptBuilder } from '../../../utils/code-builder';
import type { ProviderTemplateOptions } from '../../../utils/types';

/**
 * Generate service.spec.ts file for provider library
 *
 * Creates comprehensive test file using @effect/vitest patterns.
 *
 * @param options - Provider template options
 * @returns Generated TypeScript code
 */
export function generateServiceSpecFile(options: ProviderTemplateOptions) {
  const builder = new TypeScriptBuilder();
  const { className, externalService, fileName } = options;

  // Detect if this is Kysely provider (uses static layers instead of separate layers.ts)
  const isKyselyProvider = externalService === 'Kysely';

  // File header
  builder.addFileHeader({
    title: `${className} Service Tests`,
    description: `Tests verify Effect service interface and layer composition.
Uses @effect/vitest with it.scoped for resource management.

Testing Guidelines:
- Test service interface (can we access the service?)
- Test layer composition (do layers provide the service correctly?)
- Use it.scoped for layer tests (they need Scope)
- Focus on service mechanics, not implementation details`,
    module: `@myorg/provider-${fileName}`,
  });
  builder.addBlankLine();

  // Imports
  builder.addRaw(`import { describe, expect, it } from "@effect/vitest"`);
  builder.addRaw(`import { Context, Effect, Layer } from "effect"`);
  builder.addBlankLine();

  // Test service tag
  builder.addRaw(`/**`);
  builder.addRaw(` * Test service tag for layer composition tests`);
  builder.addRaw(` */`);
  builder.addRaw(`class ${className}TestService extends Context.Tag("${className}TestService")<`);
  builder.addRaw(`  ${className}TestService,`);
  builder.addRaw(`  {`);
  builder.addRaw(`    readonly getName: () => Effect.Effect<string>`);
  builder.addRaw(`    readonly getConfig: () => Effect.Effect<Record<string, unknown>>`);
  builder.addRaw(`  }`);
  builder.addRaw(`>() {}`);
  builder.addBlankLine();

  // Test layer factory
  builder.addRaw(`/**`);
  builder.addRaw(` * Creates a test layer with configurable behavior`);
  builder.addRaw(` */`);
  builder.addRaw(`function create${className}TestLayer(config: Record<string, unknown> = {}) {`);
  builder.addRaw(`  return Layer.succeed(${className}TestService, {`);
  builder.addRaw(`    getName: () => Effect.succeed("${fileName}"),`);
  builder.addRaw(`    getConfig: () => Effect.succeed(config)`);
  builder.addRaw(`  })`);
  builder.addRaw(`}`);
  builder.addBlankLine();

  // Main describe block
  builder.addRaw(`describe("${className} Service", () => {`);

  // Service Interface tests
  builder.addRaw(`  describe("Service Interface", () => {`);
  builder.addRaw(`    it.scoped("should provide service through layer", () =>`);
  builder.addRaw(`      Effect.gen(function*() {`);
  builder.addRaw(`        const service = yield* ${className}TestService`);
  builder.addRaw(`        const name = yield* service.getName()`);
  builder.addRaw(`        expect(name).toBe("${fileName}")`);
  builder.addRaw(`      }).pipe(Effect.provide(Layer.fresh(create${className}TestLayer()))))`);
  builder.addBlankLine();
  builder.addRaw(`    it.scoped("should provide configuration", () =>`);
  builder.addRaw(`      Effect.gen(function*() {`);
  builder.addRaw(`        const service = yield* ${className}TestService`);
  builder.addRaw(`        const config = yield* service.getConfig()`);
  builder.addRaw(`        expect(config).toEqual({ timeout: 5000 })`);
  builder.addRaw(`      }).pipe(Effect.provide(Layer.fresh(create${className}TestLayer({ timeout: 5000 })))))`);
  builder.addRaw(`  })`);
  builder.addBlankLine();

  // Layer Composition tests
  builder.addRaw(`  describe("Layer Composition", () => {`);
  builder.addRaw(`    it.scoped("should compose with other layers", () =>`);
  builder.addRaw(`      Effect.gen(function*() {`);
  builder.addRaw(`        const service = yield* ${className}TestService`);
  builder.addRaw(`        const name = yield* service.getName()`);
  builder.addRaw(`        expect(name).toBe("${fileName}")`);
  builder.addRaw(`      }).pipe(`);
  builder.addRaw(`        Effect.provide(`);
  builder.addRaw(`          Layer.fresh(`);
  builder.addRaw(`            Layer.merge(`);
  builder.addRaw(`              create${className}TestLayer(),`);
  builder.addRaw(`              Layer.succeed(Context.GenericTag<{ version: string }>("Version"), {`);
  builder.addRaw(`                version: "1.0.0"`);
  builder.addRaw(`              })`);
  builder.addRaw(`            )`);
  builder.addRaw(`          )`);
  builder.addRaw(`        )`);
  builder.addRaw(`      ))`);
  builder.addBlankLine();
  builder.addRaw(`    it.scoped("should allow layer override", () => {`);
  builder.addRaw(`      const overrideLayer = Layer.succeed(${className}TestService, {`);
  builder.addRaw(`        getName: () => Effect.succeed("overridden"),`);
  builder.addRaw(`        getConfig: () => Effect.succeed({ custom: true })`);
  builder.addRaw(`      })`);
  builder.addBlankLine();
  builder.addRaw(`      return Effect.gen(function*() {`);
  builder.addRaw(`        const service = yield* ${className}TestService`);
  builder.addRaw(`        const name = yield* service.getName()`);
  builder.addRaw(`        expect(name).toBe("overridden")`);
  builder.addRaw(`      }).pipe(Effect.provide(Layer.fresh(overrideLayer)))`);
  builder.addRaw(`    })`);
  builder.addRaw(`  })`);
  builder.addBlankLine();

  // Layer Types tests
  builder.addRaw(`  describe("Layer Types", () => {`);
  builder.addRaw(`    it.scoped("should work with Layer.succeed for synchronous initialization", () => {`);
  builder.addRaw(`      const syncLayer = Layer.succeed(${className}TestService, {`);
  builder.addRaw(`        getName: () => Effect.succeed("sync-${fileName}"),`);
  builder.addRaw(`        getConfig: () => Effect.succeed({})`);
  builder.addRaw(`      })`);
  builder.addBlankLine();
  builder.addRaw(`      return Effect.gen(function*() {`);
  builder.addRaw(`        const service = yield* ${className}TestService`);
  builder.addRaw(`        const name = yield* service.getName()`);
  builder.addRaw(`        expect(name).toBe("sync-${fileName}")`);
  builder.addRaw(`      }).pipe(Effect.provide(Layer.fresh(syncLayer)))`);
  builder.addRaw(`    })`);
  builder.addBlankLine();
  builder.addRaw(`    it.scoped("should work with Layer.effect for async initialization", () => {`);
  builder.addRaw(`      const asyncLayer = Layer.effect(`);
  builder.addRaw(`        ${className}TestService,`);
  builder.addRaw(`        Effect.sync(() => ({`);
  builder.addRaw(`          getName: () => Effect.succeed("async-${fileName}"),`);
  builder.addRaw(`          getConfig: () => Effect.succeed({ async: true })`);
  builder.addRaw(`        }))`);
  builder.addRaw(`      )`);
  builder.addBlankLine();
  builder.addRaw(`      return Effect.gen(function*() {`);
  builder.addRaw(`        const service = yield* ${className}TestService`);
  builder.addRaw(`        const name = yield* service.getName()`);
  builder.addRaw(`        expect(name).toBe("async-${fileName}")`);
  builder.addRaw(`      }).pipe(Effect.provide(Layer.fresh(asyncLayer)))`);
  builder.addRaw(`    })`);
  builder.addBlankLine();
  builder.addRaw(`    it.scoped("should work with Layer.scoped for resource management", () => {`);
  builder.addRaw(`      let initialized = false`);
  builder.addBlankLine();
  builder.addRaw(`      const scopedLayer = Layer.scoped(`);
  builder.addRaw(`        ${className}TestService,`);
  builder.addRaw(`        Effect.acquireRelease(`);
  builder.addRaw(`          Effect.sync(() => {`);
  builder.addRaw(`            initialized = true`);
  builder.addRaw(`            return {`);
  builder.addRaw(`              getName: () => Effect.succeed("scoped-${fileName}"),`);
  builder.addRaw(`              getConfig: () => Effect.succeed({ scoped: true })`);
  builder.addRaw(`            }`);
  builder.addRaw(`          }),`);
  builder.addRaw(`          () => Effect.void`);
  builder.addRaw(`        )`);
  builder.addRaw(`      )`);
  builder.addBlankLine();
  builder.addRaw(`      return Effect.gen(function*() {`);
  builder.addRaw(`        const service = yield* ${className}TestService`);
  builder.addRaw(`        const name = yield* service.getName()`);
  builder.addRaw(`        expect(name).toBe("scoped-${fileName}")`);
  builder.addRaw(`        expect(initialized).toBe(true)`);
  builder.addRaw(`      }).pipe(Effect.provide(Layer.fresh(scopedLayer)))`);
  builder.addRaw(`    })`);
  builder.addRaw(`  })`);
  builder.addBlankLine();

  // Layer Isolation tests
  builder.addRaw(`  describe("Layer Isolation", () => {`);
  builder.addRaw(`    it.scoped("should isolate state between tests with Layer.fresh", () => {`);
  builder.addRaw(`      let callCount = 0`);
  builder.addBlankLine();
  builder.addRaw(`      const countingLayer = Layer.effect(`);
  builder.addRaw(`        ${className}TestService,`);
  builder.addRaw(`        Effect.sync(() => {`);
  builder.addRaw(`          callCount++`);
  builder.addRaw(`          return {`);
  builder.addRaw(`            getName: () => Effect.succeed(\`call-\${callCount}\`),`);
  builder.addRaw(`            getConfig: () => Effect.succeed({ count: callCount })`);
  builder.addRaw(`          }`);
  builder.addRaw(`        })`);
  builder.addRaw(`      )`);
  builder.addBlankLine();
  builder.addRaw(`      return Effect.gen(function*() {`);
  builder.addRaw(`        const service = yield* ${className}TestService`);
  builder.addRaw(`        const name = yield* service.getName()`);
  builder.addRaw(`        expect(name).toBe("call-1")`);
  builder.addRaw(`        expect(callCount).toBe(1)`);
  builder.addRaw(`      }).pipe(Effect.provide(Layer.fresh(countingLayer)))`);
  builder.addRaw(`    })`);
  builder.addRaw(`  })`);

  // Close main describe
  builder.addRaw(`})`);
  builder.addBlankLine();

  return builder.toString();
}
