/**
 * Effect AST Builders
 *
 * ts-morph based AST builders for Effect-TS patterns.
 * Generates type-safe code for Context.Tag, Data.TaggedError, Schema, etc.
 *
 * @module monorepo-library-generator/templates/ast/effect-builders
 */

import type { ClassDeclaration, SourceFile } from 'ts-morph'
import { VariableDeclarationKind } from 'ts-morph'
import type {
  ContextTagConfig,
  LayerConfig,
  MethodSignature,
  SchemaConfig,
  SchemaFieldDefinition,
  TaggedErrorConfig
} from '../core/types'

// ============================================================================
// Context.Tag Builder
// ============================================================================

/**
 * Add a Context.Tag class to source file
 *
 * Generates Effect 3.0+ style Context.Tag with inline interface.
 *
 * @example
 * ```typescript
 * class UserRepository extends Context.Tag("UserRepository")<
 *   UserRepository,
 *   {
 *     readonly findById: (id: string) => Effect.Effect<User, UserNotFoundError>
 *     readonly create: (data: CreateUserInput) => Effect.Effect<User, ValidationError>
 *   }
 * >() {
 *   static Live = Layer.succeed(UserRepository, { ... })
 *   static Test = Layer.succeed(UserRepository, { ... })
 * }
 * ```
 */
export function addContextTagClass(sourceFile: SourceFile, config: ContextTagConfig) {
  // Build interface body
  const interfaceBody = config.methods.map((m) => formatMethodSignature(m)).join('\n    ')

  // Build extends clause
  const extendsClause = `Context.Tag("${config.tagIdentifier}")<
  ${config.serviceName},
  {
    ${interfaceBody}
  }
>()`

  // Create class
  const classDecl = sourceFile.addClass({
    name: config.serviceName,
    isExported: true,
    extends: extendsClause
  })

  // Add JSDoc if provided
  if (config.jsdoc) {
    classDecl.addJsDoc({
      description: config.jsdoc
    })
  }

  // Add static layers
  if (config.staticLayers) {
    for (const layer of config.staticLayers) {
      addStaticLayer(classDecl, layer)
    }
  }

  return classDecl
}

/**
 * Format a method signature for interface body
 */
function formatMethodSignature(method: MethodSignature) {
  const params = method.params.map((p) => `${p.name}${p.optional ? '?' : ''}: ${p.type}`).join(', ')

  const jsdocComment = method.jsdoc ? `/** ${method.jsdoc} */\n    ` : ''

  return `${jsdocComment}readonly ${method.name}: (${params}) => ${method.returnType}`
}

/**
 * Add a static layer to a class
 */
function addStaticLayer(classDecl: ClassDeclaration, layer: LayerConfig) {
  const hasEscape = layer.implementation.includes('${')
  const implementation = hasEscape ? layer.implementation : layer.implementation

  classDecl.addProperty({
    name: layer.name,
    isStatic: true,
    initializer: implementation
  })
}

// ============================================================================
// Data.TaggedError Builder
// ============================================================================

/**
 * Add a Data.TaggedError class to source file
 *
 * Generates Effect-style tagged error with readonly fields.
 *
 * @example
 * ```typescript
 * export class UserNotFoundError extends Data.TaggedError("UserNotFoundError")<{
 *   readonly id: string
 *   readonly message: string
 * }>() {}
 * ```
 */
export function addTaggedErrorClass(sourceFile: SourceFile, config: TaggedErrorConfig) {
  // Build fields type
  const fieldsType = config.fields
    .map((f) => `readonly ${f.name}${f.optional ? '?' : ''}: ${f.type}`)
    .join('\n  ')

  // Build extends clause
  const extendsClause = `Data.TaggedError("${config.tagName}")<{
  ${fieldsType}
}>()`

  // Create class
  const classDecl = sourceFile.addClass({
    name: config.className,
    isExported: true,
    extends: extendsClause
  })

  // Add JSDoc if provided
  if (config.jsdoc) {
    classDecl.addJsDoc({
      description: config.jsdoc
    })
  }

  return classDecl
}

// ============================================================================
// Schema Builders
// ============================================================================

/**
 * Add a Schema definition to source file
 *
 * @example
 * ```typescript
 * export const UserSchema = Schema.Struct({
 *   id: Schema.String,
 *   name: Schema.String,
 *   email: Schema.String.pipe(Schema.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/))
 * })
 * ```
 */
export function addSchemaDefinition(sourceFile: SourceFile, config: SchemaConfig) {
  let initializer: string

  switch (config.schemaType) {
    case 'Struct':
      initializer = buildStructSchema(config)
      break
    case 'Class':
      initializer = buildClassSchema(config)
      break
    case 'String':
      initializer = buildBrandedSchema('String', config)
      break
    case 'Number':
      initializer = buildBrandedSchema('Number', config)
      break
    case 'Boolean':
      initializer = 'Schema.Boolean'
      break
    case 'Union':
      initializer = buildUnionSchema(config)
      break
    case 'TaggedUnion':
      initializer = buildTaggedUnionSchema(config)
      break
    default:
      initializer = 'Schema.Unknown'
  }

  const statement = sourceFile.addVariableStatement({
    isExported: true,
    declarationKind: VariableDeclarationKind.Const,
    declarations: [
      {
        name: config.name,
        initializer
      }
    ]
  })

  // Add JSDoc if provided
  if (config.jsdoc) {
    statement.addJsDoc({
      description: config.jsdoc
    })
  }
}

