/**
 * Data-Access Sub-Module Repository Template
 *
 * Generates repository files for data-access sub-modules.
 * Part of the Hybrid DDD pattern for sub-module support.
 *
 * @module monorepo-library-generator/data-access/submodule-repository-template
 */

import { TypeScriptBuilder } from "../../../utils/code-builder"
import { WORKSPACE_CONFIG } from "../../../utils/workspace-config"

export interface SubModuleRepositoryOptions {
  /** Parent domain name (e.g., 'order') */
  parentName: string
  /** Parent class name (e.g., 'Order') */
  parentClassName: string
  /** Parent file name (e.g., 'order') */
  parentFileName: string
  /** Sub-module name (e.g., 'cart') */
  subModuleName: string
  /** Sub-module class name (e.g., 'Cart') */
  subModuleClassName: string
}

/**
 * Generate repository.ts for a data-access sub-module
 *
 * Creates Context.Tag-based repository with standard CRUD operations
 */
export function generateSubModuleRepositoryFile(options: SubModuleRepositoryOptions) {
  const builder = new TypeScriptBuilder()
  const { parentClassName, parentName, subModuleClassName, subModuleName } = options
  const scope = WORKSPACE_CONFIG.getScope()

  builder.addFileHeader({
    title: `${parentClassName} ${subModuleClassName} Repository`,
    description: `Repository for ${subModuleName} operations within the ${parentName} domain.

Uses Effect Context.Tag pattern for dependency injection and
provides standard CRUD operations plus domain-specific queries.`,
    module: `${scope}/data-access-${parentName}/${subModuleName}`
  })
  builder.addBlankLine()

  builder.addImports([{ from: "effect", imports: ["Context", "Effect", "Layer", "Option"] }])
  builder.addBlankLine()

  builder.addSectionComment("Contract Imports")
  // Only import types used in repository interface
  // Add additional types (${subModuleClassName}Item, etc.) when implementing specialized patterns
  builder.addRaw(`import type { ${subModuleClassName}Id } from "${scope}/contract-${parentName}/${subModuleName}";`)
  builder.addBlankLine()

  builder.addSectionComment("Infrastructure Imports")
  builder.addRaw(`import { DatabaseService } from "${scope}/infra-database";
import { LoggingService } from "${scope}/infra-observability";`)
  builder.addBlankLine()

  builder.addSectionComment("Repository Error Types")
  builder.addBlankLine()

  builder.addRaw(`/**
 * ${subModuleClassName} repository error
 */
export class ${subModuleClassName}RepositoryError {
  readonly _tag = "${subModuleClassName}RepositoryError";
  constructor(
    readonly message: string,
    readonly code: "NOT_FOUND" | "DUPLICATE" | "VALIDATION" | "DATABASE",
    readonly cause?: unknown
  ) {}
}

/**
 * ${subModuleClassName} not found error
 */
export class ${subModuleClassName}NotFoundError extends ${subModuleClassName}RepositoryError {
  constructor(id: string) {
    super(\`${subModuleClassName} not found: \${id}\`, "NOT_FOUND");
  }
}`)
  builder.addBlankLine()

  builder.addSectionComment("Repository Interface")
  builder.addBlankLine()

  // Generate interface based on common sub-module patterns
  const repoInterface = getRepositoryInterfaceForSubModule(subModuleName, subModuleClassName)

  builder.addRaw(`/**
 * ${subModuleClassName}Repository interface
 *
 * Provides data access operations for ${subModuleName} within ${parentName} domain.
 */
export interface ${subModuleClassName}RepositoryInterface {
${repoInterface}
}`)
  builder.addBlankLine()

  builder.addSectionComment("Context.Tag Definition")
  builder.addBlankLine()

  builder.addRaw(`/**
 * ${subModuleClassName}Repository Context.Tag
 *
 * Use this to access the repository in your Effect programs:
 * \`\`\`typescript
 * const repo = yield* ${subModuleClassName}Repository;
 * const item = yield* repo.findById(id);
 * \`\`\`
 */
export class ${subModuleClassName}Repository extends Context.Tag("${subModuleClassName}Repository")<
  ${subModuleClassName}Repository,
  ${subModuleClassName}RepositoryInterface
>() {}`)
  builder.addBlankLine()

  builder.addSectionComment("Live Layer Implementation")
  builder.addBlankLine()

  const implementation = getRepositoryImplementationForSubModule(subModuleName, subModuleClassName)

  builder.addRaw(`/**
 * ${subModuleClassName}RepositoryLive Layer
 *
 * Live implementation using DatabaseService and LoggingService.
 */
export const ${subModuleClassName}RepositoryLive = Layer.effect(
  ${subModuleClassName}Repository,
  Effect.gen(function*() {
    const db = yield* DatabaseService;
    const logger = yield* LoggingService;

    yield* logger.debug("${subModuleClassName}Repository initialized");

${implementation}
  })
);`)
  builder.addBlankLine()

  builder.addSectionComment("Test Layer")
  builder.addBlankLine()

  builder.addRaw(`/**
 * ${subModuleClassName}RepositoryTest Layer
 *
 * In-memory implementation for testing.
 */
export const ${subModuleClassName}RepositoryTest = Layer.effect(
  ${subModuleClassName}Repository,
  Effect.gen(function*() {
    const logger = yield* LoggingService;
    const store = new Map<string, unknown>();

    yield* logger.debug("${subModuleClassName}Repository (Test) initialized");

    return {
      findById: (id) =>
        Effect.sync(() => {
          const item = store.get(id);
          return item ? Option.some(item) : Option.none();
        }),

      findAll: (criteria, pagination) =>
        Effect.sync(() => {
          const items = Array.from(store.values());
          const skip = pagination?.skip ?? 0;
          const limit = pagination?.limit ?? 20;
          return {
            items: items.slice(skip, skip + limit),
            total: items.length,
          };
        }),

      create: (input) =>
        Effect.sync(() => {
          const id = crypto.randomUUID();
          const item = { id, ...(input), createdAt: new Date(), updatedAt: new Date() };
          store.set(id, item);
          return item;
        }),

      update: (id, input) =>
        Effect.gen(function*() {
          const existing = store.get(id) | undefined;
          if (!existing) {
            return yield* Effect.fail(new ${subModuleClassName}NotFoundError(id));
          }
          const updated = { ...existing, ...(input), updatedAt: new Date() };
          store.set(id, updated);
          return updated;
        }),

      delete: (id) =>
        Effect.gen(function*() {
          if (!store.has(id)) {
            return yield* Effect.fail(new ${subModuleClassName}NotFoundError(id));
          }
          store.delete(id);
        }),

      exists: (id) => Effect.succeed(store.has(id)),

      count: () => Effect.succeed(store.size),
    }
  })
);`)
  builder.addBlankLine()

  return builder.toString()
}

