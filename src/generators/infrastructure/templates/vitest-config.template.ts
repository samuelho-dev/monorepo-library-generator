/**
 * Vitest Configuration Template
 *
 * Generates vitest.config.ts for library testing.
 *
 * @module monorepo-library-generator/infrastructure/vitest-config-template
 */

import { TypeScriptBuilder } from '../../../utils/code-builder'

export interface VitestConfigOptions {
  readonly environment?: 'node' | 'jsdom' | 'happy-dom'
  readonly globals?: boolean
}

/**
 * Generate vitest.config.ts content
 */
export function generateVitestConfig(options: VitestConfigOptions = {}) {
  const { environment = 'node', globals = true } = options

  const builder = new TypeScriptBuilder()

  builder.addRaw(`import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    globals: ${globals},
    environment: "${environment}",
    include: ["src/**/*.{test,spec}.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "src/**/*.spec.ts",
        "src/**/*.test.ts"
      ]
    }
  }
})`)

  return builder.toString()
}
