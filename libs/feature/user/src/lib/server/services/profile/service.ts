import { LoggingService, MetricsService } from "@samuelho-dev/infra-observability"

/**
 * User Profile Service
 *
 * Service implementation for profile operations within the user feature.

Uses Effect Context.Tag class pattern for proper dependency injection.
Integrates with infrastructure services (Logging, Metrics) and data-access layer.
 *
 * @module @samuelho-dev/feature-user/server/services/profile
 */


import { Context, Effect, Layer, type Option } from "effect"

// ============================================================================
// Contract Imports (Contract-First Architecture)
// ============================================================================

// Errors are the SINGLE SOURCE OF TRUTH from contract library

import {
  ProfileOperationError,
  type ProfileError,
} from "@samuelho-dev/contract-user/profile";

// ============================================================================
// Data Access Imports
// ============================================================================

import { ProfileRepository } from "@samuelho-dev/data-access-user/profile";

// ============================================================================
// Infrastructure Imports
// ============================================================================


// ============================================================================
// Re-export Errors (Contract-First)
// ============================================================================

// Re-export errors from contract for convenience

export {
  ProfileNotFoundError,
  ProfileValidationError,
  ProfileOperationError,
  ProfileServiceError,
  type ProfileDomainError,
  type ProfileRepositoryError,
  type ProfileError,
} from "@samuelho-dev/contract-user/profile";

// ============================================================================
// Service Interface
// ============================================================================


/**
 * ProfileService interface
 *
 * Business logic layer for profile within the user feature.
 * Coordinates with repository and publishes domain events.
 */
export interface ProfileServiceInterface {
  /** Get by ID */
  readonly getById: (id: string) => Effect.Effect<Option.Option<unknown>, ProfileError>;

  /** List with pagination */
  readonly list: (criteria: unknown, pagination?: { page: number; pageSize: number }) => Effect.Effect<unknown, ProfileError>;

  /** Create new entity */
  readonly create: (input: unknown) => Effect.Effect<unknown, ProfileError>;

  /** Update existing entity */
  readonly update: (id: string, input: unknown) => Effect.Effect<unknown, ProfileError>;

  /** Delete entity */
  readonly delete: (id: string) => Effect.Effect<void, ProfileError>;
}

// ============================================================================
// Context.Tag Definition (Class Pattern)
// ============================================================================


/**
 * ProfileService Context.Tag
 *
 * Uses class-based Context.Tag for proper DI pattern.
 * Access via: `const service = yield* ProfileService;`
 */
export class ProfileService extends Context.Tag("ProfileService")<
  ProfileService,
  ProfileServiceInterface
>() {}

// ============================================================================
// Live Layer Implementation
// ============================================================================


/**
 * ProfileServiceLive Layer
 *
 * Production implementation with full infrastructure integration:
 * - ProfileRepository for data access
 * - LoggingService for structured logging
 * - MetricsService for observability
 */
export const ProfileServiceLive = Layer.effect(
  ProfileService,
  Effect.gen(function*() {
    const repo = yield* ProfileRepository;
    const logger = yield* LoggingService;
    const metrics = yield* MetricsService;

    yield* logger.debug("ProfileService initialized");

    // Map repository errors to service errors using Effect.catchAll
    // Repository errors are Data.TaggedError - use String() to extract message
    const mapRepoError = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
      effect.pipe(
        Effect.catchAll((error) =>
          Effect.fail(
            ProfileOperationError.create(
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
          const histogram = yield* metrics.histogram("profile_get_duration_seconds");

          return yield* histogram.timer(
            Effect.gen(function*() {
              yield* logger.debug("ProfileService.getById", { id });
              return yield* mapRepoError(repo.findById(id));
            })
          );
        }).pipe(Effect.withSpan("ProfileService.getById")),

      list: (criteria, pagination) =>
        Effect.gen(function*() {
          const histogram = yield* metrics.histogram("profile_list_duration_seconds");

          return yield* histogram.timer(
            Effect.gen(function*() {
              yield* logger.debug("ProfileService.list", { criteria, pagination });
              const skip = pagination ? (pagination.page - 1) * pagination.pageSize : 0;
              const limit = pagination?.pageSize ?? 20;
              return yield* mapRepoError(repo.findAll(criteria, { skip, limit }));
            })
          );
        }).pipe(Effect.withSpan("ProfileService.list")),

      create: (input) =>
        Effect.gen(function*() {
          const counter = yield* metrics.counter("profile_created_total");
          const histogram = yield* metrics.histogram("profile_create_duration_seconds");

          return yield* histogram.timer(
            Effect.gen(function*() {
              yield* logger.info("ProfileService.create", { input });
              const result = yield* mapRepoError(repo.create(input));
              yield* counter.increment;
              return result;
            })
          );
        }).pipe(Effect.withSpan("ProfileService.create")),

      update: (id, input) =>
        Effect.gen(function*() {
          const counter = yield* metrics.counter("profile_updated_total");
          const histogram = yield* metrics.histogram("profile_update_duration_seconds");

          return yield* histogram.timer(
            Effect.gen(function*() {
              yield* logger.info("ProfileService.update", { id, input });
              const result = yield* mapRepoError(repo.update(id, input));
              yield* counter.increment;
              return result;
            })
          );
        }).pipe(Effect.withSpan("ProfileService.update")),

      delete: (id) =>
        Effect.gen(function*() {
          const counter = yield* metrics.counter("profile_deleted_total");
          const histogram = yield* metrics.histogram("profile_delete_duration_seconds");

          return yield* histogram.timer(
            Effect.gen(function*() {
              yield* logger.info("ProfileService.delete", { id });
              yield* mapRepoError(repo.delete(id));
              yield* counter.increment;
            })
          );
        }).pipe(Effect.withSpan("ProfileService.delete")),
    } satisfies ProfileServiceInterface
  })
);
