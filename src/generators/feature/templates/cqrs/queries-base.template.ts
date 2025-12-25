/**
 * CQRS Queries Base Template
 *
 * Generates server/cqrs/queries/base.ts with abstract Query class and QueryBus.
 *
 * @module monorepo-library-generator/feature/cqrs/queries-base-template
 */

import { TypeScriptBuilder } from "../../../../utils/code-builder"
import type { FeatureTemplateOptions } from "../../../../utils/types"

/**
 * Generate server/cqrs/queries/base.ts file
 *
 * Creates base Query class for CQRS read operations:
 * - Abstract Query class with Effect patterns
 * - QueryBus Context.Tag for dispatching
 * - Optional caching support
 * - Type-safe input/output via Schema
 */
export function generateQueriesBaseFile(options: FeatureTemplateOptions) {
  const builder = new TypeScriptBuilder()
  const { className, name } = options

  builder.addFileHeader({
    title: `${className} Query Base`,
    description: `Base Query class for ${name} CQRS read operations.

Queries represent requests to read system state.
They never modify state and can be cached for performance.

Pattern: Query → QueryBus → Handler → Repository → Result

Usage:
- Extend Query class for each read operation
- Register handlers with QueryBus
- Optional caching via CacheService`,
    module: `${options.packageName}/server/cqrs/queries`
  })
  builder.addBlankLine()

  builder.addImports([
    { from: "effect", imports: ["Context", "Duration", "Effect", "Layer", "Option", "Schema"] }
  ])
  builder.addBlankLine()

  builder.addSectionComment("Query Base Class")
  builder.addBlankLine()

  builder.addRaw(`/**
 * Base Query for CQRS read operations
 *
 * Queries represent requests to read system state.
 * They never modify state and can be cached.
 *
 * @typeParam TInput - Schema for query input
 * @typeParam TOutput - Schema for query output (result)
 * @typeParam TError - Union type of possible errors
 * @typeParam TDeps - Context dependencies required by handler
 *
 * @example
 * \`\`\`typescript
 * class Get${className}ByIdQuery extends Query<
 *   typeof ${className}IdInput,
 *   typeof ${className}Result,
 *   ${className}NotFoundError,
 *   DatabaseService
 * > {
 *   readonly _tag = "Get${className}ByIdQuery";
 *   readonly input = ${className}IdInput;
 *   readonly output = ${className}Result;
 *   readonly cacheTTL = Option.some(Duration.minutes(5));
 *
 *   execute(input) {
 *     return Effect.gen(function*() {
 *       const db = yield* DatabaseService;
 *       return yield* db.findById(input.id);
 *     });
 *   }
 * }
 * \`\`\`
 */
export abstract class Query<
  TInput extends Schema.Schema.AnyNoContext,
  TOutput extends Schema.Schema.AnyNoContext,
  TError,
  TDeps = never
> {
  /**
   * Unique query tag for routing
   */
  abstract readonly _tag: string;

  /**
   * Input schema for validation
   */
  abstract readonly input: TInput;

  /**
   * Output schema for response
   */
  abstract readonly output: TOutput;

  /**
   * Optional cache TTL for query results
   * Set to Option.none() to disable caching
   */
  readonly cacheTTL: Option.Option<Duration.Duration> = Option.none();

  /**
   * Generate cache key from input
   * Override for custom cache key generation
   */
  cacheKey(input: Schema.Schema.Type<TInput>) {
    return \`\${this._tag}:\${JSON.stringify(input)}\`;
  }

  /**
   * Execute the query
   *
   * @param input - Validated query input
   * @returns Effect with result or error
   */
  abstract execute(
    input: Schema.Schema.Type<TInput>
  ): Effect.Effect<Schema.Schema.Type<TOutput>, TError, TDeps>;
}`)
  builder.addBlankLine()

  builder.addSectionComment("QueryBus Interface")
  builder.addBlankLine()

  builder.addRaw(`/**
 * QueryBus Interface
 *
 * Dispatches queries to their handlers with optional caching.
 */
export interface QueryBusInterface {
  /**
   * Dispatch a query to its handler
   *
   * @param query - The query instance to dispatch
   * @param input - The validated input for the query
   */
  readonly dispatch: <
    TInput extends Schema.Schema.AnyNoContext,
    TOutput extends Schema.Schema.AnyNoContext,
    TError,
    TDeps
  >(
    query: Query<TInput, TOutput, TError, TDeps>,
    input: Schema.Schema.Type<TInput>
  ) => Effect.Effect<Schema.Schema.Type<TOutput>, TError, TDeps>;

  /**
   * Invalidate cached query results
   *
   * @param query - The query to invalidate
   * @param input - Optional specific input to invalidate
   */
  readonly invalidate: <
    TInput extends Schema.Schema.AnyNoContext,
    TOutput extends Schema.Schema.AnyNoContext,
    TError,
    TDeps
  >(
    query: Query<TInput, TOutput, TError, TDeps>,
    input?: Schema.Schema.Type<TInput>
  ) => Effect.Effect<void>;
}`)
  builder.addBlankLine()

  builder.addSectionComment("QueryBus Context.Tag")
  builder.addBlankLine()

  builder.addRaw(`/**
 * ${className} QueryBus Context Tag
 *
 * Provides query dispatch capability via Context.
 * Supports optional caching through CacheService integration.
 *
 * @example
 * \`\`\`typescript
 * const program = Effect.gen(function*() {
 *   const bus = yield* ${className}QueryBus;
 *
 *   // First call executes query
 *   const result1 = yield* bus.dispatch(
 *     new Get${className}ByIdQuery(),
 *     { id: "123" }
 *   );
 *
 *   // Second call may return cached result (if cacheTTL is set)
 *   const result2 = yield* bus.dispatch(
 *     new Get${className}ByIdQuery(),
 *     { id: "123" }
 *   );
 *
 *   return result1;
 * });
 * \`\`\`
 */
export class ${className}QueryBus extends Context.Tag("${className}QueryBus")<
  ${className}QueryBus,
  QueryBusInterface
>() {
  /**
   * Live layer - dispatches queries directly (no caching)
   *
   * For caching, provide a layer that integrates with CacheService
   */
  static readonly Live = Layer.succeed(
    this,
    {
      dispatch: (query, input) =>
        query.execute(input).pipe(
          Effect.withSpan(\`${className}QueryBus.dispatch.\${query._tag}\`)
        ),
      invalidate: () => Effect.void,
    }
  );

  /**
   * Test layer - same as Live, suitable for testing
   */
  static readonly Test = this.Live;
}`)

  return builder.toString()
}

/**
 * Generate server/cqrs/queries/index.ts file
 */
export function generateQueriesIndexFile(options: FeatureTemplateOptions) {
  const builder = new TypeScriptBuilder()
  const { className } = options

  builder.addFileHeader({
    title: `${className} CQRS Queries Index`,
    description: "Barrel export for CQRS queries.",
    module: `${options.packageName}/server/cqrs/queries`
  })
  builder.addBlankLine()

  builder.addRaw(`export { Query, ${className}QueryBus } from "./base";
export type { QueryBusInterface } from "./base";`)

  return builder.toString()
}
