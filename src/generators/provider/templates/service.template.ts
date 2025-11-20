/**
 * Provider Generator - Service Template
 *
 * Generates the main Effect service implementation for provider libraries.
 * Uses Context.Tag pattern with inline interface for service definition.
 *
 * Features:
 * - Context.Tag with inline interface (NOT Context.GenericTag)
 * - Complete CRUD operations with Effect error handling
 * - Retry logic with exponential backoff
 * - Pagination support for list operations
 * - Type-safe SDK wrapper with proper error mapping
 * - Health check for service monitoring
 *
 * @module monorepo-library-generator/provider/templates/service
 */

import { TypeScriptBuilder } from '../../../utils/code-generation/typescript-builder';
import type { ProviderTemplateOptions } from '../../../utils/shared/types';

/**
 * Generate service.ts file for provider library
 *
 * Creates the main Effect service with Context.Tag pattern.
 *
 * @param options - Provider template options
 * @returns Generated TypeScript code
 */
export function generateServiceFile(options: ProviderTemplateOptions) {
  const builder = new TypeScriptBuilder();
  const { className, externalService, name: projectClassName } = options;

  // File header
  builder.addRaw('/**');
  builder.addRaw(` * ${projectClassName} - Effect Service Implementation`);
  builder.addRaw(' *');
  builder.addRaw(
    ` * Provider: External service adapter for ${externalService}`,
  );
  builder.addRaw(
    ' * Pattern: Context.Tag with inline interface (NOT Context.GenericTag)',
  );
  builder.addRaw(' * Reference: provider.md lines 178-248');
  builder.addRaw(' *');
  builder.addRaw(' * FEATURES:');
  builder.addRaw(' * - Complete CRUD operations with Effect error handling');
  builder.addRaw(' * - Retry logic with exponential backoff');
  builder.addRaw(' * - Pagination support for list operations');
  builder.addRaw(' * - Type-safe SDK wrapper with proper error mapping');
  builder.addRaw(' * - Health check for service monitoring');
  builder.addRaw(' */');
  builder.addBlankLine();

  // Imports
  builder.addImport('effect', 'Context');
  builder.addImport('effect', 'Effect');
  builder.addImport('effect', 'Schedule');
  builder.addImport('effect', 'Duration');
  builder.addImport('./errors', `map${className}Error`);
  builder.addImport('./errors', `${className}ServiceError`);
  builder.addBlankLine();

  // Context.Tag with inline interface
  builder.addRaw('/**');
  builder.addRaw(` * ${projectClassName} Context Tag with Inline Interface`);
  builder.addRaw(' *');
  builder.addRaw(
    ' * CRITICAL: Use Context.Tag with inline interface (NOT Context.GenericTag)',
  );
  builder.addRaw(' * Reference: provider.md lines 186-246');
  builder.addRaw(' *');
  builder.addRaw(' * Pattern:');
  builder.addRaw(' * ```typescript');
  builder.addRaw(' * class MyService extends Context.Tag("MyService")<');
  builder.addRaw(' *   MyService,');
  builder.addRaw(' *   { readonly methods... }');
  builder.addRaw(' * >() {}');
  builder.addRaw(' * ```');
  builder.addRaw(' */');
  builder.addRaw(
    `export class ${className} extends Context.Tag("${className}")<`,
  );
  builder.addRaw(`  ${className},`);
  builder.addRaw('  {');
  builder.addRaw('    /**');
  builder.addRaw('     * Health check - verifies service connectivity');
  builder.addRaw('     */');
  builder.addRaw(
    `    readonly healthCheck: Effect.Effect<HealthCheckResult, ${className}ServiceError>;`,
  );
  builder.addBlankLine();
  builder.addRaw('    /**');
  builder.addRaw('     * Service configuration (read-only)');
  builder.addRaw('     */');
  builder.addRaw(`    readonly config: ${className}Config;`);
  builder.addBlankLine();
  builder.addRaw('    /**');
  builder.addRaw('     * List resources with pagination support');
  builder.addRaw('     *');
  builder.addRaw(
    '     * @param params - Query parameters including pagination',
  );
  builder.addRaw('     * @returns Effect with paginated results');
  builder.addRaw('     *');
  builder.addRaw('     * @example');
  builder.addRaw('     * ```typescript');
  builder.addRaw(`     * const service = yield* ${projectClassName};`);
  builder.addRaw(
    '     * const result = yield* service.list({ page: 1, limit: 10 });',
  );
  builder.addRaw('     * ```');
  builder.addRaw('     */');
  builder.addRaw('    readonly list: (');
  builder.addRaw('      params?: ListParams');
  builder.addRaw(
    `    ) => Effect.Effect<PaginatedResult<Resource>, ${className}ServiceError>;`,
  );
  builder.addBlankLine();
  builder.addRaw('    /**');
  builder.addRaw('     * Get resource by ID');
  builder.addRaw('     *');
  builder.addRaw('     * @param id - Resource identifier');
  builder.addRaw('     * @returns Effect with resource data');
  builder.addRaw('     *');
  builder.addRaw('     * @example');
  builder.addRaw('     * ```typescript');
  builder.addRaw('     * const resource = yield* service.get("resource-id");');
  builder.addRaw('     * ```');
  builder.addRaw('     */');
  builder.addRaw('    readonly get: (');
  builder.addRaw('      id: string');
  builder.addRaw(`    ) => Effect.Effect<Resource, ${className}ServiceError>;`);
  builder.addBlankLine();
  builder.addRaw('    /**');
  builder.addRaw('     * Create new resource');
  builder.addRaw('     *');
  builder.addRaw('     * @param data - Resource creation data');
  builder.addRaw('     * @returns Effect with created resource');
  builder.addRaw('     *');
  builder.addRaw('     * @example');
  builder.addRaw('     * ```typescript');
  builder.addRaw(
    '     * const created = yield* service.create({ name: "example" });',
  );
  builder.addRaw('     * ```');
  builder.addRaw('     */');
  builder.addRaw('    readonly create: (');
  builder.addRaw('      data: CreateResourceData');
  builder.addRaw(`    ) => Effect.Effect<Resource, ${className}ServiceError>;`);
  builder.addBlankLine();
  builder.addRaw('    /**');
  builder.addRaw('     * Update existing resource');
  builder.addRaw('     *');
  builder.addRaw('     * @param id - Resource identifier');
  builder.addRaw('     * @param data - Updated resource data');
  builder.addRaw('     * @returns Effect with updated resource');
  builder.addRaw('     *');
  builder.addRaw('     * @example');
  builder.addRaw('     * ```typescript');
  builder.addRaw(
    '     * const updated = yield* service.update("id", { name: "new name" });',
  );
  builder.addRaw('     * ```');
  builder.addRaw('     */');
  builder.addRaw('    readonly update: (');
  builder.addRaw('      id: string,');
  builder.addRaw('      data: UpdateResourceData');
  builder.addRaw(`    ) => Effect.Effect<Resource, ${className}ServiceError>;`);
  builder.addBlankLine();
  builder.addRaw('    /**');
  builder.addRaw('     * Delete resource by ID');
  builder.addRaw('     *');
  builder.addRaw('     * @param id - Resource identifier');
  builder.addRaw('     * @returns Effect that succeeds when deleted');
  builder.addRaw('     *');
  builder.addRaw('     * @example');
  builder.addRaw('     * ```typescript');
  builder.addRaw('     * yield* service.delete("resource-id");');
  builder.addRaw('     * ```');
  builder.addRaw('     */');
  builder.addRaw('    readonly delete: (');
  builder.addRaw('      id: string');
  builder.addRaw(`    ) => Effect.Effect<void, ${className}ServiceError>;`);
  builder.addBlankLine();
  builder.addRaw('    /**');
  builder.addRaw('     * Search resources with filters');
  builder.addRaw('     *');
  builder.addRaw('     * @param query - Search query string');
  builder.addRaw('     * @param filters - Additional filters');
  builder.addRaw('     * @returns Effect with search results');
  builder.addRaw('     *');
  builder.addRaw('     * @example');
  builder.addRaw('     * ```typescript');
  builder.addRaw(
    '     * const results = yield* service.search("query", { status: "active" });',
  );
  builder.addRaw('     * ```');
  builder.addRaw('     */');
  builder.addRaw('    readonly search: (');
  builder.addRaw('      query: string,');
  builder.addRaw('      filters?: Record<string, unknown>');
  builder.addRaw(
    `    ) => Effect.Effect<readonly Resource[], ${className}ServiceError>;`,
  );
  builder.addRaw('  }');
  builder.addRaw('>() {');
  builder.addRaw('  /**');
  builder.addRaw('   * Create service instance with SDK client');
  builder.addRaw('   *');
  builder.addRaw(`   * @param client - ${externalService} SDK client instance`);
  builder.addRaw('   * @param config - Optional service configuration');
  builder.addRaw('   * @returns Service interface implementation');
  builder.addRaw('   */');
  builder.addRaw('  static make(');
  builder.addRaw('    client: unknown,');
  builder.addRaw(`    config?: Partial<${className}Config>,`);
  builder.addRaw('  ) {');
  builder.addRaw(`    // TODO: Define ${externalService} SDK type interface`);
  builder.addRaw(
    `    // Example: interface ${className}SDK { methodName: () => Promise<Result> }`,
  );
  builder.addRaw(`    // Then use: const sdkClient: ${className}SDK = client;`);
  builder.addRaw('    const sdkClient = client;');
  builder.addBlankLine();
  builder.addRaw(`    const serviceConfig: ${className}Config = {`);
  builder.addRaw('      apiKey: config?.apiKey || "",');
  builder.addRaw('      timeout: config?.timeout || 20000,');
  builder.addRaw('      retryAttempts: config?.retryAttempts || 3,');
  builder.addRaw('      retryDelay: config?.retryDelay || 1000,');
  builder.addRaw('    };');
  builder.addBlankLine();
  builder.addRaw('    // Retry policy: exponential backoff with max attempts');
  builder.addRaw(
    '    const retryPolicy = Schedule.exponential(Duration.millis(serviceConfig.retryDelay!))',
  );
  builder.addRaw(
    '      .pipe(Schedule.compose(Schedule.recurs(serviceConfig.retryAttempts!)));',
  );
  builder.addBlankLine();
  builder.addRaw('    // Health check implementation');
  builder.addRaw('    const healthCheck = Effect.tryPromise({');
  builder.addRaw('      try: async (): Promise<HealthCheckResult> => {');
  builder.addRaw('        // TODO: Implement actual health check using SDK');
  builder.addRaw('        // Example: await sdkClient.ping()');
  builder.addBlankLine();
  builder.addRaw('        return {');
  builder.addRaw('          status: "healthy" as const,');
  builder.addRaw('          timestamp: new Date().toISOString(),');
  builder.addRaw('          version: "1.0.0",');
  builder.addRaw('        };');
  builder.addRaw('      },');
  builder.addRaw(`      catch: map${className}Error,`);
  builder.addRaw('    });');
  builder.addBlankLine();
  builder.addRaw('    // List operation with pagination');
  builder.addRaw('    const list = (params?: ListParams) =>');
  builder.addRaw('      Effect.tryPromise({');
  builder.addRaw(
    '        try: async (): Promise<PaginatedResult<Resource>> => {',
  );
  builder.addRaw('          // TODO: Replace with actual SDK call');
  builder.addRaw('          // Example: const result = await sdkClient.list({');
  builder.addRaw('          //   page: params?.page || 1,');
  builder.addRaw('          //   limit: params?.limit || 10,');
  builder.addRaw('          //   ...params?.filters');
  builder.addRaw('          // });');
  builder.addBlankLine();
  builder.addRaw('          return {');
  builder.addRaw('            data: [],');
  builder.addRaw('            total: 0,');
  builder.addRaw('            page: params?.page || 1,');
  builder.addRaw('            limit: params?.limit || 10,');
  builder.addRaw('            hasMore: false,');
  builder.addRaw('          };');
  builder.addRaw('        },');
  builder.addRaw(`        catch: map${className}Error,`);
  builder.addRaw('      }).pipe(Effect.retry(retryPolicy));');
  builder.addBlankLine();
  builder.addRaw('    // Get operation with retry');
  builder.addRaw('    const get = (id: string) =>');
  builder.addRaw('      Effect.tryPromise({');
  builder.addRaw('        try: async (): Promise<Resource> => {');
  builder.addRaw('          // TODO: Replace with actual SDK call');
  builder.addRaw('          // Example: return await sdkClient.get(id);');
  builder.addBlankLine();
  builder.addRaw('          return { id, data: {} };');
  builder.addRaw('        },');
  builder.addRaw(`        catch: map${className}Error,`);
  builder.addRaw('      }).pipe(Effect.retry(retryPolicy));');
  builder.addBlankLine();
  builder.addRaw('    // Create operation');
  builder.addRaw('    const create = (data: CreateResourceData) =>');
  builder.addRaw('      Effect.tryPromise({');
  builder.addRaw('        try: async (): Promise<Resource> => {');
  builder.addRaw('          // TODO: Replace with actual SDK call');
  builder.addRaw('          // Example: return await sdkClient.create(data);');
  builder.addBlankLine();
  builder.addRaw('          return { id: crypto.randomUUID(), data };');
  builder.addRaw('        },');
  builder.addRaw(`        catch: map${className}Error,`);
  builder.addRaw('      }).pipe(Effect.retry(retryPolicy));');
  builder.addBlankLine();
  builder.addRaw('    // Update operation');
  builder.addRaw(
    '    const update = (id: string, data: UpdateResourceData) =>',
  );
  builder.addRaw('      Effect.tryPromise({');
  builder.addRaw('        try: async (): Promise<Resource> => {');
  builder.addRaw('          // TODO: Replace with actual SDK call');
  builder.addRaw(
    '          // Example: return await sdkClient.update(id, data);',
  );
  builder.addBlankLine();
  builder.addRaw('          return { id, data };');
  builder.addRaw('        },');
  builder.addRaw(`        catch: map${className}Error,`);
  builder.addRaw('      }).pipe(Effect.retry(retryPolicy));');
  builder.addBlankLine();
  builder.addRaw('    // Delete operation');
  builder.addRaw('    const deleteResource = (id: string) =>');
  builder.addRaw('      Effect.tryPromise({');
  builder.addRaw('        try: async (): Promise<void> => {');
  builder.addRaw('          // TODO: Replace with actual SDK call');
  builder.addRaw('          // Example: await sdkClient.delete(id);');
  builder.addRaw('        },');
  builder.addRaw(`        catch: map${className}Error,`);
  builder.addRaw('      }).pipe(Effect.retry(retryPolicy));');
  builder.addBlankLine();
  builder.addRaw('    // Search operation');
  builder.addRaw(
    '    const search = (query: string, filters?: Record<string, unknown>) =>',
  );
  builder.addRaw('      Effect.tryPromise({');
  builder.addRaw('        try: async (): Promise<readonly Resource[]> => {');
  builder.addRaw('          // TODO: Replace with actual SDK call');
  builder.addRaw(
    '          // Example: return await sdkClient.search({ query, ...filters });',
  );
  builder.addBlankLine();
  builder.addRaw('          return [];');
  builder.addRaw('        },');
  builder.addRaw(`        catch: map${className}Error,`);
  builder.addRaw('      }).pipe(Effect.retry(retryPolicy));');
  builder.addBlankLine();
  builder.addRaw('    return {');
  builder.addRaw('      healthCheck,');
  builder.addRaw('      config: serviceConfig,');
  builder.addRaw('      list,');
  builder.addRaw('      get,');
  builder.addRaw('      create,');
  builder.addRaw('      update,');
  builder.addRaw('      delete: deleteResource,');
  builder.addRaw('      search,');
  builder.addRaw('    };');
  builder.addRaw('  }');
  builder.addRaw('}');
  builder.addBlankLine();

  // Service Configuration interface
  builder.addInterface({
    name: `${className}Config`,
    exported: true,
    jsdoc: 'Service Configuration',
    properties: [
      {
        name: 'apiKey',
        type: 'string',
        readonly: true,
        jsdoc: 'API key for authentication',
      },
      {
        name: 'timeout',
        type: 'number',
        readonly: true,
        optional: true,
        jsdoc: 'Request timeout in milliseconds',
      },
      {
        name: 'retryAttempts',
        type: 'number',
        readonly: true,
        optional: true,
        jsdoc: 'Number of retry attempts',
      },
      {
        name: 'retryDelay',
        type: 'number',
        readonly: true,
        optional: true,
        jsdoc: 'Initial retry delay in milliseconds',
      },
    ],
  });

  // Add TODO comment after the interface
  builder.addRaw(
    '  // TODO: Add additional configuration options as needed (e.g., baseUrl, region)',
  );
  builder.addBlankLine();

  // Health Check Result interface
  builder.addInterface({
    name: 'HealthCheckResult',
    exported: true,
    jsdoc: 'Health Check Result',
    properties: [
      {
        name: 'status',
        type: '"healthy" | "unhealthy" | "degraded"',
        readonly: true,
        jsdoc: 'Service health status',
      },
      {
        name: 'timestamp',
        type: 'string',
        readonly: true,
        jsdoc: 'Check timestamp',
      },
      {
        name: 'version',
        type: 'string',
        readonly: true,
        jsdoc: 'Service version',
      },
      {
        name: 'details',
        type: 'Record<string, unknown>',
        readonly: true,
        optional: true,
        jsdoc: 'Additional details',
      },
    ],
  });

  // Helper function to create client
  builder.addFunction({
    name: `create${className}Client`,
    exported: true,
    jsdoc: `Helper: Create client instance\n\nUse this in Layer implementations to instantiate the SDK client`,
    params: [{ name: 'config', type: `${className}Config` }],
    returnType: 'unknown',
    body: `// TODO: Initialize ${externalService} SDK client
// Example: return new ${className}SDK({ apiKey: config.apiKey, timeout: config.timeout });

return {
  // Mock client for now
  config,
};`,
  });

  // Section comment for type definitions
  builder.addSectionComment('Type Definitions');

  // ListParams interface
  builder.addInterface({
    name: 'ListParams',
    exported: true,
    jsdoc: 'List query parameters with pagination',
    properties: [
      {
        name: 'page',
        type: 'number',
        readonly: true,
        optional: true,
        jsdoc: 'Page number',
      },
      {
        name: 'limit',
        type: 'number',
        readonly: true,
        optional: true,
        jsdoc: 'Items per page',
      },
      {
        name: 'filters',
        type: 'Record<string, unknown>',
        readonly: true,
        optional: true,
        jsdoc: 'Filter criteria',
      },
    ],
  });

  // PaginatedResult interface
  builder.addInterface({
    name: 'PaginatedResult',
    exported: true,
    jsdoc: 'Paginated result wrapper',
    properties: [
      {
        name: 'data',
        type: 'readonly T[]',
        readonly: true,
        jsdoc: 'Result data',
      },
      { name: 'total', type: 'number', readonly: true, jsdoc: 'Total count' },
      { name: 'page', type: 'number', readonly: true, jsdoc: 'Current page' },
      {
        name: 'limit',
        type: 'number',
        readonly: true,
        jsdoc: 'Items per page',
      },
      {
        name: 'hasMore',
        type: 'boolean',
        readonly: true,
        jsdoc: 'More results available',
      },
    ],
  });

  // Fix PaginatedResult to be generic
  let content = builder.toString();
  content = content.replace(
    'export interface PaginatedResult {',
    'export interface PaginatedResult<T> {',
  );
  builder.clear();
  builder.addRaw(content);

  // Resource interface
  builder.addInterface({
    name: 'Resource',
    exported: true,
    jsdoc: `Generic resource type\n\nTODO: Replace with actual resource type from ${externalService} SDK`,
    properties: [
      { name: 'id', type: 'string', readonly: true, jsdoc: 'Resource ID' },
      {
        name: 'data',
        type: 'Record<string, unknown>',
        readonly: true,
        jsdoc: 'Resource data',
      },
    ],
  });

  // CreateResourceData interface
  builder.addInterface({
    name: 'CreateResourceData',
    exported: true,
    jsdoc:
      'Resource creation data\n\nTODO: Define actual creation data structure',
    properties: [
      {
        name: '[key: string]',
        type: 'unknown',
        jsdoc: 'Dynamic creation fields',
      },
    ],
  });

  // UpdateResourceData interface
  builder.addInterface({
    name: 'UpdateResourceData',
    exported: true,
    jsdoc: 'Resource update data\n\nTODO: Define actual update data structure',
    properties: [
      {
        name: '[key: string]',
        type: 'unknown',
        jsdoc: 'Dynamic update fields',
      },
    ],
  });

  return builder.toString();
}
