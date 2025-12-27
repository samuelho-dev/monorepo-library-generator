/**
 * TypeScript Code Builder
 *
 * Type-safe builder for generating TypeScript code programmatically.
 * Provides a fluent API for constructing TypeScript files with automatic
 * import management, proper formatting, and validation.
 *
 * Also includes Effect.ts pattern builders for:
 * - Data.TaggedError for domain errors
 * - Context.Tag for service definitions
 * - Layer for service implementations
 * - Schema.Struct for data models
 *
 * @module monorepo-library-generator/code-builder
 */

// ============================================================================
// TypeScript Builder Interfaces
// ============================================================================

export interface ImportSpec {
  from: string
  imports: Array<string | { name: string; alias: string }>
  isTypeOnly?: boolean
}

export interface FileHeaderOptions {
  title: string
  description: string
  module?: string
  since?: string
  see?: Array<string>
}

export interface ClassConfig {
  className: string
  extends?: string
  implements?: Array<string>
  exported?: boolean
  jsdoc?: string
  fields?: Array<FieldConfig>
  methods?: Array<MethodConfig>
  staticMethods?: Array<MethodConfig>
  staticProperties?: Array<PropertyConfig>
}

export interface FieldConfig {
  name: string
  type: string
  readonly?: boolean
  optional?: boolean
  visibility?: 'public' | 'private' | 'protected'
  jsdoc?: string
}

export interface MethodConfig {
  name: string
  params: Array<ParameterConfig>
  returnType?: string
  body: string
  isAsync?: boolean
  visibility?: 'public' | 'private' | 'protected'
  jsdoc?: string
}

export interface ParameterConfig {
  name: string
  type: string
  optional?: boolean
  defaultValue?: string
}

export interface PropertyConfig {
  name: string
  type: string
  value: string
  readonly?: boolean
  jsdoc?: string
}

export interface InterfaceConfig {
  name: string
  extends?: Array<string>
  exported?: boolean
  jsdoc?: string
  properties: Array<PropertySignature>
}

export interface PropertySignature {
  name: string
  type: string
  readonly?: boolean
  optional?: boolean
  jsdoc?: string
}

export interface TypeAliasConfig {
  name: string
  type: string
  exported?: boolean
  jsdoc?: string
  typeParams?: Array<string>
}

export interface FunctionConfig {
  name: string
  params: Array<ParameterConfig>
  returnType?: string
  body: string
  exported?: boolean
  isAsync?: boolean
  jsdoc?: string
  typeParams?: Array<string>
}

// ============================================================================
// Effect Pattern Interfaces
// ============================================================================

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
  layerType: 'sync' | 'effect' | 'scoped'
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

export interface RpcEndpoint {
  name: string
  inputSchema: string
  outputSchema: string
  errorType: string
}

// ============================================================================
// TypeScript Builder
// ============================================================================

/**
 * Type-safe builder for generating TypeScript code
 */
export class TypeScriptBuilder {
  private lines: Array<string> = []
  private imports: Map<string, Set<string>> = new Map()
  private typeImports: Map<string, Set<string>> = new Map()

  /**
   * Add a file header with JSDoc documentation
   */
  addFileHeader(options: FileHeaderOptions) {
    this.lines.push('/**')
    this.lines.push(` * ${options.title}`)
    this.lines.push(' *')
    this.lines.push(` * ${options.description}`)
    this.lines.push(' *')

    if (options.module) {
      this.lines.push(` * @module ${options.module}`)
    }

    if (options.since) {
      this.lines.push(` * @since ${options.since}`)
    }

    if (options.see && options.see.length > 0) {
      for (const see of options.see) {
        this.lines.push(` * @see ${see}`)
      }
    }

    this.lines.push(' */')

    return this
  }

  /**
   * Add import statements
   * Supports both simple imports ("Name") and aliased imports ({ name: "Name", alias: "Alias" })
   */
  addImports(imports: Array<ImportSpec>) {
    for (const { from, imports: names, isTypeOnly } of imports) {
      const targetMap = isTypeOnly ? this.typeImports : this.imports

      if (!targetMap.has(from)) {
        targetMap.set(from, new Set())
      }

      for (const nameSpec of names) {
        const importSet = targetMap.get(from)
        if (!importSet) {
          throw new Error(`Import set not found for ${from}`)
        }
        // Handle both string and { name, alias } formats
        if (typeof nameSpec === 'string') {
          importSet.add(nameSpec)
        } else {
          // Aliased import: store as "Name as Alias" for proper sorting by original name
          importSet.add(`${nameSpec.name} as ${nameSpec.alias}`)
        }
      }
    }

    return this
  }