function buildStructSchema(config: SchemaConfig) {
  if (!config.fields || config.fields.length === 0) {
    return 'Schema.Struct({})'
  }

  const fields = config.fields.map((f) => formatSchemaField(f)).join(',\n  ')

  return `Schema.Struct({
  ${fields}
})`
}

function buildClassSchema(config: SchemaConfig) {
  if (!config.fields || config.fields.length === 0) {
    return `Schema.Class<${config.name}>("${config.name}")({})`
  }

  const fields = config.fields.map((f) => formatSchemaField(f)).join(',\n  ')

  return `Schema.Class<${config.name}>("${config.name}")({
  ${fields}
})`
}

function buildBrandedSchema(baseType: string, config: SchemaConfig) {
  let schema = `Schema.${baseType}`

  if (config.brand) {
    schema = `${schema}.pipe(Schema.brand("${config.brand}"))`
  }

  if (config.annotations) {
    const annotationEntries = Object.entries(config.annotations)
      .map(([key, value]) => `${key}: "${value}"`)
      .join(', ')
    schema = `${schema}.pipe(Schema.annotations({ ${annotationEntries} }))`
  }

  return schema
}

function buildUnionSchema(config: SchemaConfig) {
  if (!config.fields || config.fields.length === 0) {
    return 'Schema.Never'
  }

  const members = config.fields.map((f) => f.schema).join(', ')
  return `Schema.Union(${members})`
}

function buildTaggedUnionSchema(config: SchemaConfig) {
  if (!config.fields || config.fields.length === 0) {
    return 'Schema.Never'
  }

  const members = config.fields.map((f) => f.schema).join(', ')
  return `Schema.Union(${members})`
}

function formatSchemaField(field: SchemaFieldDefinition) {
  const schema = field.optional ? `Schema.optional(${field.schema})` : field.schema

  return `${field.name}: ${schema}`
}

// ============================================================================
// Import Builders
// ============================================================================

/**
 * Add Effect imports to source file
 */
export function addEffectImports(sourceFile: SourceFile, items: ReadonlyArray<string>) {
  const existingImport = sourceFile.getImportDeclaration('effect')

  if (existingImport) {
    // Add to existing import
    const namedImports = existingImport.getNamedImports()
    const existingNames = new Set(namedImports.map((n) => n.getName()))

    for (const item of items) {
      if (!existingNames.has(item)) {
        existingImport.addNamedImport(item)
      }
    }
  } else {
    // Create new import
    sourceFile.addImportDeclaration({
      moduleSpecifier: 'effect',
      namedImports: [...items]
    })
  }
}

/**
 * Add a type-only import to source file
 */
export function addTypeImport(sourceFile: SourceFile, from: string, items: ReadonlyArray<string>) {
  sourceFile.addImportDeclaration({
    moduleSpecifier: from,
    namedImports: items.map((name) => ({ name })),
    isTypeOnly: true
  })
}

/**
 * Add a regular import to source file
 */
export function addImport(sourceFile: SourceFile, from: string, items: ReadonlyArray<string>) {
  sourceFile.addImportDeclaration({
    moduleSpecifier: from,
    namedImports: [...items]
  })
}

// ============================================================================
// Utility Builders
// ============================================================================

/**
 * Add a section comment to source file
 */
export function addSectionComment(sourceFile: SourceFile, title: string) {
  const comment = `// ============================================================================
// ${title}
// ============================================================================`

  sourceFile.addStatements(comment)
}

/**
 * Add a JSDoc comment block
 */
export function addJsDocComment(sourceFile: SourceFile, description: string) {
  sourceFile.addStatements(`/**\n * ${description}\n */`)
}

/**
 * Add a const export with type annotation
 */
export function addConstExport(
  sourceFile: SourceFile,
  name: string,
  type: string | undefined,
  value: string,
  jsdoc?: string
) {
  const statement = sourceFile.addVariableStatement({
    isExported: true,
    declarationKind: VariableDeclarationKind.Const,
    declarations: [
      {
        name,
        type,
        initializer: value
      }
    ]
  })

  if (jsdoc) {
    statement.addJsDoc({ description: jsdoc })
  }
}

/**
 * Add a type alias export
 */
export function addTypeAlias(sourceFile: SourceFile, name: string, type: string, jsdoc?: string) {
  const typeAlias = sourceFile.addTypeAlias({
    name,
    isExported: true,
    type
  })

  if (jsdoc) {
    typeAlias.addJsDoc({ description: jsdoc })
  }
}
