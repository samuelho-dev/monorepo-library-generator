import { defineConfig } from 'vitest/config'

export default defineConfig({
  root: __dirname,
  cacheDir: '../../../node_modules/.vite/provider-supabase',
  test: {
    watch: false,
    globals: true,
    environment: 'node',
    pool: 'forks',
    include: ['src/**/*.{test,spec}.{ts,mts,cts,tsx}'],
    reporters: ['default'],
    coverage: { reportsDirectory: '../../../coverage/libs/provider/supabase', provider: 'v8' }
  }
})