  /**
   * Add a single import
   */
  addImport(from: string, name: string | { name: string; alias: string }, isTypeOnly = false) {
    return this.addImports([{ from, imports: [name], isTypeOnly }])
  }

  /**
   * Add a blank line
   */
  addBlankLine() {
    this.lines.push('')
    return this
  }

  /**
   * Add a single-line or multi-line comment
   */
  addComment(text: string, style: 'line' | 'section' | 'block' = 'line') {
    if (style === 'section') {
      this.lines.push(`// ${'='.repeat(76)}`)
      this.lines.push(`// ${text}`)
      this.lines.push(`// ${'='.repeat(76)}`)
    } else if (style === 'block') {
      this.lines.push('/**')
      this.lines.push(` * ${text}`)
      this.lines.push(' */')
    } else {
      this.lines.push(`// ${text}`)
    }

    return this
  }

  /**
   * Add a section comment (prominent separator)
   */
  addSectionComment(text: string) {
    return this.addComment(text, 'section')
  }

  /**
   * Add JSDoc comment
   */
  public addJSDoc(jsdoc: string) {
    this.lines.push('/**')
    const docLines = jsdoc.split('\n')
    for (const line of docLines) {
      this.lines.push(` * ${line}`.trimEnd())
    }
    this.lines.push(' */')
  }

  /**
   * Add a class declaration
   */
  addClass(config: ClassConfig) {
    if (config.jsdoc) {
      this.addJSDoc(config.jsdoc)
    }

    const exported = config.exported !== false ? 'export ' : ''
    const extendsClause = config.extends ? ` extends ${config.extends}` : ''
    const implementsClause =
      config.implements && config.implements.length > 0
        ? ` implements ${config.implements.join(', ')}`
        : ''

    this.lines.push(`${exported}class ${config.className}${extendsClause}${implementsClause} {`)

    // Add static properties
    if (config.staticProperties && config.staticProperties.length > 0) {
      for (const prop of config.staticProperties) {
        if (prop.jsdoc) {
          this.addJSDoc(prop.jsdoc)
        }
        const readonlyModifier = prop.readonly ? 'readonly ' : ''
        this.lines.push(`  static ${readonlyModifier}${prop.name}: ${prop.type} = ${prop.value}`)
      }
    }

    // Add fields
    if (config.fields && config.fields.length > 0) {
      for (const field of config.fields) {
        if (field.jsdoc) {
          this.addJSDoc(field.jsdoc)
        }
        const visibility = field.visibility || 'public'
        const readonlyModifier = field.readonly ? 'readonly ' : ''
        const optionalModifier = field.optional ? '?' : ''
        this.lines.push(
          `  ${visibility} ${readonlyModifier}${field.name}${optionalModifier}: ${field.type}`
        )
      }
    }

    // Add static methods
    if (config.staticMethods && config.staticMethods.length > 0) {
      for (const method of config.staticMethods) {
        this.addMethodToClass(method, true)
      }
    }

    // Add methods
    if (config.methods && config.methods.length > 0) {
      for (const method of config.methods) {
        this.addMethodToClass(method, false)
      }
    }

    this.lines.push('}')

    return this
  }

  /**
   * Add a method to a class
   */
  private addMethodToClass(method: MethodConfig, isStatic: boolean) {
    if (method.jsdoc) {
      this.addJSDoc(method.jsdoc)
    }

    const staticModifier = isStatic ? 'static ' : ''
    const asyncModifier = method.isAsync ? 'async ' : ''
    const visibility = method.visibility || 'public'
    const visibilityPrefix = visibility === 'public' ? '' : `${visibility} `

    const params = method.params
      .map((p) => {
        const optional = p.optional ? '?' : ''
        const defaultVal = p.defaultValue ? ` = ${p.defaultValue}` : ''
        return `${p.name}${optional}: ${p.type}${defaultVal}`
      })
      .join(', ')

    // Don't add explicit return type - let TypeScript infer it (linter requirement)

    this.lines.push(
      `  ${visibilityPrefix}${staticModifier}${asyncModifier}${method.name}(${params}) {`
    )

    // Add method body (preserve indentation)
    const bodyLines = method.body.trim().split('\n')
    for (const line of bodyLines) {
      if (line.trim()) {
        this.lines.push(`    ${line}`)
      } else {
        this.lines.push('')
      }
    }

    this.lines.push('  }')
  }

