import { defineConfig } from 'vitest/config'

export default defineConfig({
  root: __dirname,
  cacheDir: '../../../node_modules/.vite/infra-rpc',
  test: {
    watch: false,
    globals: true,
    environment: 'node',
    pool: 'forks',
    include: ['src/**/*.{test,spec}.{ts,mts,cts,tsx}'],
    reporters: ['default'],
    coverage: { reportsDirectory: '../../../coverage/libs/infra/rpc', provider: 'v8' }
  }
})
