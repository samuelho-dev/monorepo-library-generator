/**
 * Contract Library Generator
 *
 * Generates a contract library following Effect-based architecture patterns.
 * Creates entities, errors, events, and ports for a domain.
 */

import {
  Tree,
  formatFiles,
} from "@nx/devkit";
import {
  generateLibraryFiles,
  type LibraryGeneratorOptions,
} from "../../utils/library-generator-utils.js";
import {
  normalizeBaseOptions,
  type NormalizedBaseOptions,
} from "../../utils/normalization-utils.js";
import {
  computeDependencies,
  type DependencyInfo,
} from "../../utils/dependency-utils.js";
import { parseTags } from "../../utils/generator-utils.js";
import type { ContractGeneratorSchema } from "./schema.js";
import { generateErrorsFile } from "./templates/errors.template.js";
import { generateEntitiesFile } from "./templates/entities.template.js";
import { generatePortsFile } from "./templates/ports.template.js";
import { generateEventsFile } from "./templates/events.template.js";
import { generateCommandsFile } from "./templates/commands.template.js";
import { generateQueriesFile } from "./templates/queries.template.js";
import { generateProjectionsFile } from "./templates/projections.template.js";
import { generateRpcFile } from "./templates/rpc.template.js";
import { generateIndexFile } from "./templates/index.template.js";
import type { ContractTemplateOptions } from "../../utils/shared/types.js";

// __dirname is available in CommonJS mode (Node.js global)
declare const __dirname: string;

/**
 * Normalized options with computed values
 */
interface NormalizedContractOptions extends NormalizedBaseOptions {
  // Contract-specific fields
  readonly dependencies: DependencyInfo[];
  readonly parsedTags: string[];
}

/**
 * Main generator function
 */
export default async function contractGenerator(
  tree: Tree,
  schema: ContractGeneratorSchema
) {
  const options = normalizeOptions(tree, schema);

  const includeCQRS = schema.includeCQRS ?? false;
  const includeRPC = schema.includeRPC ?? false;

  // Generate ALL infrastructure files using centralized utility
  const libraryOptions: LibraryGeneratorOptions = {
    name: options.name,
    projectName: options.projectName,
    projectRoot: options.projectRoot,
    offsetFromRoot: options.offsetFromRoot,
    libraryType: 'contract',
    // Platform set to 'node' by convention, but contracts are platform-agnostic.
    // TypeScript config generator (tsconfig-utils.ts) special-cases 'contract'
    // libraryType to skip platform-specific types regardless of this setting.
    platform: 'node',
    description: options.description,
    tags: options.parsedTags,
    includeClientServer: false, // Contracts are type-only
    includeEdgeExports: false,
  };

  await generateLibraryFiles(tree, libraryOptions);

  // Generate domain-specific files using code-based templates
  const templateOptions: ContractTemplateOptions = {
    // Naming variants
    name: options.name,
    className: options.className,
    propertyName: options.propertyName,
    fileName: options.fileName,
    constantName: options.constantName,

    // Library metadata
    libraryType: 'contract',
    packageName: options.packageName,
    projectName: options.projectName,
    projectRoot: options.projectRoot,
    sourceRoot: options.sourceRoot,
    offsetFromRoot: options.offsetFromRoot,
    description: options.description,
    tags: options.parsedTags,

    // Feature flags
    includeCQRS,
    includeRPC,
  };

  const sourceLibPath = `${options.sourceRoot}/lib`;

  // Generate core files (always)
  tree.write(`${sourceLibPath}/errors.ts`, generateErrorsFile(templateOptions));
  tree.write(`${sourceLibPath}/entities.ts`, generateEntitiesFile(templateOptions));
  tree.write(`${sourceLibPath}/ports.ts`, generatePortsFile(templateOptions));
  tree.write(`${sourceLibPath}/events.ts`, generateEventsFile(templateOptions));

  // Generate CQRS files (conditional)
  if (includeCQRS) {
    tree.write(`${sourceLibPath}/commands.ts`, generateCommandsFile(templateOptions));
    tree.write(`${sourceLibPath}/queries.ts`, generateQueriesFile(templateOptions));
    tree.write(`${sourceLibPath}/projections.ts`, generateProjectionsFile(templateOptions));
  }

  // Generate RPC file (conditional)
  if (includeRPC) {
    tree.write(`${sourceLibPath}/rpc.ts`, generateRpcFile(templateOptions));
  }

  // Generate index file (barrel exports)
  tree.write(`${options.sourceRoot}/index.ts`, generateIndexFile(templateOptions));

  // Format files
  await formatFiles(tree);

  // Return post-generation instructions
  return () => {
    console.log(`
✅ Contract library created: ${options.packageName}

📁 Location: ${options.projectRoot}
📦 Package: ${options.packageName}

🎯 IMPORTANT - Customization Required:
This library was generated with minimal scaffolding.
Follow the TODO comments in each file to customize for your domain.

Next steps:
1. Customize domain files (see TODO comments in each file):
   - ${options.sourceRoot}/lib/entities.ts   - Add your domain fields
   - ${options.sourceRoot}/lib/errors.ts     - Add domain-specific errors
   - ${options.sourceRoot}/lib/events.ts     - Add custom events
   - ${options.sourceRoot}/lib/ports.ts      - Add repository/service methods

2. Review the comprehensive README:
   - ${options.projectRoot}/README.md        - Customization guide & examples

3. Build and test:
   - pnpm exec nx build ${options.projectName} --batch
   - pnpm exec nx test ${options.projectName}

4. Auto-sync TypeScript project references:
   - pnpm exec nx sync

📚 Documentation:
   - See /libs/ARCHITECTURE.md for repository patterns
   - See ${options.projectRoot}/README.md for customization examples

Dependencies: ${options.dependencies.length > 0 ? options.dependencies.map((d) => d.packageName).join(", ") : "None"}
    `);
  };
}

/**
 * Normalize options with defaults and computed values
 */
function normalizeOptions(
  tree: Tree,
  schema: ContractGeneratorSchema
): NormalizedContractOptions {
  // Use shared normalization utility for common fields
  const baseOptions = normalizeBaseOptions(tree, {
    name: schema.name,
    ...(schema.directory !== undefined && { directory: schema.directory }),
    ...(schema.description !== undefined && { description: schema.description }),
    libraryType: 'contract',
    additionalTags: ['platform:universal'], // Contracts are platform-agnostic
  });

  // Parse tags with defaults
  const defaultTags = [
    'type:contract',
    `domain:${baseOptions.name}`,
    'platform:universal',
  ];
  const parsedTags = parseTags(schema.tags, defaultTags);

  // Compute contract-specific dependencies
  const dependencies = computeDependencies({
    dependencyNames: schema.dependencies || [],
    libraryType: 'contract',
    projectRoot: baseOptions.projectRoot,
    tree,
  });

  return {
    ...baseOptions,
    dependencies,
    parsedTags,
  };
}


