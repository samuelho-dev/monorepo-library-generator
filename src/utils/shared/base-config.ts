/**
 * Base Configuration
 *
 * Centralized configuration shared across all library generators.
 * Provides default imports, dependencies, file headers, and common patterns
 * to ensure consistency and reduce duplication.
 *
 * @module monorepo-library-generator/base-config
 */

/**
 * Standard Effect.ts imports used across all libraries
 */
export const EFFECT_CORE_IMPORTS: {
  readonly effect: ReadonlyArray<string>
} = {
  effect: [
    "Effect",
    "Context",
    "Layer",
    "Data",
    "Schema",
    "Option",
    "Either",
    "Array"
  ]
}

/**
 * Additional Effect.ts imports for specific use cases
 */
export const EFFECT_EXTENDED_IMPORTS: {
  readonly concurrent: ReadonlyArray<string>
  readonly reactive: ReadonlyArray<string>
  readonly testing: ReadonlyArray<string>
} = {
  concurrent: [
    "Effect",
    "Context",
    "Layer",
    "Data",
    "Schema",
    "Ref",
    "Queue",
    "Fiber"
  ],
  reactive: ["Effect", "Context", "Layer", "Data", "Schema", "Stream", "Sink"],
  testing: [
    "Effect",
    "Context",
    "Layer",
    "Data",
    "Schema",
    "TestContext",
    "it",
    "expect"
  ]
}

/**
 * Standard dependencies for all Effect-based libraries
 */
export const EFFECT_PEER_DEPENDENCIES: {
  readonly effect: string
} = {
  effect: "*"
}

/**
 * Standard dev dependencies for testing
 */
export const EFFECT_DEV_DEPENDENCIES: {
  readonly "@effect/vitest": string
  readonly "@types/node": string
  readonly vitest: string
} = {
  "@effect/vitest": "workspace:*",
  "@types/node": "^22.5.2",
  vitest: "workspace:*"
}

/**
 * File header template generator
 */
export function createFileHeader(options: {
  title: string
  description: string
  moduleName: string
  since?: string
  see?: Array<string>
}) {
  const lines = [
    "/**",
    ` * ${options.title}`,
    " *",
    ` * ${options.description}`,
    " *",
    ` * @module ${options.moduleName}`
  ]

  if (options.since) {
    lines.push(` * @since ${options.since}`)
  }

  if (options.see && options.see.length > 0) {
    for (const link of options.see) {
      lines.push(` * @see ${link}`)
    }
  }

  lines.push(" */")

  return lines.join("\n")
}

/**
 * Standard file headers for different library types
 */
