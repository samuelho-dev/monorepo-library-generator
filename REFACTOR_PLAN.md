# Generator Optimization Plan: Type-Safe Templates with GritQL Validation

## Executive Summary

Comprehensive refactoring of `src/generators/` to achieve:
1. **Type-safe code generation** using AST-based patterns for Effect constructs
2. **Declarative template definitions** that are testable and composable
3. **GritQL validation layer** for pattern enforcement and quality gates
4. **Full observability** with OpenTelemetry spans/metrics across CLI, TUI, and MCP
5. **Maintained composability** leveraging existing unified infrastructure

**Estimated Effort**: 7-9 weeks
**Risk Level**: Medium (mitigated by incremental migration)

---

## Specialist Agent Insights (Integrated)

### Context Management Strategy (context-manager agent)

**Token Budget Per Week**:
- Active context: ~50k tokens/week
- Reserve pool: ~150k tokens for complex phases
- Episodic memory: Checkpoint summaries at phase boundaries
- Semantic memory: Pattern library grows as fragments are added

**Phase Boundaries** (context isolation):
1. Weeks 1-2: Infrastructure (observability + template core)
2. Weeks 3-4: Contract templates (proof of concept)
3. Weeks 5-6: Feature/Data-Access/Infra/Provider migration
4. Weeks 7-9: Integration, testing, GritQL validation

### Hybrid AST Approach (effect-architecture-specialist agent)

**Key Recommendation**: Use **hybrid generation**:
- **AST (ts-morph)** for structural patterns: imports, class declarations, interface shapes
- **Strings (addRaw)** for Effect.gen bodies: The `yield*` chains with complex logic

**Why Hybrid?**:
```typescript
// AST-GENERATED (type-safe, validated at compile time)
sourceFile.addClass({
  name: "UserService",
  extends: "Context.Tag(\"UserService\")<UserService, UserServiceInterface>()"
})

// STRING-GENERATED (Effect.gen bodies - complex control flow)
builder.addRaw(`
  Effect.gen(function*() {
    const user = yield* UserRepository.findById(id)
    if (Option.isNone(user)) {
      return yield* Effect.fail(new UserNotFoundError({ id }))
    }
    return user.value
  })
`)
```

**Expected Reduction**: ~70% fewer addRaw() calls (from 1,928 to ~580)

### Service Layer Design (backend-architect agent)

**Three Core Effect Services**:

```typescript
// 1. TemplateCompiler Service
class TemplateCompiler extends Context.Tag("TemplateCompiler")<
  TemplateCompiler,
  {
    compile: (def: TemplateDefinition, ctx: TemplateContext) => Effect.Effect<string, CompilationError>
    validate: (code: string) => Effect.Effect<ValidationResult, ValidationError>
  }
>() {
  static Live = Layer.succeed(TemplateCompiler, new TemplateCompilerImpl())
  static Test = Layer.succeed(TemplateCompiler, new MockTemplateCompiler())
}

// 2. FragmentLibrary Service
class FragmentLibrary extends Context.Tag("FragmentLibrary")<
  FragmentLibrary,
  {
    get: (id: FragmentId) => Effect.Effect<FragmentDefinition, FragmentNotFoundError>
    register: (fragment: FragmentDefinition) => Effect.Effect<void, FragmentRegistrationError>
    interpolate: (fragment: FragmentDefinition, params: Record<string, unknown>) => Effect.Effect<string, InterpolationError>
  }
>() {
  static Live = Layer.effect(FragmentLibrary, Effect.gen(function*() {
    const registry = new Map<FragmentId, FragmentDefinition>()
    // Load built-in fragments
    return { get, register, interpolate }
  }))
}

// 3. TsMorphProjectCache Service (performance optimization)
class TsMorphProjectCache extends Context.Tag("TsMorphProjectCache")<
  TsMorphProjectCache,
  {
    getOrCreate: (key: string) => Effect.Effect<Project, never>
    invalidate: (key: string) => Effect.Effect<void, never>
    getStats: () => Effect.Effect<CacheStats, never>
  }
>() {
  static Live = Layer.effect(TsMorphProjectCache, Effect.gen(function*() {
    const cache = new Map<string, Project>()
    const stats = { hits: 0, misses: 0 }
    // ... implementation with LRU eviction
  }))
}
```

