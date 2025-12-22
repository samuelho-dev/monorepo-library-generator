/**
 * Contract Errors Template
 *
 * Generates errors.ts file for contract libraries with comprehensive
 * domain and repository error definitions using Data.TaggedError pattern.
 *
 * @module monorepo-library-generator/contract/errors-template
 */

import { EffectPatterns, TypeScriptBuilder } from '../../../utils/code-builder';
import type { ContractTemplateOptions } from '../../../utils/types';
import { WORKSPACE_CONFIG } from '../../../utils/workspace-config';

/**
 * Generate errors.ts file for contract library
 *
 * Creates comprehensive error definitions including:
 * - Domain errors (business logic errors)
 * - Repository errors (data access errors)
 * - Helper factory methods
 * - Error union types
 */
export function generateErrorsFile(options: ContractTemplateOptions) {
  const builder = new TypeScriptBuilder();
  const { className, fileName, propertyName } = options;
  const domainName = propertyName;
  const scope = WORKSPACE_CONFIG.getScope();

  // Add comprehensive file header with documentation
  builder.addRaw(createFileHeader(className, domainName, fileName, scope));
  builder.addBlankLine();

  // Add imports
  builder.addImports([{ from: 'effect', imports: ['Data'] }]);
  builder.addBlankLine();

  // ============================================================================
  // SECTION 1: Domain Errors
  // ============================================================================

  builder.addSectionComment('Domain Errors (Data.TaggedError)');
  builder.addComment('Use Data.TaggedError for domain-level errors that occur in business logic.');
  builder.addComment('These errors are NOT serializable over RPC by default.');
  builder.addBlankLine();

  // NotFoundError
  builder.addClass(
    EffectPatterns.createTaggedError({
      className: `${className}NotFoundError`,
      tagName: `${className}NotFoundError`,
      fields: [
        { name: 'message', type: 'string', readonly: true },
        { name: `${propertyName}Id`, type: 'string', readonly: true },
      ],
      staticMethods: [
        {
          name: 'create',
          params: [{ name: `${propertyName}Id`, type: 'string' }],
          returnType: `${className}NotFoundError`,
          body: `return new ${className}NotFoundError({
  message: \`${className} not found: \${${propertyName}Id}\`,
  ${propertyName}Id,
});`,
        },
      ],
      jsdoc: `Error thrown when ${domainName} is not found`,
    }),
  );

  // ValidationError
  builder.addClass(
    EffectPatterns.createTaggedError({
      className: `${className}ValidationError`,
      tagName: `${className}ValidationError`,
      fields: [
        { name: 'message', type: 'string', readonly: true },
        { name: 'field', type: 'string', readonly: true, optional: true },
        { name: 'constraint', type: 'string', readonly: true, optional: true },
        { name: 'value', type: 'unknown', readonly: true, optional: true },
      ],
      staticMethods: [
        {
          name: 'create',
          params: [
            {
              name: 'params',
              type: `{
    message: string;
    field?: string;
    constraint?: string;
    value?: unknown;
  }`,
            },
          ],
          returnType: `${className}ValidationError`,
          body: `return new ${className}ValidationError({
  message: params.message,
  ...(params.field !== undefined && { field: params.field }),
  ...(params.constraint !== undefined && { constraint: params.constraint }),
  ...(params.value !== undefined && { value: params.value }),
});`,
        },
        {
          name: 'fieldRequired',
          params: [{ name: 'field', type: 'string' }],
          returnType: `${className}ValidationError`,
          body: `return new ${className}ValidationError({
  message: \`\${field} is required\`,
  field,
  constraint: "required",
});`,
        },
        {
          name: 'fieldInvalid',
          params: [
            { name: 'field', type: 'string' },
            { name: 'constraint', type: 'string' },
            { name: 'value', type: 'unknown', optional: true },
          ],
          returnType: `${className}ValidationError`,
          body: `return new ${className}ValidationError({
  message: \`\${field} is invalid: \${constraint}\`,
  field,
  constraint,
  ...(value !== undefined && { value }),
});`,
        },
      ],
      jsdoc: `Error thrown when ${domainName} validation fails`,
    }),
  );

  // AlreadyExistsError
  builder.addClass(
    EffectPatterns.createTaggedError({
      className: `${className}AlreadyExistsError`,
      tagName: `${className}AlreadyExistsError`,
      fields: [
        { name: 'message', type: 'string', readonly: true },
        { name: 'identifier', type: 'string', readonly: true, optional: true },
      ],
      staticMethods: [
        {
          name: 'create',
          params: [{ name: 'identifier', type: 'string', optional: true }],
          returnType: `${className}AlreadyExistsError`,
          body: `return new ${className}AlreadyExistsError({
  message: identifier
    ? \`${className} already exists: \${identifier}\`
    : "${className} already exists",
  ...(identifier !== undefined && { identifier }),
});`,
        },
      ],
      jsdoc: `Error thrown when ${domainName} already exists`,
    }),
  );

  // PermissionError
  // Note: Only include userId field if entity is not already User (to avoid duplicate fields)
  const permissionErrorFields: Array<{
    name: string;
    type: string;
    readonly: boolean;
    optional?: boolean;
  }> = [
    { name: 'message', type: 'string', readonly: true },
    { name: 'operation', type: 'string', readonly: true },
    { name: `${propertyName}Id`, type: 'string', readonly: true },
  ];

  // Only add userId if the entity itself isn't User (avoid duplicate userId field)
  if (propertyName !== 'user') {
    permissionErrorFields.push({
      name: 'userId',
      type: 'string',
      readonly: true,
      optional: true,
    });
  }

  const permissionErrorParamType =
    propertyName !== 'user'
      ? `{
    operation: string;
    ${propertyName}Id: string;
    userId?: string;
  }`
      : `{
    operation: string;
    ${propertyName}Id: string;
  }`;

  const permissionErrorBody =
    propertyName !== 'user'
      ? `return new ${className}PermissionError({
  message: \`Operation '\${params.operation}' not permitted on ${domainName} \${params.${propertyName}Id}\`,
  operation: params.operation,
  ${propertyName}Id: params.${propertyName}Id,
  ...(params.userId !== undefined && { userId: params.userId }),
});`
      : `return new ${className}PermissionError({
  message: \`Operation '\${params.operation}' not permitted on ${domainName} \${params.${propertyName}Id}\`,
  operation: params.operation,
  ${propertyName}Id: params.${propertyName}Id,
});`;

  builder.addClass(
    EffectPatterns.createTaggedError({
      className: `${className}PermissionError`,
      tagName: `${className}PermissionError`,
      fields: permissionErrorFields,
      staticMethods: [
        {
          name: 'create',
          params: [
            {
              name: 'params',
              type: permissionErrorParamType,
            },
          ],
          returnType: `${className}PermissionError`,
          body: permissionErrorBody,
        },
      ],
      jsdoc: `Error thrown when ${domainName} operation is not permitted`,
    }),
  );

  // Add TODO comment for custom domain errors
  builder.addComment('TODO: Add domain-specific errors here');
  builder.addComment('Example - State transition error (if domain has status/state machine):');
  builder.addComment('');
  builder.addComment(
    `export class ${className}InvalidStateError extends Data.TaggedError("${className}InvalidStateError")<{`,
  );
  builder.addComment('  readonly message: string;');
  builder.addComment('  readonly currentState: string;');
  builder.addComment('  readonly targetState: string;');
  builder.addComment(`  readonly ${propertyName}Id: string;`);
  builder.addComment('}> {');
  builder.addComment(`  static create(params: {`);
  builder.addComment('    currentState: string;');
  builder.addComment('    targetState: string;');
  builder.addComment(`    ${propertyName}Id: string;`);
  builder.addComment('  }) {');
  builder.addComment(`    return new ${className}InvalidStateError({`);
  builder.addComment(
    `      message: \`Cannot transition ${domainName} from \${params.currentState} to \${params.targetState}\`,`,
  );
  builder.addComment('      ...params,');
  builder.addComment('    });');
  builder.addComment('  }');
  builder.addComment('}');
  builder.addBlankLine();

  // Domain error union type
  builder.addTypeAlias({
    name: `${className}DomainError`,
    type: `
  | ${className}NotFoundError
  | ${className}ValidationError
  | ${className}AlreadyExistsError
  | ${className}PermissionError`,
    exported: true,
    jsdoc: 'Union of all domain errors',
  });

  // ============================================================================
  // SECTION 2: Repository Errors
  // ============================================================================

  builder.addSectionComment('Repository Errors (Data.TaggedError)');
  builder.addComment('Repository errors use Data.TaggedError for domain-level operations.');
  builder.addComment('These errors do NOT cross RPC boundaries - use rpc.ts for network errors.');
  builder.addBlankLine();

  // NotFoundRepositoryError
  builder.addClass(
    EffectPatterns.createTaggedError({
      className: `${className}NotFoundRepositoryError`,
      tagName: `${className}NotFoundRepositoryError`,
      fields: [
        { name: 'message', type: 'string', readonly: true },
        { name: `${propertyName}Id`, type: 'string', readonly: true },
      ],
      staticMethods: [
        {
          name: 'create',
          params: [{ name: `${propertyName}Id`, type: 'string' }],
          returnType: `${className}NotFoundRepositoryError`,
          body: `return new ${className}NotFoundRepositoryError({
  message: \`${className} not found: \${${propertyName}Id}\`,
  ${propertyName}Id,
});`,
        },
      ],
      jsdoc: `Repository error for ${domainName} not found`,
    }),
  );

  // ValidationRepositoryError
  builder.addClass(
    EffectPatterns.createTaggedError({
      className: `${className}ValidationRepositoryError`,
      tagName: `${className}ValidationRepositoryError`,
      fields: [
        { name: 'message', type: 'string', readonly: true },
        { name: 'field', type: 'string', readonly: true, optional: true },
        { name: 'constraint', type: 'string', readonly: true, optional: true },
      ],
      staticMethods: [
        {
          name: 'create',
          params: [
            {
              name: 'params',
              type: `{
    message: string;
    field?: string;
    constraint?: string;
  }`,
            },
          ],
          returnType: `${className}ValidationRepositoryError`,
          body: `return new ${className}ValidationRepositoryError({
  message: params.message,
  ...(params.field !== undefined && { field: params.field }),
  ...(params.constraint !== undefined && { constraint: params.constraint }),
});`,
        },
      ],
      jsdoc: `Repository error for ${domainName} validation failures`,
    }),
  );

  // ConflictRepositoryError
  builder.addClass(
    EffectPatterns.createTaggedError({
      className: `${className}ConflictRepositoryError`,
      tagName: `${className}ConflictRepositoryError`,
      fields: [
        { name: 'message', type: 'string', readonly: true },
        { name: 'identifier', type: 'string', readonly: true, optional: true },
      ],
      staticMethods: [
        {
          name: 'create',
          params: [{ name: 'identifier', type: 'string', optional: true }],
          returnType: `${className}ConflictRepositoryError`,
          body: `return new ${className}ConflictRepositoryError({
  message: identifier
    ? \`${className} already exists: \${identifier}\`
    : "${className} already exists",
  ...(identifier !== undefined && { identifier }),
});`,
        },
      ],
      jsdoc: `Repository error for ${domainName} conflicts`,
    }),
  );

  // DatabaseRepositoryError
  builder.addClass(
    EffectPatterns.createTaggedError({
      className: `${className}DatabaseRepositoryError`,
      tagName: `${className}DatabaseRepositoryError`,
      fields: [
        { name: 'message', type: 'string', readonly: true },
        { name: 'operation', type: 'string', readonly: true },
        { name: 'cause', type: 'string', readonly: true, optional: true },
      ],
      staticMethods: [
        {
          name: 'create',
          params: [
            {
              name: 'params',
              type: `{
    message: string;
    operation: string;
    cause?: string;
  }`,
            },
          ],
          returnType: `${className}DatabaseRepositoryError`,
          body: `return new ${className}DatabaseRepositoryError({
  message: params.message,
  operation: params.operation,
  ...(params.cause !== undefined && { cause: params.cause }),
});`,
        },
      ],
      jsdoc: `Repository error for ${domainName} database failures`,
    }),
  );

  // Repository error union type
  builder.addTypeAlias({
    name: `${className}RepositoryError`,
    type: `
  | ${className}NotFoundRepositoryError
  | ${className}ValidationRepositoryError
  | ${className}ConflictRepositoryError
  | ${className}DatabaseRepositoryError`,
    exported: true,
    jsdoc: 'Union of all repository errors',
  });

  // ============================================================================
  // SECTION 3: Error Union Types
  // ============================================================================

  builder.addSectionComment('Error Union Types');
  builder.addBlankLine();

  builder.addTypeAlias({
    name: `${className}Error`,
    type: `${className}DomainError | ${className}RepositoryError`,
    exported: true,
    jsdoc: `All possible ${domainName} errors`,
  });

  return builder.toString();
}

