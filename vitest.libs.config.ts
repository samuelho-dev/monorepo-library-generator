import { defineConfig } from "vitest/config";

export default defineConfig({
  cacheDir: "node_modules/.vite/libs",
  test: {
    watch: false,
    globals: true,
    environment: "node",
    pool: "forks",
    include: [
      "libs/contract/database/src/**/*.spec.ts",
      "libs/provider/kysely/src/**/*.spec.ts",
      "libs/provider/supabase/src/**/*.spec.ts",
      "libs/infra/auth/src/**/*.spec.ts",
      "libs/infra/database/src/**/*.spec.ts",
      "libs/infra/storage/src/**/*.spec.ts",
    ],
    reporters: ["default"],
  },
});