**Caching Strategy**:
- ts-morph Project instances: Cache per template type (expensive to create)
- SourceFile reuse: Reset and reuse rather than recreate
- Fragment compilation: Memoize interpolated fragments

### GritQL Pattern Recommendations

**High-Value Patterns** (from effect-architecture-specialist):
```gritql
// 1. Enforce yield* not yield
pattern effect_gen_yield_star() {
  `Effect.gen(function*() { $body })` where {
    $body <: contains `yield $expr` where {
      !$expr <: `* $inner`  // Missing star
    }
  }
}

// 2. Layer composition order (Live before Test before Dev)
pattern layer_order() {
  `class $name extends Context.Tag($tag)<$n, $i>() {
    static Live = $live
    static Test = $test
    static Dev = $dev
    static Auto = $auto
  }`
}

// 3. Tagged error readonly enforcement
pattern tagged_error_readonly() {
  `class $name extends Data.TaggedError($tag)<{ $fields }>()` where {
    $fields <: every `readonly $f: $t`
  }
}
```

---

## Why GritQL + AST (Not GritQL Alone)

**GritQL is for transformation, not generation.** After extensive research:

| Task | GritQL | ts-morph/AST | TypeScriptBuilder |
|------|--------|--------------|-------------------|
| Generate from config | ❌ | ✓ | ✓✓✓ |
| Validate patterns | ✓✓✓ | ✓ | ❌ |
| Bulk refactoring | ✓✓✓ | ✓ | ❌ |
| Type-safe structure | ❌ | ✓✓✓ | ❌ |

**Optimal Architecture**:
- **TypeScriptBuilder** → Generation engine (keep existing)
- **ts-morph/AST** → Type-safe Effect pattern generation (new)
- **GritQL** → Post-generation validation + pattern enforcement (new)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Interfaces (Unchanged)                    │
│         CLI (index.ts) | TUI (ink/) | MCP (server.ts)       │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│              Unified Infrastructure (Enhanced)               │
│   createExecutor() + Effect.withSpan() observability        │
│   computeMetadata() | formatOutput() | validation           │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                 NEW: Template Engine Layer                   │
│   ┌───────────────┐  ┌───────────────┐  ┌───────────────┐  │
│   │ TemplateRegistry│  │ ASTBuilders  │  │ FragmentLib   │  │
│   │ (definitions)  │  │ (ts-morph)   │  │ (Effect ptns) │  │
│   └───────────────┘  └───────────────┘  └───────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                Core Generators (Refactored)                  │
│   contract.ts | feature.ts | data-access.ts | infra.ts     │
│   Uses TemplateEngine instead of direct addRaw()            │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│              FileSystemAdapter (Unchanged)                   │
│           Nx Tree OR Effect FileSystem                       │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│              NEW: GritQL Validation Layer                    │
│   ┌───────────────┐  ┌───────────────┐  ┌───────────────┐  │
│   │ Effect Patterns│  │ Monorepo     │  │ Biome        │  │
│   │ (yield*, Layer)│  │ Conventions  │  │ Integration  │  │
│   └───────────────┘  └───────────────┘  └───────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Observability Foundation (Week 1)

### 1.1 Add OpenTelemetry to Generator Execution

**File**: `src/infrastructure/execution.ts`

Wrap `createExecutor` with spans:

