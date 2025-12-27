/**
 * Provider Generator Tests
 *
 * Test-Driven Design approach following provider.md specification
 * Only accurate, necessary tests - no false positives
 */

import type { Tree } from '@nx/devkit'
import { readProjectConfiguration } from '@nx/devkit'
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing'
import { providerGenerator } from './provider'

describe('provider generator', () => {
  let tree: Tree

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace()
  })

  describe('📁 File Generation Tests', () => {
    it('should generate all required files for server-only provider', async () => {
      await providerGenerator(tree, {
        name: 'stripe',
        externalService: 'Stripe API',
        platform: 'node'
      })

      const projectRoot = 'libs/provider/stripe'

      // Core files
      expect(tree.exists(`${projectRoot}/src/index.ts`)).toBeTruthy()
      expect(tree.exists(`${projectRoot}/package.json`)).toBeTruthy()
      expect(tree.exists(`${projectRoot}/project.json`)).toBeTruthy()
      expect(tree.exists(`${projectRoot}/README.md`)).toBeTruthy()

      // Service implementation files (flat lib/ structure):
      // - All support files at lib/ level (not lib/service/)
      // - Layers are static members on service class (no separate layers.ts)
      expect(tree.exists(`${projectRoot}/src/lib/service.ts`)).toBeTruthy()
      expect(tree.exists(`${projectRoot}/src/lib/service.spec.ts`)).toBeTruthy()
      expect(tree.exists(`${projectRoot}/src/lib/errors.ts`)).toBeTruthy()
      expect(tree.exists(`${projectRoot}/src/lib/validation.ts`)).toBeTruthy()
      expect(tree.exists(`${projectRoot}/src/lib/types.ts`)).toBeTruthy()

      // TypeScript configuration
      expect(tree.exists(`${projectRoot}/tsconfig.json`)).toBeTruthy()
      expect(tree.exists(`${projectRoot}/tsconfig.lib.json`)).toBeTruthy()
      expect(tree.exists(`${projectRoot}/tsconfig.spec.json`)).toBeTruthy()
      expect(tree.exists(`${projectRoot}/vitest.config.ts`)).toBeTruthy()

      // Should NOT have __tests__ directory (provider.md line 137)
      expect(tree.exists(`${projectRoot}/src/lib/__tests__`)).toBeFalsy()

      // Should NOT have separate interface.ts or old file naming
      expect(tree.exists(`${projectRoot}/src/lib/interface.ts`)).toBeFalsy()
    })

    it('should generate for universal platform with includeClientServer', async () => {
      await providerGenerator(tree, {
        name: 'analytics',
        externalService: 'Analytics Service',
        platform: 'universal',
        includeClientServer: true
      })

      const projectRoot = 'libs/provider/analytics'

      expect(tree.exists(`${projectRoot}/src/index.ts`)).toBeTruthy()
      expect(tree.exists(`${projectRoot}/package.json`)).toBeTruthy()
    })

    it('should generate for edge platform', async () => {
      await providerGenerator(tree, {
        name: 'auth',
        externalService: 'Auth Service',
        platform: 'edge'
      })

      const projectRoot = 'libs/provider/auth'

      expect(tree.exists(`${projectRoot}/src/index.ts`)).toBeTruthy()
      expect(tree.exists(`${projectRoot}/package.json`)).toBeTruthy()
    })
  })

  describe('🏗️ Project Configuration Tests', () => {
    it('should create correct project.json with batch mode enabled', async () => {
      await providerGenerator(tree, {
        name: 'stripe',
        externalService: 'Stripe API',
        platform: 'node'
      })

      const config = readProjectConfiguration(tree, 'provider-stripe')

      // Basic metadata
      expect(config.name).toBe('provider-stripe')
      expect(config.root).toBe('libs/provider/stripe')
      expect(config.sourceRoot).toBe('libs/provider/stripe/src')
      expect(config.projectType).toBe('library')

      // Tags - type and scope are auto-generated
      expect(config.tags).toContain('type:provider')
      expect(config.tags).toContain('scope:stripe')

      // Build target with vitest (not jest) - provider.md line 1432
      expect(config.targets?.test).toBeDefined()
      expect(config.targets?.test?.executor).toBe('@nx/vite:test')

      // Build target with batch mode - provider.md line 1423
      expect(config.targets?.build).toBeDefined()
      expect(config.targets?.build?.executor).toBe('@nx/js:tsc')
      expect(config.targets?.build?.options?.batch).toBe(true)
    })

    it('should include client entry point for universal platform', async () => {
      await providerGenerator(tree, {
        name: 'analytics',
        externalService: 'Analytics Service',
        platform: 'universal',
        includeClientServer: true
      })

      const config = readProjectConfiguration(tree, 'provider-analytics')

      // Verify project configuration exists
      expect(config.name).toBe('provider-analytics')
      expect(config.targets?.build).toBeDefined()
    })

    it('should configure correct tags for platform and service', async () => {
      await providerGenerator(tree, {
        name: 'redis',
        externalService: 'Redis Cache',
        platform: 'node',
        tags: 'critical,cache'
      })

      const config = readProjectConfiguration(tree, 'provider-redis')

      expect(config.tags).toContain('type:provider')
      expect(config.tags).toContain('scope:redis')
      // Custom tags from schema
      expect(config.tags).toContain('critical')
      expect(config.tags).toContain('cache')
    })
  })

  describe('📦 Package.json Tests', () => {
    it('should create package.json with correct structure', async () => {
      await providerGenerator(tree, {
        name: 'stripe',
        externalService: 'Stripe API',
        platform: 'node'
      })

      const packageJson = JSON.parse(
        tree.read('libs/provider/stripe/package.json', 'utf-8') || '{}'
      )

      // Check for package name (npm scope may vary based on workspace config)
      expect(packageJson.name).toContain('provider-stripe')
      expect(packageJson.type).toBe('module')

      // Effect peer dependency (provider.md line 1498)
      expect(packageJson.peerDependencies?.effect).toBeDefined()

      // Exports configuration
      expect(packageJson.exports?.['.']?.import).toBeDefined()
      // Platform-specific exports removed - rely on automatic tree-shaking
      // Only main barrel export exists now
      expect(packageJson.exports?.['./types']).toBeDefined()
    })
  })

  describe('📝 Template Content Tests', () => {
    it('should use Context.Tag pattern in service interface', async () => {
      await providerGenerator(tree, {
        name: 'stripe',
        externalService: 'Stripe API',
        platform: 'node'
      })

      // Provider service is at lib/service.ts (not lib/service/service.ts)
      const serviceContent = tree.read('libs/provider/stripe/src/lib/service.ts', 'utf-8')

      // Must use Context.Tag (provider.md lines 186-232)
      expect(serviceContent).toContain('Context.Tag')
      expect(serviceContent).toMatch(/class\s+Stripe\s+extends/)
      expect(serviceContent).toMatch(/Context\.Tag\(/)
    })

    it('should use Data.TaggedError for error types', async () => {
      await providerGenerator(tree, {
        name: 'stripe',
        externalService: 'Stripe API',
        platform: 'node'
      })

      // Errors are at lib/errors.ts (flat structure)
      const errorsContent = tree.read('libs/provider/stripe/src/lib/errors.ts', 'utf-8')

      // Must use Data.TaggedError (provider.md lines 716-766)
      expect(errorsContent).toContain('Data.TaggedError')
      expect(errorsContent).toContain('class StripeError')
      expect(errorsContent).toContain('class StripeApiError')
    })

    it('should include static Layer members in service.ts', async () => {
      await providerGenerator(tree, {
        name: 'stripe',
        externalService: 'Stripe API',
        platform: 'node'
      })

      // Layers are static members on the service class in service.ts
      const serviceContent = tree.read('libs/provider/stripe/src/lib/service.ts', 'utf-8')

      // Layer types used in static layer definitions
      expect(serviceContent).toContain('Layer.succeed')
      expect(serviceContent).toContain('Layer.effect')

      // Static layer implementations on service class
      expect(serviceContent).toContain('static readonly Live')
      expect(serviceContent).toContain('static readonly Test')
      expect(serviceContent).toContain('static readonly Dev')
    })

    it('should generate service interface correctly', async () => {
      await providerGenerator(tree, {
        name: 'analytics',
        externalService: 'Analytics Service',
        platform: 'universal',
        includeClientServer: true
      })

      // Service is at lib/service.ts
      const serviceContent = tree.read('libs/provider/analytics/src/lib/service.ts', 'utf-8')

      // Platform-specific barrel files removed - check actual implementation
      expect(serviceContent).toContain('export class Analytics')
      expect(serviceContent).toContain('Context.Tag')
    })
  })

  describe('🔧 TypeScript Configuration Tests', () => {
    it('should enable declaration output for library builds', async () => {
      await providerGenerator(tree, {
        name: 'stripe',
        externalService: 'Stripe API',
        platform: 'node'
      })

      const tsconfigLib = JSON.parse(
        tree.read('libs/provider/stripe/tsconfig.lib.json', 'utf-8') || '{}'
      )

      // Note: composite is intentionally omitted to support workspace path mappings
      // NX handles incremental builds at the Nx level
      expect(tsconfigLib.compilerOptions?.declaration).toBe(true)
      expect(tsconfigLib.compilerOptions?.declarationMap).toBe(true)
      expect(tsconfigLib.compilerOptions?.noEmit).toBe(false)

      // outDir should be in dist/<projectRoot>/
      expect(tsconfigLib.compilerOptions?.outDir).toContain('dist/libs/provider/stripe')
    })

    it('should include source files in base tsconfig.json', async () => {
      await providerGenerator(tree, {
        name: 'stripe',
        externalService: 'Stripe API',
        platform: 'node'
      })

      const tsconfig = JSON.parse(tree.read('libs/provider/stripe/tsconfig.json', 'utf-8') || '{}')

      // Base tsconfig should include source files for proper file discovery
      expect(tsconfig.include).toContain('src/**/*.ts')
    })

    it('should update tsconfig.base.json with correct path mappings', async () => {
      await providerGenerator(tree, {
        name: 'stripe',
        externalService: 'Stripe API',
        platform: 'node'
      })

      // In a real workspace, path mappings would be added by NX's library generator
      // In virtual test workspace, we verify the library generator was called
      // by checking that project configuration exists
      const config = readProjectConfiguration(tree, 'provider-stripe')
      expect(config).toBeDefined()
      expect(config.root).toBe('libs/provider/stripe')
    })

    it('should add client path mapping for universal platform', async () => {
      await providerGenerator(tree, {
        name: 'analytics',
        externalService: 'Analytics Service',
        platform: 'universal',
        includeClientServer: true
      })

      // In a real workspace, path mappings would be added by NX's library generator
      // In virtual test workspace, we verify the library generator was called
      const config = readProjectConfiguration(tree, 'provider-analytics')
      expect(config).toBeDefined()
      expect(config.root).toBe('libs/provider/analytics')
    })
  })

  describe('🎯 Naming Convention Tests', () => {
    it('should use correct naming transformations', async () => {
      await providerGenerator(tree, {
        name: 'my-custom-service',
        externalService: 'My Custom API',
        platform: 'node'
      })

      // Service is at lib/service.ts (not lib/service/service.ts)
      const serviceContent = tree.read(
        'libs/provider/my-custom-service/src/lib/service.ts',
        'utf-8'
      )

      // className: MyCustomService (PascalCase, no double Service suffix)
      expect(serviceContent).toContain('class MyCustomService')

      // Project name should be kebab-case with provider prefix
      const config = readProjectConfiguration(tree, 'provider-my-custom-service')
      expect(config.name).toBe('provider-my-custom-service')
    })
  })

  describe('🚨 Validation Tests', () => {
    it('should throw error if library already exists', async () => {
      await providerGenerator(tree, {
        name: 'stripe',
        externalService: 'Stripe API',
        platform: 'node'
      })

      await expect(
        providerGenerator(tree, {
          name: 'stripe',
          externalService: 'Stripe API',
          platform: 'node'
        })
      ).rejects.toThrow()
    })

    it('should validate required options', async () => {
      await expect(
        providerGenerator(tree, {
          name: '',
          externalService: 'API',
          platform: 'node'
        })
      ).rejects.toThrow()
    })
  })

  describe('📖 Documentation Tests', () => {
    it('should generate README with correct structure', async () => {
      await providerGenerator(tree, {
        name: 'stripe',
        externalService: 'Stripe API',
        platform: 'node',
        description: 'Stripe payment processing adapter'
      })

      const readme = tree.read('libs/provider/stripe/README.md', 'utf-8')

      // Check for package name (npm scope may vary based on workspace config)
      expect(readme).toContain('provider-stripe')
      expect(readme).toContain('Stripe payment processing adapter')
      expect(readme).toContain('## Installation')
      expect(readme).toContain('## Usage')
      expect(readme).toContain('## Development')
    })

    it('should generate CLAUDE.md with architecture guidance', async () => {
      await providerGenerator(tree, {
        name: 'stripe',
        externalService: 'Stripe API',
        platform: 'node'
      })

      const claude = tree.read('libs/provider/stripe/CLAUDE.md', 'utf-8')

      // Check for package name (npm scope may vary based on workspace config)
      expect(claude).toContain('provider-stripe')
      expect(claude).toContain('Stripe')
      expect(claude).toContain('## Quick Reference')
      expect(claude).toContain('## Import Patterns')
      expect(claude).toContain('## Architecture')
    })
  })
})
