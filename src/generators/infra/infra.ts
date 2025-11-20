/**
 * Infrastructure Library Generator
 *
 * Generates infrastructure libraries following Effect-based architecture patterns.
 * Creates services, configuration, layers, and providers for cross-cutting concerns.
 */

import {
  Tree,
  formatFiles,
} from "@nx/devkit";
import { generateLibraryFiles } from "../../utils/library-generator-utils.js";
import {
  normalizeBaseOptions,
  type NormalizedBaseOptions,
} from "../../utils/normalization-utils.js";
import type { InfraGeneratorSchema } from "./schema.js";
import { generateErrorsFile } from "./templates/errors.template.js";
import { generateInterfaceFile } from "./templates/interface.template.js";
import { generateConfigFile } from "./templates/config.template.js";
import { generateMemoryProviderFile } from "./templates/memory-provider.template.js";
import { generateServerLayersFile } from "./templates/server-layers.template.js";
import { generateClientLayersFile } from "./templates/client-layers.template.js";
import { generateEdgeLayersFile } from "./templates/edge-layers.template.js";
import { generateUseHookFile } from "./templates/use-hook.template.js";
import { generateIndexFile } from "./templates/index.template.js";
import { generateServerFile } from "./templates/server.template.js";
import { generateClientFile } from "./templates/client.template.js";
import { generateEdgeFile } from "./templates/edge.template.js";
import type { InfraTemplateOptions } from "../../utils/shared/types.js";

/**
 * Normalized options with computed values
 */
interface NormalizedInfraOptions extends NormalizedBaseOptions {
  // Infra generators have no additional specific fields beyond base
}

/**
 * Main generator function
 */
export default async function infraGenerator(
  tree: Tree,
  schema: InfraGeneratorSchema
) {
  const options = normalizeOptions(tree, schema);

  const includeClientServer = schema.includeClientServer ?? false;
  const includeEdge = schema.includeEdge ?? false;

  // 1. Generate base library files (project.json, package.json, tsconfig, etc.)
  const libraryOptions = {
    name: options.name,
    projectName: options.projectName,
    projectRoot: options.projectRoot,
    offsetFromRoot: options.offsetFromRoot,
    libraryType: 'infra' as const,
    platform: includeClientServer ? ('universal' as const) : ('node' as const),
    description: options.description,
    tags: ['type:infra', 'scope:shared', `platform:${includeClientServer ? 'universal' : 'node'}`],
    includeClientServer: includeClientServer,
    includeEdgeExports: includeEdge,
  };

  await generateLibraryFiles(tree, libraryOptions);

  // 2. Generate domain-specific files using code-based templates
  const templateOptions: InfraTemplateOptions = {
    // Naming variants
    name: options.name,
    className: options.className,
    propertyName: options.propertyName,
    fileName: options.fileName,
    constantName: options.constantName,

    // Library metadata
    libraryType: 'infra',
    packageName: options.packageName,
    projectName: options.projectName,
    projectRoot: options.projectRoot,
    sourceRoot: options.sourceRoot,
    offsetFromRoot: options.offsetFromRoot,
    description: options.description,
    tags: options.tags.split(','),

    // Feature flags
    includeClientServer,
    includeEdge,
  };

  const sourceLibPath = `${options.sourceRoot}/lib`;
  const serviceLibPath = `${sourceLibPath}/service`;
  const layersLibPath = `${sourceLibPath}/layers`;
  const providersLibPath = `${sourceLibPath}/providers`;

  // Generate service files
  tree.write(`${serviceLibPath}/errors.ts`, generateErrorsFile(templateOptions));
  tree.write(`${serviceLibPath}/interface.ts`, generateInterfaceFile(templateOptions));
  tree.write(`${serviceLibPath}/config.ts`, generateConfigFile(templateOptions));

  // Generate providers
  tree.write(`${providersLibPath}/memory.ts`, generateMemoryProviderFile(templateOptions));

  // Generate server layers (always)
  tree.write(`${layersLibPath}/server-layers.ts`, generateServerLayersFile(templateOptions));

  // Generate client files (conditional)
  if (includeClientServer) {
    const clientLayersContent = generateClientLayersFile(templateOptions);
    if (clientLayersContent) {
      tree.write(`${layersLibPath}/client-layers.ts`, clientLayersContent);
    }

    const useHookContent = generateUseHookFile(templateOptions);
    if (useHookContent) {
      const clientHooksPath = `${sourceLibPath}/client/hooks`;
      tree.write(`${clientHooksPath}/use-${options.fileName}.ts`, useHookContent);
    }

    const clientContent = generateClientFile(templateOptions);
    if (clientContent) {
      tree.write(`${options.sourceRoot}/client.ts`, clientContent);
    }

    const serverContent = generateServerFile(templateOptions);
    if (serverContent) {
      tree.write(`${options.sourceRoot}/server.ts`, serverContent);
    }
  }

  // Generate edge files (conditional)
  if (includeEdge) {
    const edgeLayersContent = generateEdgeLayersFile(templateOptions);
    if (edgeLayersContent) {
      tree.write(`${layersLibPath}/edge-layers.ts`, edgeLayersContent);
    }

    const edgeContent = generateEdgeFile(templateOptions);
    if (edgeContent) {
      tree.write(`${options.sourceRoot}/edge.ts`, edgeContent);
    }
  }

  // Generate index file (barrel exports)
  tree.write(`${options.sourceRoot}/index.ts`, generateIndexFile(templateOptions));

  // 3. Format files
  await formatFiles(tree);

  // 5. Return post-generation instructions
  return () => {
    console.log(`
✅ Infrastructure library created: ${options.packageName}

📁 Location: ${options.projectRoot}
📦 Package: ${options.packageName}

🎯 IMPORTANT - Customization Required:
This library was generated with minimal scaffolding.
Follow the TODO comments in each file to customize for your service.

Next steps:
1. Customize service implementation (see TODO comments):
   - ${options.sourceRoot}/lib/service/interface.ts - Define service interface
   - ${options.sourceRoot}/lib/service/errors.ts    - Add domain-specific errors
   - ${options.sourceRoot}/lib/service/config.ts    - Add configuration
   - ${options.sourceRoot}/lib/providers/memory.ts  - Implement providers

2. Review the comprehensive README:
   - ${options.projectRoot}/README.md - Customization guide & examples

3. Build and test:
   - pnpm exec nx build ${options.projectName} --batch
   - pnpm exec nx test ${options.projectName}

4. Auto-sync TypeScript project references:
   - pnpm exec nx sync

📚 Documentation:
   - See /libs/ARCHITECTURE.md for infrastructure patterns
   - See ${options.projectRoot}/README.md for customization examples

Platform configuration:
${includeClientServer ? '   - ✅ Client/Server separation enabled' : '   - Server-only (no client separation)'}
${includeEdge ? '   - ✅ Edge runtime support enabled' : '   - No edge runtime support'}
    `);
  };
}

/**
 * Normalize options with defaults and computed values
 */
function normalizeOptions(
  tree: Tree,
  schema: InfraGeneratorSchema
): NormalizedInfraOptions {
  // Use shared normalization utility for common fields
  return normalizeBaseOptions(tree, {
    name: schema.name,
    ...(schema.directory !== undefined && { directory: schema.directory }),
    ...(schema.description !== undefined && { description: schema.description }),
    libraryType: 'infra',
    additionalTags: ['platform:node'], // Infra is primarily server-side
  });
}