```typescript
export function createExecutor<TInput, TCoreOptions>(
  libraryType: LibraryType,
  coreGenerator: CoreGeneratorFn<TCoreOptions>,
  inputToOptions: InputToOptionsFn<TInput, TCoreOptions>
) {
  return {
    execute: (validated: ExtendedInput<TInput>) =>
      Effect.gen(function*() {
        const context = yield* createWorkspaceContext(validated.workspaceRoot, interfaceType)
        const adapter = yield* createAdapterFromContext(context, validated.__nxTree)
        const metadata = computeMetadata(metadataInput, context)

        // Compute options
        const coreOptions = inputToOptions(validated, metadata)

        // Generate with spans
        const infraResult = yield* generateLibraryInfrastructure(adapter, infraOptions)
        const result = yield* coreGenerator(adapter, coreOptions)

        return result
      }).pipe(
        Effect.withSpan(`generator.${libraryType}`, {
          attributes: {
            "generator.library_type": libraryType,
            "generator.interface": validated.__interfaceType,
            "generator.library_name": validated.name
          }
        })
      )
  }
}
```

### 1.2 Add Metrics Collection

**New File**: `src/infrastructure/metrics.ts`

```typescript
import { Metric } from "effect"

export const generatorDuration = Metric.histogram(
  "generator.duration_ms",
  Metric.Boundaries.exponential({ start: 10, factor: 2, count: 10 })
)

export const filesGenerated = Metric.counter("generator.files_generated")
export const generatorErrors = Metric.counter("generator.errors")
```

### 1.3 Span Integration per Template

Add spans to each template generation call:

```typescript
// In core generators
const serviceFile = yield* generateServiceTemplate(options).pipe(
  Effect.withSpan("template.service")
)
```

---

## Phase 2: Template Engine Core (Week 2)

### 2.1 Create Template Definition Types

**New File**: `src/templates/core/types.ts`

```typescript
export interface TemplateDefinition {
  id: string
  meta: TemplateMeta
  imports: ImportDefinition[]
  sections: SectionDefinition[]
  conditionals?: Record<string, ConditionalContent>
}

export interface TemplateMeta {
  title: string      // Supports {className} interpolation
  description: string
  module?: string
}

export interface ImportDefinition {
  from: string
  items: string[]
  isTypeOnly?: boolean
  condition?: string
}

export type ContentDefinition =
  | { type: "raw"; value: string }
  | { type: "contextTag"; config: ContextTagConfig }
  | { type: "taggedError"; config: TaggedErrorConfig }
  | { type: "schema"; config: SchemaConfig }
  | { type: "rpcDefinition"; config: RpcConfig }
  | { type: "fragment"; ref: string; params?: Record<string, unknown> }

export interface SectionDefinition {
  title?: string
  condition?: string
  content: ContentDefinition | ContentDefinition[]
}
```

### 2.2 Create Template Compiler

**New File**: `src/templates/core/compiler.ts`

```typescript
import { Project, SourceFile } from "ts-morph"
import type { TemplateDefinition, TemplateContext } from "./types"

export class TemplateCompiler {
  private project: Project

  constructor() {
    this.project = new Project({ useInMemoryFileSystem: true })
  }

  compile(template: TemplateDefinition, context: TemplateContext): Effect.Effect<string, CompilationError> {
    return Effect.gen(function*() {
      const sourceFile = this.project.createSourceFile(
        `${template.id}.ts`,
        "",
        { overwrite: true }
      )

      // Process imports
      yield* this.processImports(sourceFile, template.imports, context)

      // Process sections
      for (const section of template.sections) {
        if (section.condition && !context[section.condition]) continue
        yield* this.processSection(sourceFile, section, context)
      }

      // Process conditionals
      for (const [cond, content] of Object.entries(template.conditionals ?? {})) {
        if (context[cond]) {
          yield* this.processConditionalContent(sourceFile, content, context)
        }
      }

      // Validate before output
      const diagnostics = sourceFile.getPreEmitDiagnostics()
      if (diagnostics.length > 0) {
        return yield* Effect.fail(new CompilationError({ diagnostics }))
      }

      return sourceFile.getFullText()
    }).pipe(
      Effect.withSpan(`template.compile.${template.id}`)
    )
  }
}
```

### 2.3 AST Builders for Effect Patterns

