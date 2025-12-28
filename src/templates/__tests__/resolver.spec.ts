/**
 * Template Resolver Tests
 *
 * Tests for variable interpolation in template strings.
 */

import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'
import {
  createContextFromName,
  extractVariables,
  hasInterpolation,
  interpolate,
  interpolateDeep,
  interpolateSync
} from '../core/resolver'
import type { TemplateContext } from '../core/types'

describe('Template Resolver', () => {
  const context: TemplateContext = {
    className: 'User',
    fileName: 'user',
    propertyName: 'user',
    constantName: 'USER',
    scope: '@myorg',
    packageName: '@myorg/contract-user',
    projectName: 'contract-user',
    libraryType: 'contract',
    includeCQRS: true,
    entities: ['User', 'UserRole']
  }

  describe('interpolate', () => {
    it('should interpolate simple variables', async () => {
      const effect = interpolate('{className}Repository', context)
      const result = await Effect.runPromise(effect)
      expect(result).toBe('UserRepository')
    })

    it('should interpolate multiple variables', async () => {
      const effect = interpolate('{className}Error in {packageName}', context)
      const result = await Effect.runPromise(effect)
      expect(result).toBe('UserError in @myorg/contract-user')
    })

    it('should return original string if no variables', async () => {
      const effect = interpolate('NoVariablesHere', context)
      const result = await Effect.runPromise(effect)
      expect(result).toBe('NoVariablesHere')
    })

    it('should fail on unknown variable', async () => {
      const effect = interpolate('{unknownVar}', context)
      const result = await Effect.runPromiseExit(effect)
      expect(result._tag).toBe('Failure')
    })

    it('should interpolate all naming variants', async () => {
      const effect = interpolate('{className} {fileName} {propertyName} {constantName}', context)
      const result = await Effect.runPromise(effect)
      expect(result).toBe('User user user USER')
    })
  })

  describe('interpolateSync', () => {
    it('should interpolate synchronously', () => {
      const result = interpolateSync('{className}Service', context)
      expect(result).toBe('UserService')
    })

    it('should throw on unknown variable', () => {
      expect(() => interpolateSync('{missing}', context)).toThrow('Unknown variable: missing')
    })
  })

  describe('hasInterpolation', () => {
    it('should return true for strings with variables', () => {
      expect(hasInterpolation('{className}')).toBe(true)
      expect(hasInterpolation('prefix{var}suffix')).toBe(true)
    })

    it('should return false for strings without variables', () => {
      expect(hasInterpolation('NoVariables')).toBe(false)
      expect(hasInterpolation('')).toBe(false)
    })
  })

  describe('extractVariables', () => {
    it('should extract all variable names', () => {
      const vars = extractVariables('{className}Error in {packageName}')
      expect(vars).toEqual(['className', 'packageName'])
    })

    it('should return empty array for no variables', () => {
      const vars = extractVariables('NoVariables')
      expect(vars).toEqual([])
    })

    it('should deduplicate variable names', () => {
      const vars = extractVariables('{name} and {name} again')
      expect(vars).toEqual(['name'])
    })
  })

  describe('interpolateDeep', () => {
    it('should interpolate strings in objects', async () => {
      const obj = {
        name: '{className}Service',
        error: '{className}Error'
      }

      const effect = interpolateDeep(obj, context)
      const result = await Effect.runPromise(effect)

      expect(result).toEqual({
        name: 'UserService',
        error: 'UserError'
      })
    })

    it('should interpolate strings in arrays', async () => {
      const arr = ['{className}A', '{className}B']

      const effect = interpolateDeep(arr, context)
      const result = await Effect.runPromise(effect)

      expect(result).toEqual(['UserA', 'UserB'])
    })

    it('should interpolate nested structures', async () => {
      const nested = {
        level1: {
          level2: {
            value: '{className}'
          }
        },
        array: [{ name: '{fileName}' }]
      }

      const effect = interpolateDeep(nested, context)
      const result = await Effect.runPromise(effect)

      expect(result).toEqual({
        level1: {
          level2: {
            value: 'User'
          }
        },
        array: [{ name: 'user' }]
      })
    })

    it('should preserve non-string values', async () => {
      const obj = {
        str: '{className}',
        num: 42,
        bool: true,
        nul: null
      }

      const effect = interpolateDeep(obj, context)
      const result = await Effect.runPromise(effect)

      expect(result).toEqual({
        str: 'User',
        num: 42,
        bool: true,
        nul: null
      })
    })
  })

  describe('createContextFromName', () => {
    it('should create context with naming variants', () => {
      const ctx = createContextFromName('user-profile', {
        scope: '@test',
        libraryType: 'feature'
      })

      expect(ctx.className).toBe('UserProfile')
      expect(ctx.fileName).toBe('user-profile')
      expect(ctx.propertyName).toBe('userProfile')
      expect(ctx.constantName).toBe('USER_PROFILE')
      expect(ctx.scope).toBe('@test')
      expect(ctx.libraryType).toBe('feature')
    })

    it('should use defaults for missing options', () => {
      const ctx = createContextFromName('test')

      expect(ctx.scope).toBe('@app')
      expect(ctx.libraryType).toBe('library')
    })
  })
})