/**
 * Create comprehensive file header with documentation
 */
function createFileHeader(className: string, domainName: string, fileName: string, scope: string) {
  return `/**
 * ${className} Domain Errors
 *
 * Defines all error types for ${domainName} domain operations.
 *
 * ERROR TYPE SELECTION GUIDE:
 * ===========================
 *
 * 1. Data.TaggedError - For Domain & Repository Errors (DEFAULT CHOICE)
 *    ✅ Use when: Errors stay within your service boundary (same process)
 *    ✅ Use when: Repository errors, business logic errors, service errors
 *    ✅ Benefits: Lightweight, better performance, simpler API
 *    ✅ Pattern: Used in this template by default
 *    ❌ Cannot: Serialize over network boundaries (RPC, HTTP)
 *
 *    Example:
 *    \`\`\`typescript
 *    export class ${className}NotFoundError extends Data.TaggedError("${className}NotFoundError")<{
 *      readonly message: string;
 *      readonly ${domainName}Id: string;
 *    }> {}
 *    \`\`\`
 *
 * 2. Schema.TaggedError - For RPC/Network Boundaries (SPECIAL CASES ONLY)
 *    ✅ Use when: Errors cross network boundaries (client ↔ server RPC)
 *    ✅ Use when: Building APIs that expose errors to external clients
 *    ✅ Benefits: Fully serializable, can cross process boundaries
 *    ✅ Example use cases:
 *       - tRPC procedures that return errors to frontend
 *       - Microservice RPC calls between services
 *       - Public API error responses
 *    ⚠️  Caution: More complex API, requires Schema definitions
 *    ⚠️  Overhead: Adds serialization/deserialization cost
 *
 * IMPORTANT DECISION:
 * This template uses Data.TaggedError for ALL errors (domain + repository).
 * This is CORRECT for most use cases because:
 * - Repository errors stay within the same process (data-access → feature)
 * - Service errors stay within the same process (feature → app)
 * - Only when building RPC endpoints (e.g., tRPC) should you use Schema.TaggedError
 *
 * If you need RPC-serializable errors, see /libs/contract/${fileName}/src/lib/rpc.ts
 *
 * TODO: Customize this file for your domain:
 * 1. Add domain-specific error types as needed (use Data.TaggedError)
 * 2. Add helper factory methods for common error scenarios
 * 3. Consider adding:
 *    - State transition errors (if domain has state machine)
 *    - Business rule violation errors
 *    - Resource conflict errors
 * 4. ONLY if building RPC APIs: Add Schema.TaggedError variants in rpc.ts
 *
 * @see https://effect.website/docs/guides/error-management for error handling
 * @see libs/contract/${fileName}/src/lib/rpc.ts for RPC-serializable errors
 * @module ${scope}/contract-${fileName}/errors
 */`;
}