export const LIBRARY_FILE_HEADERS: {
  readonly contract: {
    readonly errors: (className: string) => string
    readonly entities: (className: string) => string
    readonly ports: (className: string) => string
    readonly events: (className: string) => string
    readonly commands: (className: string) => string
    readonly queries: (className: string) => string
    readonly projections: (className: string) => string
    readonly rpc: (className: string) => string
  }
  readonly feature: {
    readonly service: (featureName: string) => string
    readonly layers: (featureName: string) => string
    readonly handlers: (featureName: string) => string
  }
  readonly dataAccess: {
    readonly repository: (entityName: string) => string
  }
  readonly infrastructure: {
    readonly service: (serviceName: string) => string
  }
  readonly provider: {
    readonly service: (providerName: string) => string
  }
} = {
  contract: {
    errors: (className: string) =>
      createFileHeader({
        title: `${className} Domain Errors`,
        description: "Defines all error types for domain operations using Data.TaggedError pattern.",
        moduleName: `contract/${className.toLowerCase()}/errors`,
        see: ["https://effect.website/docs/guides/error-management"]
      }),
    entities: (className: string) =>
      createFileHeader({
        title: `${className} Domain Entities`,
        description: "Defines domain entities using Schema.Struct for type-safe data modeling.",
        moduleName: `contract/${className.toLowerCase()}/entities`,
        see: ["https://effect.website/docs/schema/introduction"]
      }),
    ports: (className: string) =>
      createFileHeader({
        title: `${className} Repository Port`,
        description: "Defines repository interface using Context.Tag for dependency injection.",
        moduleName: `contract/${className.toLowerCase()}/ports`,
        see: ["https://effect.website/docs/guides/context-management"]
      }),
    events: (className: string) =>
      createFileHeader({
        title: `${className} Domain Events`,
        description: "Defines domain events using Data.TaggedError pattern for event sourcing.",
        moduleName: `contract/${className.toLowerCase()}/events`
      }),
    commands: (className: string) =>
      createFileHeader({
        title: `${className} CQRS Commands`,
        description: "Defines command schemas for write operations following CQRS pattern.",
        moduleName: `contract/${className.toLowerCase()}/commands`,
        see: ["https://effect.website/docs/schema/introduction"]
      }),
    queries: (className: string) =>
      createFileHeader({
        title: `${className} CQRS Queries`,
        description: "Defines query schemas for read operations following CQRS pattern.",
        moduleName: `contract/${className.toLowerCase()}/queries`
      }),
    projections: (className: string) =>
      createFileHeader({
        title: `${className} CQRS Projections`,
        description: "Defines projection schemas for materialized views.",
        moduleName: `contract/${className.toLowerCase()}/projections`
      }),
    rpc: (className: string) =>
      createFileHeader({
        title: `${className} RPC Schema`,
        description: "Defines RPC endpoint schemas for remote procedure calls.",
        moduleName: `contract/${className.toLowerCase()}/rpc`,
        see: ["https://effect.website/docs/rpc/introduction"]
      })
  },
  feature: {
    service: (featureName: string) =>
      createFileHeader({
        title: `${featureName} Feature Service`,
        description: "Business logic orchestration service for the feature.",
        moduleName: `feature/${featureName.toLowerCase()}/service`
      }),
    layers: (featureName: string) =>
      createFileHeader({
        title: `${featureName} Feature Layers`,
        description: "Service layer implementations and dependency wiring.",
        moduleName: `feature/${featureName.toLowerCase()}/layers`
      }),
    handlers: (featureName: string) =>
      createFileHeader({
        title: `${featureName} RPC Handlers`,
        description: "RPC endpoint handler implementations.",
        moduleName: `feature/${featureName.toLowerCase()}/handlers`
      })
  },
  dataAccess: {
    repository: (entityName: string) =>
      createFileHeader({
        title: `${entityName} Repository Implementation`,
        description: "Repository implementation using Kysely for type-safe database access.",
        moduleName: `data-access/${entityName.toLowerCase()}/repository`,
        see: ["https://kysely.dev/docs/intro"]
      })
  },
  infrastructure: {
    service: (serviceName: string) =>
      createFileHeader({
        title: `${serviceName} Infrastructure Service`,
        description: "Cross-cutting infrastructure concern providing shared capabilities.",
        moduleName: `infra/${serviceName.toLowerCase()}/service`
      })
  },
  provider: {
    service: (providerName: string) =>
      createFileHeader({
        title: `${providerName} Provider`,
        description: "External service adapter wrapping third-party SDK.",
        moduleName: `provider/${providerName.toLowerCase()}/service`
      })
  }
}

/**
 * Standard TypeScript compiler options for generated tsconfig files
 */
export const TS_CONFIG_BASE: {
  readonly compilerOptions: {
    readonly target: string
    readonly module: string
    readonly moduleResolution: string
    readonly strict: boolean
    readonly esModuleInterop: boolean
    readonly skipLibCheck: boolean
    readonly forceConsistentCasingInFileNames: boolean
    readonly resolveJsonModule: boolean
    readonly isolatedModules: boolean
    readonly declaration: boolean
    readonly declarationMap: boolean
    readonly sourceMap: boolean
    readonly composite: boolean
    readonly incremental: boolean
    readonly noUnusedLocals: boolean
    readonly noUnusedParameters: boolean
    readonly noImplicitReturns: boolean
    readonly noFallthroughCasesInSwitch: boolean
  }
} = {
  compilerOptions: {
    target: "ES2022",
    module: "ESNext",
    moduleResolution: "bundler",
    strict: true,
    esModuleInterop: true,
    skipLibCheck: true,
    forceConsistentCasingInFileNames: true,
    resolveJsonModule: true,
    isolatedModules: true,
    declaration: true,
    declarationMap: true,
    sourceMap: true,
    composite: true,
    incremental: true,
    noUnusedLocals: true,
    noUnusedParameters: true,
    noImplicitReturns: true,
    noFallthroughCasesInSwitch: true
  }
}

/**
 * Standard package.json scripts for libraries
 */
export const PACKAGE_SCRIPTS: {
  readonly build: string
  readonly clean: string
  readonly lint: string
  readonly "lint:fix": string
  readonly test: string
  readonly "test:watch": string
  readonly "test:coverage": string
  readonly typecheck: string
} = {
  build: "tsc -b tsconfig.build.json",
  clean: "rm -rf build dist .tsbuildinfo",
  lint: "eslint src test --ext .ts",
  "lint:fix": "eslint src test --ext .ts --fix",
  test: "vitest run",
  "test:watch": "vitest",
  "test:coverage": "vitest run --coverage",
  typecheck: "tsc --noEmit"
}