**New File**: `src/templates/ast/effect-builders.ts`

```typescript
import { SourceFile, ClassDeclaration } from "ts-morph"

export interface ContextTagConfig {
  serviceName: string
  tagIdentifier: string
  interfaceMethods: MethodSignature[]
  staticLayers?: LayerConfig[]
}

export function addContextTagClass(
  sourceFile: SourceFile,
  config: ContextTagConfig
): ClassDeclaration {
  return sourceFile.addClass({
    name: config.serviceName,
    isExported: true,
    extends: `Context.Tag("${config.tagIdentifier}")<${config.serviceName}, ${config.serviceName}Interface>`,
    methods: config.staticLayers?.map(layer => ({
      name: layer.name,
      isStatic: true,
      statements: `return ${layer.implementation}`
    }))
  })
}

export function addTaggedErrorClass(
  sourceFile: SourceFile,
  config: TaggedErrorConfig
): ClassDeclaration {
  return sourceFile.addClass({
    name: config.className,
    isExported: true,
    extends: `Data.TaggedError("${config.tagName}")`,
    typeParameters: [{
      name: "",
      constraint: `{ readonly ${config.fields.map(f => `${f.name}: ${f.type}`).join("; readonly ")} }`
    }]
  })
}

export function addSchemaClass(
  sourceFile: SourceFile,
  config: SchemaConfig
): void {
  sourceFile.addVariableStatement({
    isExported: true,
    declarationKind: VariableDeclarationKind.Const,
    declarations: [{
      name: config.name,
      initializer: `Schema.${config.schemaType}({ ${config.fields.map(f =>
        `${f.name}: ${f.schema}`
      ).join(", ")} })`
    }]
  })
}
```

---

## Phase 3: Fragment Library (Week 3)

### 3.1 Create Reusable Effect Fragments

**New Directory**: `src/templates/fragments/`

```
fragments/
├── effect-patterns/
│   ├── context-tag.fragment.ts
│   ├── tagged-error.fragment.ts
│   ├── layer-composition.fragment.ts
│   └── effect-gen.fragment.ts
├── imports/
│   ├── effect-core.fragment.ts
│   └── effect-rpc.fragment.ts
└── common/
    ├── file-header.fragment.ts
    └── jsdoc.fragment.ts
```

**Example Fragment**: `src/templates/fragments/effect-patterns/context-tag.fragment.ts`

```typescript
import type { FragmentDefinition, FragmentParams } from "../types"

export interface ContextTagFragmentParams extends FragmentParams {
  serviceName: string
  tagIdentifier: string
  methods: MethodDefinition[]
  layers: LayerDefinition[]
}

export const contextTagFragment: FragmentDefinition<ContextTagFragmentParams> = {
  id: "effect-patterns/context-tag",

  imports: [
    { from: "effect", items: ["Context", "Effect", "Layer"] }
  ],

  render: (params, context) => ({
    type: "contextTag",
    config: {
      serviceName: interpolate(params.serviceName, context),
      tagIdentifier: interpolate(params.tagIdentifier, context),
      interfaceMethods: params.methods.map(m => ({
        name: interpolate(m.name, context),
        params: m.params,
        returnType: interpolate(m.returnType, context)
      })),
      staticLayers: params.layers.map(l => ({
        name: l.name,
        implementation: interpolate(l.implementation, context)
      }))
    }
  })
}
```

---

## Phase 4: Migrate Contract Templates (Week 4)

### 4.1 Convert errors.template.ts to Definition

**Old File**: `src/generators/contract/templates/errors.template.ts` (addRaw-based)

**New File**: `src/templates/definitions/contract/errors.def.ts`