  /**
   * Add an interface declaration
   */
  addInterface(config: InterfaceConfig) {
    if (config.jsdoc) {
      this.addJSDoc(config.jsdoc)
    }

    const exported = config.exported !== false ? 'export ' : ''
    const extendsClause =
      config.extends && config.extends.length > 0 ? ` extends ${config.extends.join(', ')}` : ''

    this.lines.push(`${exported}interface ${config.name}${extendsClause} {`)

    for (let i = 0; i < config.properties.length; i++) {
      const prop = config.properties[i]
      if (!prop) continue

      if (prop.jsdoc) {
        this.lines.push('  /**')
        this.lines.push(`   * ${prop.jsdoc}`)
        this.lines.push('   */')
      }
      const readonlyModifier = prop.readonly ? 'readonly ' : ''
      const optionalModifier = prop.optional ? '?' : ''

      // No semicolon at end of interface properties (dprint/ESLint requirement)
      this.lines.push(`  ${readonlyModifier}${prop.name}${optionalModifier}: ${prop.type}`)
    }

    this.lines.push('}')

    return this
  }

  /**
   * Add a type alias
   */
  addTypeAlias(config: TypeAliasConfig) {
    if (config.jsdoc) {
      this.addJSDoc(config.jsdoc)
    }

    const exported = config.exported !== false ? 'export ' : ''
    const typeParams =
      config.typeParams && config.typeParams.length > 0 ? `<${config.typeParams.join(', ')}>` : ''

    this.lines.push(`${exported}type ${config.name}${typeParams} = ${config.type}`)

    return this
  }

  /**
   * Add a function declaration
   */
  addFunction(config: FunctionConfig) {
    if (config.jsdoc) {
      this.addJSDoc(config.jsdoc)
    }

    const exported = config.exported !== false ? 'export ' : ''
    const asyncModifier = config.isAsync ? 'async ' : ''
    const typeParams =
      config.typeParams && config.typeParams.length > 0 ? `<${config.typeParams.join(', ')}>` : ''

    const params = config.params
      .map((p) => {
        const optional = p.optional ? '?' : ''
        const defaultVal = p.defaultValue ? ` = ${p.defaultValue}` : ''
        return `${p.name}${optional}: ${p.type}${defaultVal}`
      })
      .join(', ')

    const returnType = config.returnType ? `: ${config.returnType}` : ''

    this.lines.push(
      `${exported}${asyncModifier}function ${config.name}${typeParams}(${params})${returnType} {`
    )

    // Add function body
    const bodyLines = config.body.trim().split('\n')
    for (const line of bodyLines) {
      if (line.trim()) {
        this.lines.push(`  ${line}`)
      } else {
        this.lines.push('')
      }
    }

    this.lines.push('}')

    return this
  }

  /**
   * Add a const declaration
   */
  addConst(name: string, value: string, type?: string, exported = true, jsdoc?: string) {
    if (jsdoc) {
      this.addJSDoc(jsdoc)
    }

    const exportKeyword = exported ? 'export ' : ''
    const typeAnnotation = type ? `: ${type}` : ''

    this.lines.push(`${exportKeyword}const ${name}${typeAnnotation} = ${value}`)

    return this
  }

  /**
   * Add raw TypeScript code
   */
  addRaw(code: string) {
    this.lines.push(code)
    return this
  }

