import { UserError } from "../../shared/errors"
import { Context, Effect, Layer, Option } from "effect"

/**
 * User Service Interface
 *
 * Context.Tag definition for UserService.

Operations are split into separate files for optimal tree-shaking.
Import only the operations you need for smallest bundle size.
 *
 * @module @myorg/feature-user/server/service
 */




// ============================================================================
// Repository Integration
// ============================================================================

import { UserRepository } from "@myorg/data-access-user";
import { DatabaseService } from "@myorg/infra-database";

// ============================================================================
// Service Implementation
// ============================================================================


const createServiceImpl = (repo: Effect.Effect.Success<typeof UserRepository>) => ({
  get: (id: string) =>
    repo.findById(id).pipe(
      Effect.mapError((error) =>
        new UserError({
          message: `Failed to get user: ${id}`,
          code: "INTERNAL_ERROR",
          cause: error,
        })
      )
    ),

  findByCriteria: (
    criteria: Record<string, unknown>,
    offset: number,
    limit: number
  ) =>
    repo
      .findAll(criteria as Parameters<typeof repo.findAll>[0], { skip: offset, limit })
      .pipe(
        Effect.map((result) => result.items),
        Effect.mapError((error) =>
          new UserError({
            message: "Failed to find user records",
            code: "INTERNAL_ERROR",
            cause: error,
          })
        )
      ),

  count: (criteria: Record<string, unknown>) =>
    repo.count(criteria as Parameters<typeof repo.count>[0]).pipe(
      Effect.mapError((error) =>
        new UserError({
          message: "Failed to count user records",
          code: "INTERNAL_ERROR",
          cause: error,
        })
      )
    ),

  create: (input: Record<string, unknown>) =>
    repo.create(input as Parameters<typeof repo.create>[0]).pipe(
      Effect.mapError((error) =>
        new UserError({
          message: "Failed to create user",
          code: "INTERNAL_ERROR",
          cause: error,
        })
      )
    ),

  update: (id: string, input: Record<string, unknown>) =>
    repo.update(id, input as Parameters<typeof repo.update>[1]).pipe(
      Effect.map(Option.some),
      Effect.mapError((error) =>
        new UserError({
          message: `Failed to update user: ${id}`,
          code: "INTERNAL_ERROR",
          cause: error,
        })
      )
    ),

  delete: (id: string) =>
    repo.delete(id).pipe(
      Effect.mapError((error) =>
        new UserError({
          message: `Failed to delete user: ${id}`,
          code: "INTERNAL_ERROR",
          cause: error,
        })
      )
    ),

  exists: (id: string) =>
    repo.exists(id).pipe(
      Effect.mapError((error) =>
        new UserError({
          message: `Failed to check existence: ${id}`,
          code: "INTERNAL_ERROR",
          cause: error,
        })
      )
    ),
} as const);

export type UserServiceInterface = ReturnType<typeof createServiceImpl>;

// ============================================================================
// Context.Tag
// ============================================================================


export class UserService extends Context.Tag("UserService")<
  UserService,
  UserServiceInterface
>() {
  static readonly Live = Layer.effect(
    this,
    Effect.gen(function* () {
      const repo = yield* UserRepository;
      return createServiceImpl(repo);
    })
  );

  static readonly Layer = UserService.Live.pipe(
    Layer.provide(UserRepository.Live),
    Layer.provide(DatabaseService.Live)
  );

  static readonly TestLayer = UserService.Live.pipe(
    Layer.provide(UserRepository.Live),
    Layer.provide(DatabaseService.Test)
  );
}