```typescript
import type { TemplateDefinition } from "../../core/types"

export const contractErrorsTemplate: TemplateDefinition = {
  id: "contract/errors",

  meta: {
    title: "{className} Contract Errors",
    description: "Tagged error types for {className} domain operations",
    module: "{scope}/contract-{fileName}/errors"
  },

  imports: [
    { from: "effect", items: ["Data"] }
  ],

  sections: [
    {
      title: "Not Found Error",
      content: {
        type: "taggedError",
        config: {
          className: "{className}NotFoundError",
          tagName: "{className}NotFoundError",
          fields: [
            { name: "id", type: "string" },
            { name: "message", type: "string", default: '`{className} with id ${this.id} not found`' }
          ]
        }
      }
    },
    {
      title: "Validation Error",
      content: {
        type: "taggedError",
        config: {
          className: "{className}ValidationError",
          tagName: "{className}ValidationError",
          fields: [
            { name: "field", type: "string" },
            { name: "value", type: "unknown" },
            { name: "message", type: "string" }
          ]
        }
      }
    }
  ],

  conditionals: {
    includeCQRS: {
      sections: [
        {
          title: "Command Errors",
          content: [
            {
              type: "taggedError",
              config: {
                className: "{className}CommandError",
                tagName: "{className}CommandError",
                fields: [
                  { name: "command", type: "string" },
                  { name: "cause", type: "unknown" }
                ]
              }
            }
          ]
        }
      ]
    }
  }
}
```

### 4.2 Convert rpc-definitions.template.ts

**New File**: `src/templates/definitions/contract/rpc-definitions.def.ts`

```typescript
export const rpcDefinitionsTemplate: TemplateDefinition = {
  id: "contract/rpc-definitions",

  meta: {
    title: "{className} RPC Definitions",
    description: "Contract-first RPC definitions using @effect/rpc",
    module: "{scope}/contract-{fileName}/rpc"
  },

  imports: [
    { from: "@effect/rpc", items: ["Rpc"] },
    { from: "effect", items: ["Schema"] },
    { from: "./errors", items: ["{className}RpcError"] },
    { from: "./schemas", items: ["{className}Schema", "Create{className}Input"] }
  ],

  sections: [
    {
      title: "Branded ID Type",
      content: {
        type: "schema",
        config: {
          name: "{className}Id",
          schemaType: "String",
          brand: "{className}Id",
          annotations: { identifier: "{className}Id", title: "{className} ID" }
        }
      }
    },
    {
      title: "Get RPC",
      content: {
        type: "rpcDefinition",
        config: {
          name: "Get{className}",
          routeType: "public",
          payload: { type: "struct", fields: [{ name: "id", schema: "{className}Id" }] },
          success: "{className}Schema",
          error: "{className}RpcError"
        }
      }
    },
    {
      title: "Create RPC",
      content: {
        type: "rpcDefinition",
        config: {
          name: "Create{className}",
          routeType: "protected",
          payload: "Create{className}Input",
          success: "{className}Schema",
          error: "{className}RpcError"
        }
      }
    }
  ]
}
```

---

## Phase 5: Migrate Feature & Data-Access Templates (Week 5)

### 5.1 Repository Template

**New File**: `src/templates/definitions/data-access/repository.def.ts`

Key patterns:
- Context.Tag with CRUD interface
- Static layers (Live, Test, Dev, Auto)
- Effect.Effect return types with proper error channels

### 5.2 Service Template

**New File**: `src/templates/definitions/feature/service.def.ts`

Key patterns:
- Service interface with Effect.gen methods
- Dependency injection via Context requirements
- Effect.withSpan for built-in tracing

---

## Phase 6: Migrate Infra & Provider Templates (Week 6)

### 6.1 Infra Service Template

Handle the complex conditional logic (cache, queue, pubsub, storage, rpc) via:

```typescript
export const infraServiceTemplate: TemplateDefinition = {
  id: "infra/service",
  // ... base sections

  conditionals: {
    "primitiveType:cache": { sections: [/* cache-specific */] },
    "primitiveType:queue": { sections: [/* queue-specific */] },
    "primitiveType:pubsub": { sections: [/* pubsub-specific */] },
    "primitiveType:storage": { sections: [/* storage-specific */] },
    "primitiveType:rpc": { sections: [/* rpc-specific */] }
  }
}
```

