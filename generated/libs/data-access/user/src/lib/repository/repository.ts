import { aggregateOperations } from "./operations/aggregate"
import { createOperations } from "./operations/create"
import { deleteOperations } from "./operations/delete"
import { readOperations } from "./operations/read"
import { updateOperations } from "./operations/update"
import { Chunk, Context, Effect, Layer, Option, Stream } from "effect"

/**
 * User Repository
 *
 * Context.Tag definition for UserRepository.

ARCHITECTURE PATTERN:
- Operations split into separate files for bundle optimization
- Return types are inferred to preserve Effect's dependency tracking
- Use repository.streamAll() for large datasets
- Tests provide DatabaseService.Test, not a separate Repository.Test

@see repository/operations/* for implementation details
 *
 * @module @myorg/data-access-user/repository
 */




// Import operation implementations


// ============================================================================
// Repository Context.Tag
// ============================================================================


/**
 * User Repository implementation
 *
 * Combines all CRUD + aggregate operations into a single repository object.
 * Operations require DatabaseService which is provided via Layer composition.
 */
const repositoryImpl = {
  ...createOperations,
  ...readOperations,
  ...updateOperations,
  ...deleteOperations,
  ...aggregateOperations,

  streamAll: (options?: { batchSize?: number }) => {
    const batchSize = options?.batchSize ?? 100;
    return Stream.paginateChunkEffect(0, (offset) =>
      readOperations.findAll(undefined, { skip: offset, limit: batchSize }).pipe(
        Effect.map((result) => {
          const chunk = Chunk.fromIterable(result.items);
          const next = result.hasMore ? Option.some(offset + batchSize) : Option.none();
          return [chunk, next] as const;
        })
      )
    );
  },
} as const;

export type UserRepositoryInterface = typeof repositoryImpl;

/**
 * User Repository Tag
 *
 * Access via: yield* UserRepository
 *
 * @example
 * ```typescript
 * // Production
 * Effect.provide(UserRepository.Live.pipe(
 *   Layer.provide(DatabaseService.Live)
 * ))
 *
 * // Testing - provide test infrastructure
 * Effect.provide(UserRepository.Live.pipe(
 *   Layer.provide(DatabaseService.Test)
 * ))
 * ```
 */
export class UserRepository extends Context.Tag("UserRepository")<
  UserRepository,
  UserRepositoryInterface
>() {
  static readonly Live = Layer.succeed(this, repositoryImpl);
}