/**
 * Generate sub-module index.ts barrel export
 */
export function generateSubModuleRepositoryIndexFile(options: SubModuleRepositoryOptions) {
  const builder = new TypeScriptBuilder()
  const { parentClassName, parentName, subModuleClassName, subModuleName } = options
  const scope = WORKSPACE_CONFIG.getScope()

  builder.addFileHeader({
    title: `${parentClassName} ${subModuleClassName} Repository Index`,
    description: `Barrel export for ${subModuleName} repository`,
    module: `${scope}/data-access-${parentName}/${subModuleName}`
  })
  builder.addBlankLine()

  builder.addRaw(`export {
  ${subModuleClassName}Repository,
  ${subModuleClassName}RepositoryLive,
  ${subModuleClassName}RepositoryTest,
  ${subModuleClassName}RepositoryError,
  ${subModuleClassName}NotFoundError,
  type ${subModuleClassName}RepositoryInterface,
} from "./repository";`)
  builder.addBlankLine()

  return builder.toString()
}

/**
 * Get repository interface based on common sub-module patterns
 */
function getRepositoryInterfaceForSubModule(
  subModuleName: string,
  subModuleClassName: string
) {
  const name = subModuleName.toLowerCase()

  // Common sub-module patterns with appropriate interface methods
  if (name === "cart") {
    return `  /** Find cart by ID */
  readonly findById: (id: string) => Effect.Effect<Option.Option<unknown>, ${subModuleClassName}RepositoryError>;

  /** Find cart by user ID */
  readonly findByUserId: (userId: string) => Effect.Effect<Option.Option<unknown>, ${subModuleClassName}RepositoryError>;

  /** Add item to cart */
  readonly addItem: (cartId: string, item: ${subModuleClassName}Item) => Effect.Effect<void, ${subModuleClassName}RepositoryError>;

  /** Remove item from cart */
  readonly removeItem: (cartId: string, itemId: string) => Effect.Effect<void, ${subModuleClassName}RepositoryError>;

  /** Update item quantity */
  readonly updateItemQuantity: (cartId: string, itemId: string, quantity: number) => Effect.Effect<void, ${subModuleClassName}RepositoryError>;

  /** Clear cart */
  readonly clearCart: (cartId: string) => Effect.Effect<void, ${subModuleClassName}RepositoryError>;

  /** Get cart with items */
  readonly getCart: (cartId: string) => Effect.Effect<unknown, ${subModuleClassName}RepositoryError>;

  /** Create new cart */
  readonly create: (input: { userId: string }) => Effect.Effect<unknown, ${subModuleClassName}RepositoryError>;

  /** Check if cart exists */
  readonly exists: (id: string) => Effect.Effect<boolean, ${subModuleClassName}RepositoryError>;`
  }

  if (name === "checkout") {
    return `  /** Find checkout session by ID */
  readonly findById: (id: string) => Effect.Effect<Option.Option<unknown>, ${subModuleClassName}RepositoryError>;

  /** Create checkout session */
  readonly create: (input: { cartId: string; shippingAddress?: unknown }) => Effect.Effect<unknown, ${subModuleClassName}RepositoryError>;

  /** Update checkout status */
  readonly updateStatus: (id: string, status: string) => Effect.Effect<unknown, ${subModuleClassName}RepositoryError>;

  /** Record payment */
  readonly recordPayment: (id: string, paymentId: string, status: string) => Effect.Effect<void, ${subModuleClassName}RepositoryError>;

  /** Complete checkout */
  readonly complete: (id: string, orderId: string) => Effect.Effect<void, ${subModuleClassName}RepositoryError>;

  /** Check if checkout exists */
  readonly exists: (id: string) => Effect.Effect<boolean, ${subModuleClassName}RepositoryError>;`
  }

  if (name === "management" || name === "order-management") {
    return `  /** Find order by ID */
  readonly findById: (id: string) => Effect.Effect<Option.Option<unknown>, ${subModuleClassName}RepositoryError>;

  /** Find order by order number */
  readonly findByOrderNumber: (orderNumber: string) => Effect.Effect<Option.Option<unknown>, ${subModuleClassName}RepositoryError>;

  /** List orders with filters */
  readonly findAll: (
    criteria: { status?: string; customerId?: string },
    pagination?: { skip?: number; limit?: number }
  ) => Effect.Effect<{ items: Array<unknown>; total: number }, ${subModuleClassName}RepositoryError>;

  /** Create order */
  readonly create: (input: { checkoutId: string; notes?: string }) => Effect.Effect<unknown, ${subModuleClassName}RepositoryError>;

  /** Update order status */
  readonly updateStatus: (id: string, status: string, reason?: string) => Effect.Effect<unknown, ${subModuleClassName}RepositoryError>;

  /** Cancel order */
  readonly cancel: (id: string, reason: string) => Effect.Effect<void, ${subModuleClassName}RepositoryError>;

  /** Count orders */
  readonly count: (criteria?: { status?: string }) => Effect.Effect<number, ${subModuleClassName}RepositoryError>;

  /** Check if order exists */
  readonly exists: (id: string) => Effect.Effect<boolean, ${subModuleClassName}RepositoryError>;`
  }

  // Generic repository interface
  return `  /** Find by ID */
  readonly findById: (id: ${subModuleClassName}Id) => Effect.Effect<Option.Option<unknown>, ${subModuleClassName}RepositoryError>;

  /** Find all with optional criteria and pagination */
  readonly findAll: (
    criteria?: Record<string, unknown>,
    pagination?: { skip?: number; limit?: number }
  ) => Effect.Effect<{ items: Array<unknown>; total: number }, ${subModuleClassName}RepositoryError>;

  /** Create new entity */
  readonly create: (input: unknown) => Effect.Effect<unknown, ${subModuleClassName}RepositoryError>;

  /** Update existing entity */
  readonly update: (id: ${subModuleClassName}Id, input: unknown) => Effect.Effect<unknown, ${subModuleClassName}RepositoryError>;

  /** Delete entity */
  readonly delete: (id: ${subModuleClassName}Id) => Effect.Effect<void, ${subModuleClassName}RepositoryError>;

  /** Check if entity exists */
  readonly exists: (id: ${subModuleClassName}Id) => Effect.Effect<boolean, ${subModuleClassName}RepositoryError>;

  /** Count entities */
  readonly count: (criteria?: Record<string, unknown>) => Effect.Effect<number, ${subModuleClassName}RepositoryError>;`
}