### 6.2 Provider Templates (Hybrid Approach)

For complex provider-type branching (sdk/http/graphql/cli), use **hybrid** approach:
- AST for common structures (errors, types, config)
- Retained addRaw for Effect.gen bodies with complex conditionals

---

## Phase 7: Template Registry & Integration (Week 7)

### 7.1 Template Registry

**New File**: `src/templates/registry.ts`

```typescript
import { contractErrorsTemplate } from "./definitions/contract/errors.def"
import { rpcDefinitionsTemplate } from "./definitions/contract/rpc-definitions.def"
// ... more imports

export const TemplateRegistry = {
  "contract/errors": contractErrorsTemplate,
  "contract/rpc-definitions": rpcDefinitionsTemplate,
  "contract/rpc-group": rpcGroupTemplate,
  "data-access/repository": repositoryTemplate,
  "feature/service": serviceTemplate,
  "infra/service": infraServiceTemplate,
  // ... all templates
} as const

export type TemplateId = keyof typeof TemplateRegistry
```

### 7.2 Update Core Generators

**File**: `src/generators/core/contract.ts`

```typescript
import { TemplateCompiler } from "../../templates/core/compiler"
import { TemplateRegistry } from "../../templates/registry"

export function generateContractCore(
  adapter: FileSystemAdapter,
  options: ContractCoreOptions
) {
  return Effect.gen(function*() {
    const compiler = new TemplateCompiler()
    const context: TemplateContext = {
      className: options.className,
      fileName: options.fileName,
      scope: options.scope,
      includeCQRS: options.includeCQRS
    }

    // Generate errors
    const errorsContent = yield* compiler.compile(
      TemplateRegistry["contract/errors"],
      context
    )
    yield* adapter.writeFile(`${sourceRoot}/lib/errors.ts`, errorsContent)

    // Generate RPC definitions
    const rpcContent = yield* compiler.compile(
      TemplateRegistry["contract/rpc-definitions"],
      context
    )
    yield* adapter.writeFile(`${sourceRoot}/lib/rpc-definitions.ts`, rpcContent)

    // ... more templates
  }).pipe(
    Effect.withSpan("generator.contract.core", {
      attributes: { "contract.name": options.className }
    })
  )
}
```

---

## Phase 8: Testing & Validation (Week 8)

### 8.1 Template Unit Tests

**New File**: `src/templates/__tests__/definitions/contract/errors.spec.ts`

```typescript
import { describe, it, expect } from "vitest"
import { TemplateCompiler } from "../../../core/compiler"
import { contractErrorsTemplate } from "../../../definitions/contract/errors.def"

describe("contract/errors template", () => {
  const compiler = new TemplateCompiler()
  const context = {
    className: "User",
    fileName: "user",
    scope: "@myorg",
    includeCQRS: false
  }

  it("generates valid TypeScript", async () => {
    const result = await Effect.runPromise(
      compiler.compile(contractErrorsTemplate, context)
    )

    expect(result).toContain("class UserNotFoundError")
    expect(result).toContain("extends Data.TaggedError")
  })

  it("includes CQRS errors when enabled", async () => {
    const result = await Effect.runPromise(
      compiler.compile(contractErrorsTemplate, { ...context, includeCQRS: true })
    )

    expect(result).toContain("class UserCommandError")
  })

  it("has no TypeScript compilation errors", async () => {
    const result = await Effect.runPromise(
      compiler.compile(contractErrorsTemplate, context).pipe(
        Effect.flatMap(code => validateTypescript(code))
      )
    )

    expect(result.diagnostics).toHaveLength(0)
  })
})
```

### 8.2 Integration Test Updates

Update `src/generators/__integration__/compilation.spec.ts` to validate new templates.

---

## Phase 9: GritQL Validation Layer (Week 9)

### 9.1 Install GritQL CLI

```bash
npm install --location=global @getgrit/cli
# or add to devDependencies
pnpm add -D @getgrit/cli
```

