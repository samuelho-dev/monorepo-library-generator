/**
 * Provider Generator - Service Spec Template
 *
 * Generates test file for provider service using @effect/vitest.
 * Tests verify proper SDK wrapping with Effect patterns.
 *
 * Testing Guidelines:
 * - Test SDK wrapping (does the provider correctly wrap SDK methods?)
 * - Use it.effect for simple provider tests
 * - Create inline mocks with minimal test data
 * - Focus on error transformation and Effect integration
 * - Keep ALL tests in this ONE file
 *
 * @module monorepo-library-generator/provider/templates/service-spec
 */

import { TypeScriptBuilder } from "../../../utils/code-generation/typescript-builder"
import type { ProviderTemplateOptions } from "../../../utils/shared/types"

/**
 * Generate service.spec.ts file for provider library
 *
 * Creates test file using @effect/vitest patterns.
 *
 * @param options - Provider template options
 * @returns Generated TypeScript code
 */
export function generateServiceSpecFile(options: ProviderTemplateOptions) {
  const builder = new TypeScriptBuilder()
  const { className, externalService, name: _projectClassName } = options

  // File header
  builder.addRaw("/**")
  builder.addRaw(` * ${className} Service Tests`)
  builder.addRaw(" *")
  builder.addRaw(
    ` * Tests verify that the provider correctly wraps the ${externalService} SDK with Effect patterns.`
  )
  builder.addRaw(
    " * Uses @effect/vitest with minimal inline mocking for rapid iteration."
  )
  builder.addRaw(" *")
  builder.addRaw(" * Testing Guidelines:")
  builder.addRaw(
    " * - ✅ Test SDK wrapping (does the provider correctly wrap SDK methods?)"
  )
  builder.addRaw(" * - ✅ Use it.effect for simple provider tests")
  builder.addRaw(" * - ✅ Create inline mocks with minimal test data")
  builder.addRaw(
    " * - ✅ Focus on error transformation and Effect integration"
  )
  builder.addRaw(" * - ✅ Keep ALL tests in this ONE file")
  builder.addRaw(" *")
  builder.addRaw(" * - ❌ DON'T create separate mock-factories.ts files")
  builder.addRaw(" * - ❌ DON'T create separate test-layer.ts files")
  builder.addRaw(
    " * - ❌ DON'T test the external SDK itself (that's the SDK's responsibility)"
  )
  builder.addRaw(
    " * - ❌ DON'T create complex mock objects matching full SDK types"
  )
  builder.addRaw(
    " * - ❌ DON'T use manual Effect.runPromise (use it.effect instead)"
  )
  builder.addRaw(" */")
  builder.addBlankLine()

  // Imports
  builder.addImport("effect", "Effect")
  builder.addImport("vitest", "describe")
  builder.addImport("vitest", "expect")
  builder.addImport("@effect/vitest", "it")
  builder.addImport("./service", className)
  builder.addImport("./layers", `${className}Live`)
  builder.addBlankLine()

  // Describe block
  builder.addRaw(`describe("${className}", () => {`)
  builder.addRaw("  /**")
  builder.addRaw(
    `   * TODO: Implement tests for your ${externalService} service`
  )
  builder.addRaw("   *")
  builder.addRaw("   * Example test pattern:")
  builder.addRaw("   *")
  builder.addRaw("   * it.effect(\"creates resource successfully\", () =>")
  builder.addRaw("   *   Effect.gen(function* () {")
  builder.addRaw(`   *     const service = yield* ${className};`)
  builder.addRaw(
    "   *     const result = yield* service.createResource({ data: \"test\" });"
  )
  builder.addRaw("   *     expect(result.id).toBeDefined();")
  builder.addRaw(`   *   }).pipe(Effect.provide(${className}Live))`)
  builder.addRaw("   * );")
  builder.addRaw("   *")
  builder.addRaw("   * it.effect(\"handles SDK errors correctly\", () =>")
  builder.addRaw("   *   Effect.gen(function* () {")
  builder.addRaw(`   *     const service = yield* ${className};`)
  builder.addRaw(
    "   *     const result = yield* service.failingMethod().pipe(Effect.flip);"
  )
  builder.addRaw(`   *     expect(result._tag).toBe("${className}Error");`)
  builder.addRaw(`   *   }).pipe(Effect.provide(${className}Test))`)
  builder.addRaw("   * );")
  builder.addRaw("   */")
  builder.addBlankLine()
  builder.addRaw("  it.effect(\"service is defined\", () =>")
  builder.addRaw("    Effect.gen(function* () {")
  builder.addRaw(`      const service = yield* ${className};`)
  builder.addRaw("      expect(service).toBeDefined();")
  builder.addRaw(`    }).pipe(Effect.provide(${className}Live))`)
  builder.addRaw("  );")
  builder.addRaw("});")
  builder.addBlankLine()

  return builder.toString()
}