  /**
   * Generate the final TypeScript code
   */
  toString() {
    const importLines: Array<string> = []

    // Import order priority for dprint/Effect compatibility:
    // 1. "@effect/*" packages (alphabetically)
    // 2. Other scoped packages "@scope/*" (alphabetically) - before effect
    // 3. "effect" package
    // 4. Other external packages (alphabetically)
    // 5. Relative imports "./" or "../" (last)
    const getImportPriority = (modulePath: string) => {
      if (modulePath.startsWith('./') || modulePath.startsWith('../')) return 5
      if (modulePath.startsWith('@effect/')) return 1
      if (modulePath.startsWith('@')) return 2
      if (modulePath === 'effect') return 3
      return 4
    }

    // Merge regular and type imports, then sort by module path
    // dprint/Effect requires imports sorted by path, not separated by type
    interface ImportEntry {
      from: string
      names: Set<string>
      isTypeOnly: boolean
    }

    const allImports: Array<ImportEntry> = []

    for (const [from, names] of this.imports.entries()) {
      allImports.push({ from, names, isTypeOnly: false })
    }

    for (const [from, names] of this.typeImports.entries()) {
      allImports.push({ from, names, isTypeOnly: true })
    }

    // Sort by module path priority, then alphabetically
    allImports.sort((a, b) => {
      const priorityA = getImportPriority(a.from)
      const priorityB = getImportPriority(b.from)
      if (priorityA !== priorityB) return priorityA - priorityB
      return a.from.localeCompare(b.from)
    })

    // Generate import lines (no trailing semicolons - ASI style)
    for (const { from, isTypeOnly, names } of allImports) {
      const sortedNames = Array.from(names).sort()
      const typeKeyword = isTypeOnly ? 'type ' : ''
      importLines.push(`import ${typeKeyword}{ ${sortedNames.join(', ')} } from "${from}"`)
    }

    // Combine imports and content with blank line separator
    if (importLines.length > 0) {
      return [...importLines, '', ...this.lines].join('\n')
    }

    return this.lines.join('\n')
  }

  /**
   * Clear all content and start fresh
   */
  clear() {
    this.lines = []
    this.imports.clear()
    this.typeImports.clear()
    return this
  }
}

// ============================================================================
// Effect Patterns Builder
// ============================================================================

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
 *     return new FooNotFoundError({ message: `Foo not found: ${fooId}`, fooId })
 *   }
 * }
 * ```
 */
export function createTaggedErrorPattern(config: TaggedErrorConfig) {
  // Build the type literal for the error fields
  const fieldTypes = config.fields
    .map((field) => {
      const readonlyModifier = field.readonly !== false ? 'readonly ' : ''
      const optionalModifier = field.optional ? '?' : ''
      return `  ${readonlyModifier}${field.name}${optionalModifier}: ${field.type}`
    })
    .join('\n')

  return {
    className: config.className,
    extends: `Data.TaggedError("${config.tagName}")<{\n${fieldTypes}\n}>`,
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
 *     readonly create: (data: CreateFooData) => Effect.Effect<Foo, FooError>
 *     readonly findById: (id: string) => Effect.Effect<Option.Option<Foo>>
 *   }
 * >() {}
 * ```
 */
export function createContextTagPattern(config: ContextTagConfig) {
  const methods = config.serviceInterface.methods
    .map((method) => {
      const params = method.params
        .map((p) => {
          const optional = p.optional ? '?' : ''
          return `${p.name}${optional}: ${p.type}`
        })
        .join(', ')

      return `    readonly ${method.name}: (${params}) => ${method.returnType}`
    })
    .join('\n')

  const jsdocComment = config.jsdoc ? `/**\n * ${config.jsdoc}\n */\n` : ''

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
 *   Effect.gen(function*() {
 *     const db = yield* DatabaseService;
 *     const cache = yield* CacheService;
 *
 *     return {
 *       create: (data) => Effect.gen(function*() {
 *         // implementation
 *       }),
 *       findById: (id) => Effect.gen(function*() {
 *         // implementation
 *       })
 *     };
 *   })
 * )
 * ```
 */
export function createLiveLayerPattern(config: LayerConfig) {
  const layerName = config.layerName || 'Live'
  const layerMethod = `Layer.${config.layerType}`

  const jsdocComment = config.jsdoc ? `  /**\n   * ${config.jsdoc}\n   */\n` : ''

  // Generate dependency yields if specified
  const dependencyYields =
    config.dependencies && config.dependencies.length > 0
      ? `${config.dependencies
          .map((dep) => `    const ${dep.charAt(0).toLowerCase() + dep.slice(1)} = yield* ${dep};`)
          .join('\n')}\n\n`
      : ''

  const implementation = config.implementation.trim()

  return `${jsdocComment}  static readonly ${layerName} = ${layerMethod}(
    ${config.serviceName},
    Effect.gen(function*() {
${dependencyYields}${implementation
    .split('\n')
    .map((line) => `      ${line}`)
    .join('\n')}
    })
  )`
}

/**
 * Create a test layer as a static property
 *
 * Follows Pattern B (preferred):
 * ```typescript
 * static readonly Test = Layer.succeed(FooService, {
 *   create: () => Effect.succeed(mockFoo),
 *   findById: () => Effect.succeed(Option.none())
 * })
 * ```
 */
export function createTestLayerPattern(serviceName: string, mockImplementation: string) {
  return `  static readonly Test = Layer.succeed(${serviceName}, ${mockImplementation})`
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
 * })
 * ```
 */