### 9.2 Create Effect-TS Pattern Library

**New Directory**: `.grit/patterns/effect/`

**Pattern 1: Enforce yield* in Effect.gen**

`.grit/patterns/effect/yield-star-required.md`:
```markdown
# Enforce yield* for Effects

Ensures Effects are properly unwrapped with `yield*` in `Effect.gen` blocks.

```gritql
language js(typescript)

pattern yield_without_star() {
  `yield $effect` where {
    $effect <: `Effect.$method($args)`
  }
}
```
```

**Pattern 2: Layer Composition Validation**

`.grit/patterns/effect/layer-composition.md`:
```gritql
language js(typescript)

pattern layer_merge_validation() {
  `Layer.merge($layers)` where {
    $layers <: some `$layer` where {
      !$layer <: contains `Layer.`
    }
  }
}
```

**Pattern 3: Context.Tag Pattern**

`.grit/patterns/effect/context-tag-structure.md`:
```gritql
language js(typescript)

pattern context_tag_with_layers() {
  `class $name extends Context.Tag($tag)<$name, $interface>() {
    static $layers
  }` where {
    $layers <: contains or { `Live`, `Test`, `Dev`, `Auto` }
  }
}
```

**Pattern 4: Data.TaggedError Pattern**

`.grit/patterns/effect/tagged-error-structure.md`:
```gritql
language js(typescript)

pattern tagged_error_readonly_fields() {
  `class $name extends Data.TaggedError($tag)<{
    $fields
  }>` where {
    $fields <: every `readonly $field: $type`
  }
}
```

### 9.3 GritQL Configuration

**New File**: `.grit/grit.yaml`

```yaml
version: 0.1
patterns:
  # Effect-TS patterns
  effect/yield-star-required:
    level: error

  effect/layer-composition:
    level: warn

  effect/context-tag-structure:
    level: warn

  effect/tagged-error-structure:
    level: warn

  # Monorepo conventions
  monorepo/barrel-exports:
    level: warn

  monorepo/workspace-deps:
    level: error
```

### 9.4 Integrate GritQL into Generator Pipeline

**New File**: `src/infrastructure/validation.ts`

```typescript
import { Effect } from "effect"
import { spawn } from "child_process"

export interface GritValidationResult {
  readonly success: boolean
  readonly violations: ReadonlyArray<{
    readonly pattern: string
    readonly file: string
    readonly line: number
    readonly message: string
  }>
}

export function validateWithGrit(
  projectRoot: string
): Effect.Effect<GritValidationResult, GritValidationError> {
  return Effect.tryPromise({
    try: async () => {
      const result = await runGritCheck(projectRoot)
      return parseGritOutput(result)
    },
    catch: (error) => new GritValidationError({ cause: error })
  }).pipe(
    Effect.withSpan("validation.grit", {
      attributes: { "validation.project_root": projectRoot }
    })
  )
}

async function runGritCheck(projectRoot: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn("grit", ["check", "--json", projectRoot])
    let output = ""
    proc.stdout.on("data", (data) => { output += data })
    proc.on("close", (code) => {
      if (code === 0) resolve(output)
      else reject(new Error(`grit check failed with code ${code}`))
    })
  })
}
```

### 9.5 Add Validation to Executor

**Update**: `src/infrastructure/execution.ts`

```typescript
export function createExecutor<TInput, TCoreOptions>(...) {
  return {
    execute: (validated: ExtendedInput<TInput>) =>
      Effect.gen(function*() {
        // ... existing generation logic ...

        const result = yield* coreGenerator(adapter, coreOptions)

        // NEW: Post-generation validation
        const validation = yield* validateWithGrit(projectRoot).pipe(
          Effect.catchAll((error) => {
            // Log warning but don't fail generation
            yield* Effect.logWarning(`GritQL validation failed: ${error.message}`)
            return Effect.succeed({ success: true, violations: [] })
          })
        )

        if (!validation.success) {
          yield* Effect.logWarning(
            `Generated code has ${validation.violations.length} pattern violations`
          )
        }

        return { ...result, validation }
      }).pipe(
        Effect.withSpan(`generator.${libraryType}`)
      )
  }
}
```

