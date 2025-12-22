/**
 * Index Template
 *
 * Generates the main entry point for the env library.
 * Simply re-exports from env.ts for a single import path.
 *
 * @module monorepo-library-generator/env-templates
 */

import { TypeScriptBuilder } from '../../../utils/code-builder';

/**
 * Generate index.ts - the main entry point
 *
 * Provides a single import path: `import { env } from '@workspace/env'`
 */
export function generateIndexFile() {
  const builder = new TypeScriptBuilder();

  // File header
  builder.addFileHeader({
    title: 'Environment Variables',
    description:
      'Type-safe environment variable access.\n\n' +
      'Usage:\n' +
      '```typescript\n' +
      "import { env } from '@workspace/env'\n\n" +
      '// All context - runtime detection\n' +
      'env.PUBLIC_API_URL  // string (works everywhere)\n' +
      'env.NODE_ENV        // string (works everywhere)\n' +
      'env.DATABASE_URL    // Redacted<string> (server only)\n' +
      'env.PORT            // number (server only)\n' +
      '```\n\n' +
      'Behavior:\n' +
      '- Server: All variables accessible\n' +
      '- Client: Only client + shared vars; server vars throw runtime error\n' +
      '- Validated eagerly on import (fail fast)',
    module: '@workspace/env',
  });

  // Simple re-export
  builder.addRaw('export { env } from "./env"');
  builder.addRaw('export type { Env } from "./env"');
  builder.addBlankLine();

  // Also export createEnv for advanced usage
  builder.addRaw('// Re-export for advanced usage');
  builder.addRaw('export { createEnv, Config } from "./createEnv"');
  builder.addBlankLine();

  return builder.toString();
}
