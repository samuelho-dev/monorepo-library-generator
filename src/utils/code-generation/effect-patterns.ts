/**
 * Effect Patterns Builder
 *
 * Provides type-safe builders for common Effect.ts patterns including:
 * - Data.TaggedError for domain errors
 * - Context.Tag for service definitions
 * - Layer for service implementations
 * - Schema.Struct for data models
 *
 * All patterns follow the conventions documented in EFFECT_PATTERNS.md
 *
 * @module monorepo-library-generator/effect-patterns
 */

import type { ClassConfig, MethodConfig, ParameterConfig } from "./typescript-builder.js"

export interface TaggedErrorField {
  name: string
  type: string
  readonly?: boolean
  optional?: boolean
}

export interface TaggedErrorConfig {
  className: string
  tagName: string
  fields: Array<TaggedErrorField>
  staticMethods?: Array<MethodConfig>
  jsdoc?: string
}

export interface ContextTagConfig {
  tagName: string
  serviceName: string
  serviceInterface: ServiceInterfaceConfig
  jsdoc?: string
}

export interface ServiceInterfaceConfig {
  methods: Array<ServiceMethod>
}

export interface ServiceMethod {
  name: string
  params: Array<ParameterConfig>
  returnType: string
  jsdoc?: string
}

export interface LayerConfig {
  serviceName: string
  layerName?: string
  implementation: string
  dependencies?: Array<string>
  layerType: "sync" | "effect" | "scoped"
  jsdoc?: string
}

export interface SchemaStructConfig {
  name: string
  fields: Array<SchemaField>
  exported?: boolean
  jsdoc?: string
}

export interface SchemaField {
  name: string
  schema: string
  optional?: boolean
  jsdoc?: string
}

/**
 * Builder for Effect.ts-specific code patterns
 */
export class EffectPatterns {
  /**
   * Create a Data.TaggedError class configuration
   *
   * Follows the pattern:
   * ```typescript
   * export class FooNotFoundError extends Data.TaggedError("FooNotFoundError")<{
   *   readonly message: string;
   *   readonly fooId: string;
   * }> {
   *   static create(fooId: string) {
   *     return new FooNotFoundError({ message: `Foo not found: ${fooId}`, fooId });
   *   }
   * }
   * ```
   */
  static createTaggedError(config: TaggedErrorConfig): ClassConfig {
    // Build the type literal for the error fields
    const fieldTypes = config.fields.map((field) => {
      const readonlyModifier = field.readonly !== false ? "readonly " : ""
      const optionalModifier = field.optional ? "?" : ""
      return `    ${readonlyModifier}${field.name}${optionalModifier}: ${field.type};`
    }).join("\n")

    return {
      className: config.className,
      extends: `Data.TaggedError("${config.tagName}")<{\n${fieldTypes}\n  }>`,
      exported: true,
      ...(config.jsdoc !== undefined && { jsdoc: config.jsdoc }),
      staticMethods: config.staticMethods || []
    }
  }

  /**
   * Create a Context.Tag service definition with inline interface
   *
   * Follows the pattern (PREFERRED):
   * ```typescript
   * export class FooService extends Context.Tag("FooService")<
   *   FooService,
   *   {
   *     readonly create: (data: CreateFooData) => Effect.Effect<Foo, FooError>;
   *     readonly findById: (id: string) => Effect.Effect<Option.Option<Foo>>;
   *   }
   * >() {}
   * ```
   */
  static createContextTag(config: ContextTagConfig): string {
    const methods = config.serviceInterface.methods.map((method) => {
      const params = method.params.map((p) => {
        const optional = p.optional ? "?" : ""
        return `${p.name}${optional}: ${p.type}`
      }).join(", ")

      return `    readonly ${method.name}: (${params}) => ${method.returnType};`
    }).join("\n")

    const jsdocComment = config.jsdoc
      ? `/**\n * ${config.jsdoc}\n */\n`
      : ""

    return `${jsdocComment}export class ${config.serviceName} extends Context.Tag("${config.tagName}")<
  ${config.serviceName},
  {
${methods}
  }
>() {}`
  }

  /**
   * Create a static Live layer implementation
   *
   * Follows the pattern:
   * ```typescript
   * static readonly Live = Layer.effect(
   *   FooService,
   *   Effect.gen(function* () {
   *     const db = yield* DatabaseService;
   *     const cache = yield* CacheService;
   *
   *     return {
   *       create: (data) => Effect.gen(function* () {
   *         // implementation
   *       }),
   *       findById: (id) => Effect.gen(function* () {
   *         // implementation
   *       })
   *     };
   *   })
   * );
   * ```
   */
  static createLiveLayer(config: LayerConfig): string {
    const layerName = config.layerName || "Live"
    const layerMethod = `Layer.${config.layerType}`

    const jsdocComment = config.jsdoc
      ? `  /**\n   * ${config.jsdoc}\n   */\n`
      : ""

    // Generate dependency yields if specified
    const dependencyYields = config.dependencies && config.dependencies.length > 0
      ? config.dependencies.map((dep) => `    const ${dep.charAt(0).toLowerCase() + dep.slice(1)} = yield* ${dep};`)
        .join("\n") + "\n\n"
      : ""

    const implementation = config.implementation.trim()

    return `${jsdocComment}  static readonly ${layerName} = ${layerMethod}(
    ${config.serviceName},
    Effect.gen(function* () {
${dependencyYields}${implementation.split("\n").map((line) => `      ${line}`).join("\n")}
    })
  );`
  }

