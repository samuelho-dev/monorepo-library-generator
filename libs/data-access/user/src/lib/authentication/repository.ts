import { Context, Effect, Layer, Option } from "effect"

/**
 * User Authentication Repository
 *
 * Repository for authentication operations within the user domain.

Uses Effect Context.Tag pattern for dependency injection and
provides standard CRUD operations plus domain-specific queries.
 *
 * @module @samuelho-dev/data-access-user/authentication
 */



// ============================================================================
// Contract Imports
// ============================================================================

import type { AuthenticationId } from "@samuelho-dev/contract-user/authentication";

// ============================================================================
// Infrastructure Imports
// ============================================================================

import { DatabaseService } from "@samuelho-dev/infra-database";
import { LoggingService } from "@samuelho-dev/infra-observability";

// ============================================================================
// Repository Error Types
// ============================================================================


/**
 * Authentication repository error
 */
export class AuthenticationRepositoryError {
  readonly _tag = "AuthenticationRepositoryError";
  constructor(
    readonly message: string,
    readonly code: "NOT_FOUND" | "DUPLICATE" | "VALIDATION" | "DATABASE",
    readonly cause?: unknown
  ) {}
}

/**
 * Authentication not found error
 */
export class AuthenticationNotFoundError extends AuthenticationRepositoryError {
  constructor(id: string) {
    super(`Authentication not found: ${id}`, "NOT_FOUND");
  }
}

// ============================================================================
// Repository Interface
// ============================================================================


/**
 * AuthenticationRepository interface
 *
 * Provides data access operations for authentication within user domain.
 */
export interface AuthenticationRepositoryInterface {
  /** Find by ID */
  readonly findById: (id: AuthenticationId) => Effect.Effect<Option.Option<unknown>, AuthenticationRepositoryError>;

  /** Find all with optional criteria and pagination */
  readonly findAll: (
    criteria?: Record<string, unknown>,
    pagination?: { skip?: number; limit?: number }
  ) => Effect.Effect<{ items: Array<unknown>; total: number }, AuthenticationRepositoryError>;

  /** Create new entity */
  readonly create: (input: unknown) => Effect.Effect<unknown, AuthenticationRepositoryError>;

  /** Update existing entity */
  readonly update: (id: AuthenticationId, input: unknown) => Effect.Effect<unknown, AuthenticationRepositoryError>;

  /** Delete entity */
  readonly delete: (id: AuthenticationId) => Effect.Effect<void, AuthenticationRepositoryError>;

  /** Check if entity exists */
  readonly exists: (id: AuthenticationId) => Effect.Effect<boolean, AuthenticationRepositoryError>;

  /** Count entities */
  readonly count: (criteria?: Record<string, unknown>) => Effect.Effect<number, AuthenticationRepositoryError>;
}

// ============================================================================
// Context.Tag Definition
// ============================================================================


/**
 * AuthenticationRepository Context.Tag
 *
 * Use this to access the repository in your Effect programs:
 * ```typescript
 * const repo = yield* AuthenticationRepository;
 * const item = yield* repo.findById(id);
 * ```
 */
export class AuthenticationRepository extends Context.Tag("AuthenticationRepository")<
  AuthenticationRepository,
  AuthenticationRepositoryInterface
>() {}

// ============================================================================
// Live Layer Implementation
// ============================================================================


/**
 * AuthenticationRepositoryLive Layer
 *
 * Live implementation using DatabaseService and LoggingService.
 */
export const AuthenticationRepositoryLive = Layer.effect(
  AuthenticationRepository,
  Effect.gen(function*() {
    const db = yield* DatabaseService;
    const logger = yield* LoggingService;

    yield* logger.debug("AuthenticationRepository initialized");

    return {
      findById: (id) =>
        Effect.gen(function*() {
          yield* logger.debug("AuthenticationRepository.findById", { id });
          // TODO: Replace with actual database query using db
          yield* db.healthCheck().pipe(Effect.ignore);
          return Option.none();
        }).pipe(Effect.withSpan("AuthenticationRepository.findById")),

      findAll: (criteria, pagination) =>
        Effect.gen(function*() {
          const skip = pagination?.skip ?? 0;
          const limit = pagination?.limit ?? 20;
          yield* logger.debug("AuthenticationRepository.findAll", { criteria, skip, limit });
          // TODO: Replace with actual database query using db with skip/limit
          yield* db.healthCheck().pipe(Effect.ignore);
          return { items: [], total: 0 };
        }).pipe(Effect.withSpan("AuthenticationRepository.findAll")),

      create: (input) =>
        Effect.gen(function*() {
          yield* logger.info("AuthenticationRepository.create", { input });
          // TODO: Replace with actual database insert using db
          yield* db.healthCheck().pipe(Effect.ignore);
          const id = crypto.randomUUID();
          return { id, ...(input), createdAt: new Date(), updatedAt: new Date() };
        }).pipe(Effect.withSpan("AuthenticationRepository.create")),

      update: (id, input) =>
        Effect.gen(function*() {
          yield* logger.info("AuthenticationRepository.update", { id, input });
          // TODO: Replace with actual database update using db
          yield* db.healthCheck().pipe(Effect.ignore);
          return { id, ...(input), updatedAt: new Date() };
        }).pipe(Effect.withSpan("AuthenticationRepository.update")),

      delete: (id) =>
        Effect.gen(function*() {
          yield* logger.info("AuthenticationRepository.delete", { id });
          // TODO: Replace with actual database delete using db
          yield* db.healthCheck().pipe(Effect.ignore);
        }).pipe(Effect.withSpan("AuthenticationRepository.delete")),

      exists: (id) =>
        Effect.gen(function*() {
          yield* logger.debug("AuthenticationRepository.exists", { id });
          // TODO: Replace with actual database check using db
          yield* db.healthCheck().pipe(Effect.ignore);
          return false;
        }).pipe(Effect.withSpan("AuthenticationRepository.exists")),

      count: (criteria) =>
        Effect.gen(function*() {
          yield* logger.debug("AuthenticationRepository.count", { criteria });
          // TODO: Replace with actual database count using db
          yield* db.healthCheck().pipe(Effect.ignore);
          return 0;
        }).pipe(Effect.withSpan("AuthenticationRepository.count")),
    }
  })
);

// ============================================================================
// Test Layer
// ============================================================================


/**
 * AuthenticationRepositoryTest Layer
 *
 * In-memory implementation for testing.
 */
export const AuthenticationRepositoryTest = Layer.effect(
  AuthenticationRepository,
  Effect.gen(function*() {
    const logger = yield* LoggingService;
    const store = new Map<string, unknown>();

    yield* logger.debug("AuthenticationRepository (Test) initialized");

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
            return yield* Effect.fail(new AuthenticationNotFoundError(id));
          }
          const updated = { ...existing, ...(input), updatedAt: new Date() };
          store.set(id, updated);
          return updated;
        }),

      delete: (id) =>
        Effect.gen(function*() {
          if (!store.has(id)) {
            return yield* Effect.fail(new AuthenticationNotFoundError(id));
          }
          store.delete(id);
        }),

      exists: (id) => Effect.succeed(store.has(id)),

      count: () => Effect.succeed(store.size),
    }
  })
);