/**
 * Get repository implementation based on common sub-module patterns
 */
function getRepositoryImplementationForSubModule(
  subModuleName: string,
  subModuleClassName: string
) {
  // Generic implementation structure - use db for actual queries when implementing
  return `    return {
      findById: (id) =>
        Effect.gen(function*() {
          yield* logger.debug("${subModuleClassName}Repository.findById", { id });
          // TODO: Replace with actual database query using db
          yield* db.healthCheck().pipe(Effect.ignore);
          return Option.none();
        }).pipe(Effect.withSpan("${subModuleClassName}Repository.findById")),

      findAll: (criteria, pagination) =>
        Effect.gen(function*() {
          const skip = pagination?.skip ?? 0;
          const limit = pagination?.limit ?? 20;
          yield* logger.debug("${subModuleClassName}Repository.findAll", { criteria, skip, limit });
          // TODO: Replace with actual database query using db with skip/limit
          yield* db.healthCheck().pipe(Effect.ignore);
          return { items: [], total: 0 };
        }).pipe(Effect.withSpan("${subModuleClassName}Repository.findAll")),

      create: (input) =>
        Effect.gen(function*() {
          yield* logger.info("${subModuleClassName}Repository.create", { input });
          // TODO: Replace with actual database insert using db
          yield* db.healthCheck().pipe(Effect.ignore);
          const id = crypto.randomUUID();
          return { id, ...(input), createdAt: new Date(), updatedAt: new Date() };
        }).pipe(Effect.withSpan("${subModuleClassName}Repository.create")),

      update: (id, input) =>
        Effect.gen(function*() {
          yield* logger.info("${subModuleClassName}Repository.update", { id, input });
          // TODO: Replace with actual database update using db
          yield* db.healthCheck().pipe(Effect.ignore);
          return { id, ...(input), updatedAt: new Date() };
        }).pipe(Effect.withSpan("${subModuleClassName}Repository.update")),

      delete: (id) =>
        Effect.gen(function*() {
          yield* logger.info("${subModuleClassName}Repository.delete", { id });
          // TODO: Replace with actual database delete using db
          yield* db.healthCheck().pipe(Effect.ignore);
        }).pipe(Effect.withSpan("${subModuleClassName}Repository.delete")),

      exists: (id) =>
        Effect.gen(function*() {
          yield* logger.debug("${subModuleClassName}Repository.exists", { id });
          // TODO: Replace with actual database check using db
          yield* db.healthCheck().pipe(Effect.ignore);
          return false;
        }).pipe(Effect.withSpan("${subModuleClassName}Repository.exists")),

      count: (criteria) =>
        Effect.gen(function*() {
          yield* logger.debug("${subModuleClassName}Repository.count", { criteria });
          // TODO: Replace with actual database count using db
          yield* db.healthCheck().pipe(Effect.ignore);
          return 0;
        }).pipe(Effect.withSpan("${subModuleClassName}Repository.count")),
    }`
}
