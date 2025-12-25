import { LoggingService, MetricsService } from "@samuelho-dev/infra-observability"

/**
 * User Authentication Service
 *
 * Service implementation for authentication operations within the user feature.

Uses Effect Context.Tag class pattern for proper dependency injection.
Integrates with infrastructure services (Logging, Metrics) and data-access layer.
 *
 * @module @samuelho-dev/feature-user/server/services/authentication
 */


import { Context, Effect, Layer, type Option } from "effect"

// ============================================================================
// Contract Imports (Contract-First Architecture)
// ============================================================================

// Errors are the SINGLE SOURCE OF TRUTH from contract library

import {
  AuthenticationOperationError,
  type AuthenticationError,
} from "@samuelho-dev/contract-user/authentication";

// ============================================================================
// Data Access Imports
// ============================================================================

import { AuthenticationRepository } from "@samuelho-dev/data-access-user/authentication";

// ============================================================================
// Infrastructure Imports
// ============================================================================


// ============================================================================
// Re-export Errors (Contract-First)
// ============================================================================

// Re-export errors from contract for convenience

export {
  AuthenticationNotFoundError,
  AuthenticationValidationError,
  AuthenticationOperationError,
  AuthenticationServiceError,
  type AuthenticationDomainError,
  type AuthenticationRepositoryError,
  type AuthenticationError,
} from "@samuelho-dev/contract-user/authentication";

// ============================================================================
// Service Interface
// ============================================================================


/**
 * AuthenticationService interface
 *
 * Business logic layer for authentication within the user feature.
 * Coordinates with repository and publishes domain events.
 */
export interface AuthenticationServiceInterface {
  /** Get by ID */
  readonly getById: (id: string) => Effect.Effect<Option.Option<unknown>, AuthenticationError>;

  /** List with pagination */
  readonly list: (criteria: unknown, pagination?: { page: number; pageSize: number }) => Effect.Effect<unknown, AuthenticationError>;

  /** Create new entity */
  readonly create: (input: unknown) => Effect.Effect<unknown, AuthenticationError>;

  /** Update existing entity */
  readonly update: (id: string, input: unknown) => Effect.Effect<unknown, AuthenticationError>;

  /** Delete entity */
  readonly delete: (id: string) => Effect.Effect<void, AuthenticationError>;
}

// ============================================================================
// Context.Tag Definition (Class Pattern)
// ============================================================================


/**
 * AuthenticationService Context.Tag
 *
 * Uses class-based Context.Tag for proper DI pattern.
 * Access via: `const service = yield* AuthenticationService;`
 */
export class AuthenticationService extends Context.Tag("AuthenticationService")<
  AuthenticationService,
  AuthenticationServiceInterface
>() {}

// ============================================================================
// Live Layer Implementation
// ============================================================================


/**
 * AuthenticationServiceLive Layer
 *
 * Production implementation with full infrastructure integration:
 * - AuthenticationRepository for data access
 * - LoggingService for structured logging
 * - MetricsService for observability
 */
export const AuthenticationServiceLive = Layer.effect(
  AuthenticationService,
  Effect.gen(function*() {
    const repo = yield* AuthenticationRepository;
    const logger = yield* LoggingService;
    const metrics = yield* MetricsService;

    yield* logger.debug("AuthenticationService initialized");

    // Map repository errors to service errors using Effect.catchAll
    // Repository errors are Data.TaggedError - use String() to extract message
    const mapRepoError = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
      effect.pipe(
        Effect.catchAll((error) =>
          Effect.fail(
            AuthenticationOperationError.create(
              "repository",
              String(error),
              error
            )
          )
        )
      );

    return {
      getById: (id) =>
        Effect.gen(function*() {
          const histogram = yield* metrics.histogram("authentication_get_duration_seconds");

          return yield* histogram.timer(
            Effect.gen(function*() {
              yield* logger.debug("AuthenticationService.getById", { id });
              return yield* mapRepoError(repo.findById(id));
            })
          );
        }).pipe(Effect.withSpan("AuthenticationService.getById")),

      list: (criteria, pagination) =>
        Effect.gen(function*() {
          const histogram = yield* metrics.histogram("authentication_list_duration_seconds");

          return yield* histogram.timer(
            Effect.gen(function*() {
              yield* logger.debug("AuthenticationService.list", { criteria, pagination });
              const skip = pagination ? (pagination.page - 1) * pagination.pageSize : 0;
              const limit = pagination?.pageSize ?? 20;
              return yield* mapRepoError(repo.findAll(criteria, { skip, limit }));
            })
          );
        }).pipe(Effect.withSpan("AuthenticationService.list")),

      create: (input) =>
        Effect.gen(function*() {
          const counter = yield* metrics.counter("authentication_created_total");
          const histogram = yield* metrics.histogram("authentication_create_duration_seconds");

          return yield* histogram.timer(
            Effect.gen(function*() {
              yield* logger.info("AuthenticationService.create", { input });
              const result = yield* mapRepoError(repo.create(input));
              yield* counter.increment;
              return result;
            })
          );
        }).pipe(Effect.withSpan("AuthenticationService.create")),

      update: (id, input) =>
        Effect.gen(function*() {
          const counter = yield* metrics.counter("authentication_updated_total");
          const histogram = yield* metrics.histogram("authentication_update_duration_seconds");

          return yield* histogram.timer(
            Effect.gen(function*() {
              yield* logger.info("AuthenticationService.update", { id, input });
              const result = yield* mapRepoError(repo.update(id, input));
              yield* counter.increment;
              return result;
            })
          );
        }).pipe(Effect.withSpan("AuthenticationService.update")),

      delete: (id) =>
        Effect.gen(function*() {
          const counter = yield* metrics.counter("authentication_deleted_total");
          const histogram = yield* metrics.histogram("authentication_delete_duration_seconds");

          return yield* histogram.timer(
            Effect.gen(function*() {
              yield* logger.info("AuthenticationService.delete", { id });
              yield* mapRepoError(repo.delete(id));
              yield* counter.increment;
            })
          );
        }).pipe(Effect.withSpan("AuthenticationService.delete")),
    } satisfies AuthenticationServiceInterface
  })
);