export function createSchemaStructPattern(config: SchemaStructConfig) {
  const exported = config.exported !== false ? 'export ' : ''

  const fields = config.fields
    .map((field) => {
      const schema = field.optional ? `Schema.optional(${field.schema})` : field.schema
      const jsdoc = field.jsdoc ? `  /** ${field.jsdoc} */\n` : ''
      return `${jsdoc}  ${field.name}: ${schema}`
    })
    .join(',\n')

  const jsdocComment = config.jsdoc ? `/**\n * ${config.jsdoc}\n */\n` : ''

  return `${jsdocComment}${exported}const ${config.name} = Schema.Struct({
${fields}
})`
}

/**
 * Create a Schema type inference
 *
 * ```typescript
 * export type Foo = Schema.Schema.Type<typeof FooSchema>
 * ```
 */
export function createSchemaTypePattern(typeName: string, schemaName: string, exported = true) {
  const exportKeyword = exported ? 'export ' : ''
  return `${exportKeyword}type ${typeName} = Schema.Schema.Type<typeof ${schemaName}>`
}

/**
 * Create a Schema encoding type inference
 *
 * ```typescript
 * export type FooEncoded = Schema.Schema.Encoded<typeof FooSchema>
 * ```
 */
export function createSchemaEncodedTypePattern(
  typeName: string,
  schemaName: string,
  exported = true
) {
  const exportKeyword = exported ? 'export ' : ''
  return `${exportKeyword}type ${typeName} = Schema.Schema.Encoded<typeof ${schemaName}>`
}

/**
 * Generate a service implementation stub
 */
export function createServiceImplementationPattern(methods: Array<ServiceMethod>) {
  const implementations = methods
    .map((method) => {
      const params = method.params.map((p) => p.name).join(', ')
      return `      ${method.name}: (${params}) => Effect.gen(function*() {
        // TODO: Implement ${method.name}
        yield* Effect.logDebug(\`${method.name} called with: \${JSON.stringify({ ${params} })}\`)
        return yield* Effect.fail(new Error("Not implemented"))
      })`
    })
    .join(',\n')

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
 * })
 * export type CreateFooCommand = Schema.Schema.Type<typeof CreateFooCommand>
 * ```
 */
export function createCommandPattern(commandName: string, dataSchema: string, jsdoc?: string) {
  const tag = commandName.replace('Command', '')

  const jsdocComment = jsdoc ? `/**\n * ${jsdoc}\n */\n` : ''

  return `${jsdocComment}export const ${commandName}Schema = Schema.Struct({
  _tag: Schema.Literal("${tag}"),
  data: ${dataSchema}
})

export type ${commandName} = Schema.Schema.Type<typeof ${commandName}Schema>`
}

/**
 * Create CQRS query pattern
 */
export function createQueryPattern(queryName: string, paramsSchema?: string, jsdoc?: string) {
  const tag = queryName.replace('Query', '')

  const jsdocComment = jsdoc ? `/**\n * ${jsdoc}\n */\n` : ''

  const fields = paramsSchema
    ? `_tag: Schema.Literal("${tag}"),\n  params: ${paramsSchema}`
    : `_tag: Schema.Literal("${tag}")`

  return `${jsdocComment}export const ${queryName}Schema = Schema.Struct({
  ${fields}
})

export type ${queryName} = Schema.Schema.Type<typeof ${queryName}Schema>`
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
 * })
 * ```
 */
export function createRpcSchemaPattern(
  rpcName: string,
  endpoints: Array<RpcEndpoint>,
  jsdoc?: string
) {
  const endpointDefs = endpoints
    .map((endpoint) => {
      return `  ${endpoint.name}: {
    input: ${endpoint.inputSchema},
    output: ${endpoint.outputSchema},
    error: ${endpoint.errorType}
  }`
    })
    .join(',\n')

  const jsdocComment = jsdoc ? `/**\n * ${jsdoc}\n */\n` : ''

  return `${jsdocComment}export const ${rpcName} = RpcSchema.make({
${endpointDefs}
})`
}

