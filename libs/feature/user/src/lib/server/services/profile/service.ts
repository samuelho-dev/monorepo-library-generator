import { ProfileOperationError, parseProfile } from "@samuelho-dev/contract-user/profile"
import type { Profile, ProfileError } from "@samuelho-dev/contract-user/profile"
import { UserRepository } from "@samuelho-dev/data-access-user"
import type { UserFilter } from "@samuelho-dev/data-access-user"
import type { DatabaseService } from "@samuelho-dev/infra-database"
import { LoggingService, MetricsService } from "@samuelho-dev/infra-observability"
import { Context, Effect, Layer, Option } from "effect"

/**
 * User Profile Service
 *
 * Service implementation for profile operations within the user feature.

Uses Effect Context.Tag class pattern for proper dependency injection.
Integrates with infrastructure services (Logging, Metrics) and data-access layer.
 *
 * @module @samuelho-dev/feature-user/server/services/profile
 */
// ============================================================================
// Contract Imports (Contract-First Architecture)
// ============================================================================
// Sub-module entity schema for transforming repository data
// Schema class is type-only (for typeof), parse function and error class are runtime
// ============================================================================
// Type Definitions
// ============================================================================
/**
 * Sub-module entity type (from contract schema)
 * Service transforms repository data to this shape for RPC responses
 */
type ProfileEntity = typeof Profile.Type

// ============================================================================
// Data Access Imports
// ============================================================================
// ============================================================================
// Infrastructure Imports
// ============================================================================
// DatabaseService requirement flows from repository operations
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
  readonly getById: (id: string) => Effect.Effect<Option.Option<ProfileEntity>, ProfileError, DatabaseService>

  /** List with pagination - returns paginated response matching RPC contract */
  readonly list: (filter: UserFilter | undefined, pagination?: { readonly page: number; readonly pageSize: number }) => Effect.Effect<{
    readonly items: ReadonlyArray<ProfileEntity>
    readonly total: number
    readonly page: number
    readonly pageSize: number
  }, ProfileError, DatabaseService>

  /** Create new entity - accepts partial input, service adds defaults */
  readonly create: (input: Record<string, unknown>) => Effect.Effect<ProfileEntity, ProfileError, DatabaseService>

  /** Update existing entity - partial input for selective updates */
  readonly update: (id: string, input: Record<string, unknown>) => Effect.Effect<ProfileEntity, ProfileError, DatabaseService>

  /** Delete entity */
  readonly delete: (id: string) => Effect.Effect<void, ProfileError, DatabaseService>
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
 * - UserRepository for data access (via parent)
 * - LoggingService for structured logging
 * - MetricsService for observability
 */
