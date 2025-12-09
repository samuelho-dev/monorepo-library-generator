import path from "path"
import { defineConfig } from "vitest/config"

/**
 * Local Development Test Configuration
 *
 * Optimized for fast feedback during development:
 * - Runs all tests including generator specs
 * - Moderate timeout for generator tests
 *
 * Usage: pnpm test
 */
export default defineConfig({
  plugins: [],
  test: {
    include: [
      "./test/**/*.test.ts", // Unit tests (when they exist)
      "./src/**/*.spec.ts" // Generator integration tests
    ],
    globals: true,
    environment: "node",
    testTimeout: 30000, // Allow time for generator workspace creation
    // Run sequentially to prevent NX graph conflicts
    fileParallelism: false,
  },
  resolve: {
    alias: {
      "@template/basic/test": path.join(__dirname, "test"),
      "@template/basic": path.join(__dirname, "src")
    }
  }
})
