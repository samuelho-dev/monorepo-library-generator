/**
 * Infrastructure Edge Layers Template
 *
 * Generates edge runtime layer compositions.
 *
 * @module monorepo-library-generator/infra-templates
 */

import { TypeScriptBuilder } from '../../../utils/code-builder';
import type { InfraTemplateOptions } from '../../../utils/types';
import { WORKSPACE_CONFIG } from '../../../utils/workspace-config';

/**
 * Generate edge layers file for infrastructure service
 */
export function generateEdgeLayersFile(options: InfraTemplateOptions) {
  const builder = new TypeScriptBuilder();
  const { className, fileName, includeEdge } = options;
  const scope = WORKSPACE_CONFIG.getScope();

  // Only generate if edge mode is enabled
  if (!includeEdge) {
    return '';
  }

  // File header
  builder.addFileHeader({
    title: `${className} Edge Layers`,
    description: `Layer compositions for edge runtime dependency injection using Effect.\nEdge runtime-safe implementations (no Node.js APIs, limited memory).\n\nEdge runtime environments include:\n- Vercel Edge Functions\n- Cloudflare Workers\n- Deno Deploy\n- AWS Lambda@Edge\n\nTODO: Customize this file for your service:\n1. Implement edge-runtime-safe service logic\n2. Use only edge-compatible APIs (no Node.js fs, crypto)\n3. Minimize memory and CPU usage\n4. Consider request/response handling\n5. Add edge-specific configuration`,
    module: `${scope}/infra-${fileName}/edge`,
    see: ['https://effect.website/docs/guides/context-management for layer patterns'],
  });

  // Imports
  builder.addImports([
    { from: 'effect', imports: ['Layer', 'Effect'] },
    { from: '../service/service', imports: [`${className}Service`] },
  ]);

  // Section: Edge Layer
  builder.addSectionComment('Edge Layer');

  builder.addRaw(`/**
 * Edge Layer
 *
 * Edge runtime-safe implementation of ${className}Service.
 * Optimized for edge runtime constraints (minimal memory, CPU).
 *
 * TODO: Implement edge-specific service logic
 */
export const ${className}ServiceEdgeLayers = Layer.effect(
  ${className}Service,
  Effect.gen(function* () {
    // TODO: Inject edge-specific dependencies
    // - Limited to edge-compatible APIs
    // - No Node.js modules
    // - Minimal memory usage
    // - Fast response times

    return {
      get: (id: string) => {
        // TODO: Implement edge-safe get operation
        return Effect.succeed(Option.none());
      },
      // TODO: Implement edge methods
    };
  })
);`);
  builder.addBlankLine();

  // Section: Edge Runtime Detection
  builder.addSectionComment('Edge Runtime Detection');

  builder.addFunction({
    name: 'detectEdgeRuntime',
    params: [],
    returnType: 'string | null',
    body: `// Vercel Edge Functions
if (typeof globalThis !== 'undefined' && 'Web' in globalThis) {
  if (process.env.VERCEL_ENV) {
    return 'vercel';
  }
}

// Cloudflare Workers
if (typeof globalThis !== 'undefined' && 'caches' in globalThis) {
  return 'cloudflare';
}

// Deno Deploy
if (typeof Deno !== 'undefined') {
  return 'deno';
}

// AWS Lambda@Edge
if (process.env.AWS_LAMBDA_FUNCTION_VERSION) {
  return 'lambda-edge';
}

return null;`,
    jsdoc: `Detect current edge runtime\n\n@returns Runtime name or null if not in edge environment\n\n@example\n\`\`\`typescript\nconst runtime = detectEdgeRuntime();\n// 'vercel' | 'cloudflare' | 'deno' | 'lambda-edge' | null\n\`\`\``,
  });

  // Section: Edge-Safe Utilities
  builder.addSectionComment('Edge-Safe Utilities');

  builder.addRaw(`/**
 * Check if running in edge runtime
 */
export const isEdgeRuntime = (): boolean => detectEdgeRuntime() !== null;`);
  builder.addBlankLine();

  builder.addRaw(`/**
 * Get edge runtime configuration
 *
 * TODO: Customize for your edge use cases
 */
export interface EdgeConfig {
  /** Maximum request timeout (ms) */
  readonly timeoutMs: number;

  /** Maximum response size (bytes) */
  readonly maxResponseSize: number;

  /** Enable response caching */
  readonly enableCaching: boolean;

  /** Cache duration (seconds) */
  readonly cacheDurationSec: number;
}`);
  builder.addBlankLine();

  builder.addConst(
    'defaultEdgeConfig',
    `{
  timeoutMs: 10_000, // 10 seconds
  maxResponseSize: 1_000_000, // 1MB
  enableCaching: true,
  cacheDurationSec: 60, // 1 minute
}`,
    'EdgeConfig',
    true,
    'Default edge configuration',
  );

  builder.addRaw(`// TODO: Add edge-specific middleware if needed
// TODO: Add request/response handlers for edge functions
// TODO: Add streaming support for large responses`);

  return builder.toString();
}