export const ProfileServiceLive = Layer.effect(
  ProfileService,
  Effect.gen(function*() {
    const repo = yield* UserRepository
    const logger = yield* LoggingService
    const metrics = yield* MetricsService

    yield* logger.debug("ProfileService initialized")

    // Transform repository entity to sub-module entity using Effect-based parsing
    // The parse function validates and applies schema defaults
    // Using 'unknown' input allows the schema to validate the shape
    const toEntity = (data: unknown): Effect.Effect<ProfileEntity, ProfileError> =>
      parseProfile(data).pipe(
        Effect.mapError((parseError) =>
          ProfileOperationError.create("validation", String(parseError), parseError)
        )
      )

    // Map sub-module input to parent repository input
    // TODO: Customize this mapping based on your domain
    // The parent repository expects parent entity fields (e.g., User fields)
    // Extract and transform sub-module fields to parent-compatible shape
    // Use bracket notation for noUncheckedIndexedAccess compliance
    const toRepoCreateInput = (input: Record<string, unknown>) => ({
      // Extract fields compatible with parent repository
      // Add required parent fields with defaults if not in sub-module input
      name: typeof input["name"] === "string" ? input["name"] : "",
      email: typeof input["email"] === "string" ? input["email"] : `${Date.now()}@generated.local`,
      updatedAt: new Date()
    })

    const toRepoUpdateInput = (input: Record<string, unknown>) => {
      const result: Record<string, unknown> = {}
      if (typeof input["name"] === "string") result["name"] = input["name"]
      if (typeof input["email"] === "string") result["email"] = input["email"]
      return result
    }

    return {
      getById: (id) =>
        Effect.gen(function*() {
          const histogram = yield* metrics.histogram("profile_get_duration_seconds")

          return yield* histogram.timer(
            Effect.gen(function*() {
              yield* logger.debug("ProfileService.getById", { id })
              const result = yield* repo.findById(id).pipe(
                Effect.catchAll((error) =>
                  Effect.fail(ProfileOperationError.create("repository", String(error), error))
                )
              )
              if (Option.isNone(result)) {
                return Option.none()
              }
              const entity = yield* toEntity(result.value)
              return Option.some(entity)
            })
          )
        }).pipe(Effect.withSpan("ProfileService.getById")),

      list: (filter, pagination) =>
        Effect.gen(function*() {
          const histogram = yield* metrics.histogram("profile_list_duration_seconds")

          return yield* histogram.timer(
            Effect.gen(function*() {
              yield* logger.debug("ProfileService.list", { filter, pagination })
              const page = pagination?.page ?? 1
              const pageSize = pagination?.pageSize ?? 20
              const skip = (page - 1) * pageSize

              // Repository returns { items, total, hasMore }
              const result = yield* repo.findAll(filter, { skip, limit: pageSize }).pipe(
                Effect.catchAll((error) =>
                  Effect.fail(ProfileOperationError.create("repository", String(error), error))
                )
              )

              // Transform each item using Effect.forEach on the items array
              const items = yield* Effect.forEach(result.items, toEntity)

              // Return paginated response matching RPC contract shape
              return {
                items,
                total: result.total,
                page,
                pageSize
              }
            })
          )
        }).pipe(Effect.withSpan("ProfileService.list")),

      create: (input) =>
        Effect.gen(function*() {
          const counter = yield* metrics.counter("profile_created_total")
          const histogram = yield* metrics.histogram("profile_create_duration_seconds")

          return yield* histogram.timer(
            Effect.gen(function*() {
              yield* logger.info("ProfileService.create", { input })
              // Map sub-module input to parent repository input
              const repoInput = toRepoCreateInput(input)
              const result = yield* repo.create(repoInput).pipe(
                Effect.catchAll((error) =>
                  Effect.fail(ProfileOperationError.create("repository", String(error), error))
                )
              )
              yield* counter.increment
              return yield* toEntity(result)
            })
          )
        }).pipe(Effect.withSpan("ProfileService.create")),

      update: (id, input) =>
        Effect.gen(function*() {
          const counter = yield* metrics.counter("profile_updated_total")
          const histogram = yield* metrics.histogram("profile_update_duration_seconds")

          return yield* histogram.timer(
            Effect.gen(function*() {
              yield* logger.info("ProfileService.update", { id, input })
              // Map sub-module input to parent repository input
              const repoInput = toRepoUpdateInput(input)
              const result = yield* repo.update(id, repoInput).pipe(
                Effect.catchAll((error) =>
                  Effect.fail(ProfileOperationError.create("repository", String(error), error))
                )
              )
              yield* counter.increment
              return yield* toEntity(result)
            })
          )
        }).pipe(Effect.withSpan("ProfileService.update")),

      delete: (id) =>
        Effect.gen(function*() {
          const counter = yield* metrics.counter("profile_deleted_total")
          const histogram = yield* metrics.histogram("profile_delete_duration_seconds")

          return yield* histogram.timer(
            Effect.gen(function*() {
              yield* logger.info("ProfileService.delete", { id })
              yield* repo.delete(id).pipe(
                Effect.catchAll((error) =>
                  Effect.fail(ProfileOperationError.create("repository", String(error), error))
                )
              )
              yield* counter.increment
            })
          )
        }).pipe(Effect.withSpan("ProfileService.delete"))
    }
  })
)