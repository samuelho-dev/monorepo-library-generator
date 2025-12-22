/**
 * Output Formatter Tests
 *
 * Tests for universal output formatting
 */

import { describe, expect, it } from 'vitest';
import type { GeneratorResult } from '../execution/types';
import { formatErrorResponse, formatOutput, formatValidationError } from '../output/formatter';

describe('Output Formatter', () => {
  const mockResult: GeneratorResult = {
    projectName: 'contract-user',
    projectRoot: 'libs/contract/user',
    packageName: '@test-scope/contract-user',
    sourceRoot: 'libs/contract/user/src',
    filesGenerated: [
      'libs/contract/user/package.json',
      'libs/contract/user/tsconfig.json',
      'libs/contract/user/src/index.ts',
      'libs/contract/user/src/lib/entities.ts',
      'libs/contract/user/src/lib/errors.ts',
    ],
  };

  describe('formatOutput', () => {
    it('should format for MCP interface', () => {
      const output = formatOutput(mockResult, 'mcp');

      expect(output).toHaveProperty('success', true);
      expect(output).toHaveProperty('message');
      expect(output).toHaveProperty('files');
      expect(output).toHaveProperty('nextSteps');

      if (typeof output === 'object' && 'files' in output) {
        expect(output.files).toEqual(mockResult.filesGenerated);
      }
    });

    it('should format for CLI interface', () => {
      const output = formatOutput(mockResult, 'cli');

      expect(typeof output).toBe('string');
      expect(output).toContain('contract-user');
      expect(output).toContain('@test-scope/contract-user');
      expect(output).toContain('libs/contract/user');
      expect(output).toContain('Files created:');
      expect(output).toContain('Next steps:');
    });

    it('should format for Nx interface', () => {
      const output = formatOutput(mockResult, 'nx');

      expect(typeof output).toBe('function');

      // Execute the callback and check it doesn't throw
      if (typeof output === 'function') {
        expect(() => output()).not.toThrow();
      }
    });
  });

  describe('formatErrorResponse', () => {
    it('should format error as MCP response', () => {
      const error = new Error('Test error message');
      const response = formatErrorResponse(error);

      expect(response).toEqual({
        success: false,
        message: '❌ Generation failed: Test error message',
        files: [],
      });
    });
  });

  describe('formatValidationError', () => {
    it('should format validation error with helpful message', () => {
      const errorMessage = 'name: Required field missing';
      const formatted = formatValidationError(errorMessage);

      expect(formatted).toContain('❌ Validation Error:');
      expect(formatted).toContain(errorMessage);
      expect(formatted).toContain('💡 Check your input parameters');
    });
  });

  describe('MCP response structure', () => {
    it('should include next steps for contract library', () => {
      const output = formatOutput(mockResult, 'mcp');

      if (typeof output === 'object' && 'nextSteps' in output) {
        expect(output.nextSteps).toBeDefined();
        expect(Array.isArray(output.nextSteps)).toBe(true);
        expect(output.nextSteps.length).toBeGreaterThan(0);
      }
    });
  });

  describe('CLI output formatting', () => {
    it('should include file list', () => {
      const output = formatOutput(mockResult, 'cli');

      if (typeof output === 'string') {
        expect(output).toContain('package.json');
        expect(output).toContain('tsconfig.json');
        expect(output).toContain('entities.ts');
      }
    });

    it('should include next steps', () => {
      const output = formatOutput(mockResult, 'cli');

      if (typeof output === 'string') {
        expect(output).toContain('pnpm install');
        expect(output).toContain('nx build');
        expect(output).toContain('nx test');
      }
    });
  });
});