### 9.6 CI Integration

**Update**: `.github/workflows/ci.yml`

```yaml
- name: Run GritQL Checks
  run: |
    npm install -g @getgrit/cli
    grit check libs/
```

---

## Critical Files to Modify

| File | Changes |
|------|---------|
| `src/infrastructure/execution.ts` | Add Effect.withSpan, metrics |
| `src/utils/code-builder.ts` | Keep for backward compat, add AST bridge |
| `src/generators/core/*.ts` | Use TemplateCompiler instead of direct templates |
| `src/generators/contract/templates/*.ts` | Migrate to definitions |
| `src/generators/feature/templates/*.ts` | Migrate to definitions |
| `src/generators/data-access/templates/*.ts` | Migrate to definitions |
| `src/generators/infra/templates/*.ts` | Migrate to definitions (hybrid) |
| `src/generators/provider/templates/*.ts` | Migrate to definitions (hybrid) |

## New Files to Create

| File | Purpose |
|------|---------|
| `src/templates/core/types.ts` | Template definition types |
| `src/templates/core/compiler.ts` | Template compiler with ts-morph |
| `src/templates/core/resolver.ts` | Variable interpolation |
| `src/templates/ast/effect-builders.ts` | AST builders for Effect patterns |
| `src/templates/fragments/**/*.ts` | Reusable pattern fragments |
| `src/templates/definitions/**/*.def.ts` | Template definitions |
| `src/templates/registry.ts` | Template registry |
| `src/infrastructure/metrics.ts` | Generator metrics |
| `src/infrastructure/grit-validation.ts` | GritQL validation integration |
| `.grit/grit.yaml` | GritQL configuration |
| `.grit/patterns/effect/*.md` | Effect-TS pattern library |
| `.grit/patterns/monorepo/*.md` | Monorepo convention patterns |

## Dependencies to Add

```json
{
  "dependencies": {
    "ts-morph": "^24.0.0"
  },
  "devDependencies": {
    "@getgrit/cli": "^0.1.0"
  }
}
```

---

## Success Criteria

1. **Type Safety**: All Effect patterns (Context.Tag, Data.TaggedError, Schema) generated via AST with compile-time validation
2. **Observability**: Every generator execution produces OpenTelemetry spans and metrics
3. **Testability**: Each template definition has isolated unit tests
4. **Composability**: Templates use fragment library for shared patterns
5. **Backward Compatibility**: Existing integration tests pass
6. **Performance**: Generation time within 2x of current (acceptable for validation gains)
7. **Pattern Enforcement**: GritQL validates all generated code follows Effect-TS best practices
8. **CI Quality Gate**: GritQL checks integrated into CI pipeline

---

## Migration Strategy

1. **Week 1-2**: Build infrastructure (observability, template engine core) without changing generators
2. **Week 3**: Build fragment library, migrate 2-3 contract templates as proof of concept
3. **Week 4**: Complete contract templates, validate with integration tests
4. **Week 5**: Migrate feature and data-access templates
5. **Week 6**: Migrate infra and provider templates (hybrid approach)
6. **Week 7**: Integration, registry, core generator updates
7. **Week 8**: Testing, documentation, cleanup
8. **Week 9**: GritQL pattern library, validation integration, CI setup

Each phase delivers standalone value and can be paused if needed.

---

## Sources

- [GritQL Documentation](https://docs.grit.io/)
- [GritQL Pattern Language](https://docs.grit.io/language/patterns)
- [GritQL CLI Reference](https://docs.grit.io/cli/reference)
- [Biome GritQL Integration](https://dev.to/herrington_darkholme/biomes-gritql-plugin-vs-ast-grep-your-guide-to-ast-based-code-transformation-for-jsts-devs-29j2)
- [ts-morph Documentation](https://ts-morph.com/)