/**
 * Common naming conventions
 */
export const NAMING_CONVENTIONS: {
  readonly toPascalCase: (str: string) => string
  readonly toCamelCase: (str: string) => string
  readonly toKebabCase: (str: string) => string
  readonly toConstantCase: (str: string) => string
} = {
  /**
   * Convert to PascalCase (for class names)
   */
  toPascalCase: (str: string) => {
    return str
      .replace(/[-_](.)/g, (_, char) => char.toUpperCase())
      .replace(/^(.)/, (char) => char.toUpperCase())
  },

  /**
   * Convert to camelCase (for variable names)
   */
  toCamelCase: (str: string) => {
    return str
      .replace(/[-_](.)/g, (_, char) => char.toUpperCase())
      .replace(/^(.)/, (char) => char.toLowerCase())
  },

  /**
   * Convert to kebab-case (for file names)
   */
  toKebabCase: (str: string) => {
    return str
      .replace(/([a-z])([A-Z])/g, "$1-$2")
      .replace(/[\s_]+/g, "-")
      .toLowerCase()
  },

  /**
   * Convert to SCREAMING_SNAKE_CASE (for constants)
   */
  toConstantCase: (str: string) => {
    return str
      .replace(/([a-z])([A-Z])/g, "$1_$2")
      .replace(/[\s-]+/g, "_")
      .toUpperCase()
  }
}

/**
 * Default tags for different library types
 */
export const DEFAULT_LIBRARY_TAGS: {
  readonly contract: ReadonlyArray<string>
  readonly feature: ReadonlyArray<string>
  readonly dataAccess: ReadonlyArray<string>
  readonly infrastructure: ReadonlyArray<string>
  readonly provider: ReadonlyArray<string>
} = {
  contract: ["type:contract", "scope:shared"],
  feature: ["type:feature", "scope:shared"],
  dataAccess: ["type:data-access", "scope:server"],
  infrastructure: ["type:infrastructure", "scope:shared"],
  provider: ["type:provider", "scope:shared"]
}

/**
 * Platform-specific export patterns
 */
export const PLATFORM_EXPORTS: {
  readonly universal: {
    readonly hasClient: boolean
    readonly hasServer: boolean
    readonly hasEdge: boolean
  }
  readonly serverOnly: {
    readonly hasClient: boolean
    readonly hasServer: boolean
    readonly hasEdge: boolean
  }
  readonly clientServer: {
    readonly hasClient: boolean
    readonly hasServer: boolean
    readonly hasEdge: boolean
  }
  readonly fullStack: {
    readonly hasClient: boolean
    readonly hasServer: boolean
    readonly hasEdge: boolean
  }
} = {
  /**
   * Libraries that export for all platforms
   */
  universal: {
    hasClient: true,
    hasServer: true,
    hasEdge: false
  },

  /**
   * Libraries that only export for server
   */
  serverOnly: {
    hasClient: false,
    hasServer: true,
    hasEdge: false
  },

  /**
   * Libraries that export for client and server
   */
  clientServer: {
    hasClient: true,
    hasServer: true,
    hasEdge: false
  },

  /**
   * Libraries that export for all runtime environments
   */
  fullStack: {
    hasClient: true,
    hasServer: true,
    hasEdge: true
  }
}

/**
 * Effect pattern defaults
 */
export const EFFECT_PATTERNS: {
  readonly testLayerPattern: "static-property"
  readonly servicePattern: "inline-interface"
  readonly layerPattern: "static-live"
  readonly errorPattern: "tagged-error"
} = {
  /**
   * Default test layer pattern (Pattern B - preferred)
   */
  testLayerPattern: "static-property",

  /**
   * Default service definition pattern
   */
  servicePattern: "inline-interface",

  /**
   * Default layer implementation pattern
   */
  layerPattern: "static-live",

  /**
   * Default error pattern
   */
  errorPattern: "tagged-error"
}

/**
 * Validation rules for library options
 */
export const VALIDATION_RULES: {
  readonly libraryNamePattern: RegExp
  readonly classNamePattern: RegExp
  readonly propertyNamePattern: RegExp
  readonly packageScopePattern: RegExp
} = {
  /**
   * Library name must be kebab-case
   */
  libraryNamePattern: /^[a-z][a-z0-9-]*$/,

  /**
   * Class name must be PascalCase
   */
  classNamePattern: /^[A-Z][a-zA-Z0-9]*$/,

  /**
   * Property name must be camelCase
   */
  propertyNamePattern: /^[a-z][a-zA-Z0-9]*$/,

  /**
   * Package scope pattern
   */
  packageScopePattern: /^@[a-z0-9-]+\/[a-z0-9-]+$/
}