  /**
   * Create a test layer as a static property
   *
   * Follows Pattern B (preferred):
   * ```typescript
   * static readonly Test = Layer.succeed(FooService, {
   *   create: () => Effect.succeed(mockFoo),
   *   findById: () => Effect.succeed(Option.none())
   * });
   * ```
   */
  static createTestLayer(serviceName: string, mockImplementation: string): string {
    return `  static readonly Test = Layer.succeed(${serviceName}, ${mockImplementation});`
  }

  /**
   * Create a Schema.Struct definition
   *
   * Follows the pattern:
   * ```typescript
   * export const FooSchema = Schema.Struct({
   *   id: Schema.String,
   *   name: Schema.String,
   *   createdAt: Schema.DateTimeUtc,
   *   metadata: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Unknown }))
   * });
   * ```
   */
  static createSchemaStruct(config: SchemaStructConfig): string {
    const exported = config.exported !== false ? "export " : ""

    const fields = config.fields.map((field) => {
      const schema = field.optional ? `Schema.optional(${field.schema})` : field.schema
      const jsdoc = field.jsdoc ? `  /** ${field.jsdoc} */\n` : ""
      return `${jsdoc}  ${field.name}: ${schema}`
    }).join(",\n")

    const jsdocComment = config.jsdoc
      ? `/**\n * ${config.jsdoc}\n */\n`
      : ""

    return `${jsdocComment}${exported}const ${config.name} = Schema.Struct({
${fields}
});`
  }

  /**
   * Create a Schema type inference
   *
   * ```typescript
   * export type Foo = Schema.Schema.Type<typeof FooSchema>;
   * ```
   */
  static createSchemaType(typeName: string, schemaName: string, exported = true): string {
    const exportKeyword = exported ? "export " : ""
    return `${exportKeyword}type ${typeName} = Schema.Schema.Type<typeof ${schemaName}>;`
  }

  /**
   * Create a Schema encoding type inference
   *
   * ```typescript
   * export type FooEncoded = Schema.Schema.Encoded<typeof FooSchema>;
   * ```
   */
  static createSchemaEncodedType(typeName: string, schemaName: string, exported = true): string {
    const exportKeyword = exported ? "export " : ""
    return `${exportKeyword}type ${typeName} = Schema.Schema.Encoded<typeof ${schemaName}>;`
  }

  /**
   * Generate a service implementation stub
   */
  static createServiceImplementation(methods: Array<ServiceMethod>): string {
    const implementations = methods.map((method) => {
      const params = method.params.map((p) => p.name).join(", ")
      return `      ${method.name}: (${params}) => Effect.gen(function* () {
        // TODO: Implement ${method.name}
        yield* Effect.logDebug(\`${method.name} called with: \${JSON.stringify({ ${params} })}\`);
        return yield* Effect.fail(new Error("Not implemented"));
      })`
    }).join(",\n")

    return `return {
${implementations}
    };`
  }

  /**
   * Create CQRS command pattern
   *
   * ```typescript
   * export const CreateFooCommand = Schema.Struct({
   *   _tag: Schema.Literal("CreateFoo"),
   *   data: FooDataSchema
   * });
   * export type CreateFooCommand = Schema.Schema.Type<typeof CreateFooCommand>;
   * ```
   */
  static createCommand(commandName: string, dataSchema: string, jsdoc?: string): string {
    const tag = commandName.replace("Command", "")

    const jsdocComment = jsdoc
      ? `/**\n * ${jsdoc}\n */\n`
      : ""

    return `${jsdocComment}export const ${commandName}Schema = Schema.Struct({
  _tag: Schema.Literal("${tag}"),
  data: ${dataSchema}
});

export type ${commandName} = Schema.Schema.Type<typeof ${commandName}Schema>;`
  }

  /**
   * Create CQRS query pattern
   */
  static createQuery(queryName: string, paramsSchema?: string, jsdoc?: string): string {
    const tag = queryName.replace("Query", "")

    const jsdocComment = jsdoc
      ? `/**\n * ${jsdoc}\n */\n`
      : ""

    const fields = paramsSchema
      ? `_tag: Schema.Literal("${tag}"),\n  params: ${paramsSchema}`
      : `_tag: Schema.Literal("${tag}")`

    return `${jsdocComment}export const ${queryName}Schema = Schema.Struct({
  ${fields}
});

export type ${queryName} = Schema.Schema.Type<typeof ${queryName}Schema>;`
  }

  /**
   * Create an RPC schema definition
   *
   * ```typescript
   * export const FooRpc = RpcSchema.make({
   *   create: {
   *     input: CreateFooSchema,
   *     output: FooSchema,
   *     error: FooDomainError
   *   }
   * });
   * ```
   */
  static createRpcSchema(rpcName: string, endpoints: Array<RpcEndpoint>, jsdoc?: string): string {
    const endpointDefs = endpoints.map((endpoint) => {
      return `  ${endpoint.name}: {
    input: ${endpoint.inputSchema},
    output: ${endpoint.outputSchema},
    error: ${endpoint.errorType}
  }`
    }).join(",\n")

    const jsdocComment = jsdoc
      ? `/**\n * ${jsdoc}\n */\n`
      : ""

    return `${jsdocComment}export const ${rpcName} = RpcSchema.make({
${endpointDefs}
});`
  }
}

export interface RpcEndpoint {
  name: string
  inputSchema: string
  outputSchema: string
  errorType: string
}
