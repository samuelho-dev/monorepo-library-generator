import { Effect, Option, Result } from 'effect'

/**
 * Error Matchers
 *
 * Test utilities for asserting error conditions in Effect-based tests.
 * Provides type-safe error matching without exposing internals.
 *
 * @module @samuelho-dev/infra-database/testing
 */

/**
 * Result of running an effect that may fail
 */
export type TestResult<A, E> = Result.Result<A, E>

/**
 * Run an effect and capture the result as Either
 *
 * Useful for testing error cases without try/catch.
 *
 * @example
 * ```typescript
 * it.effect("should fail on duplicate email", () =>
 *   Effect.gen(function*() {
 *     const repo = yield* UserRepository
 *     yield* repo.create({ email: "test@example.com" })
 *
 *     const result = yield* runToEither(
 *       repo.create({ email: "test@example.com" })
 *     )
 *
 *     expect(Result.isFailure(result)).toBe(true)
 *     if (Result.isFailure(result)) {
 *       expect(result.failure._tag).toBe("UserAlreadyExistsError")
 *     }
 *   }).pipe(Effect.provide(Layer.fresh(TestUserRepository)))
 * )
 * ```
 */
export function runToEither<A, E, R>(effect: Effect.Effect<A, E, R>) {
  return Effect.result(effect)
}

/**
 * Assert that an effect succeeds
 *
 * Returns the success value or fails the test.
 *
 * @example
 * ```typescript
 * const user = yield* assertSuccess(repo.findById("id-123"))
 * expect(user).toBeDefined()
 * ```
 */
export function assertSuccess<A, E, R>(effect: Effect.Effect<A, E, R>) {
  return effect
}

/**
 * Assert that an effect fails with a specific error tag
 *
 * @example
 * ```typescript
 * yield* assertFailsWithTag(
 *   repo.create({ email: "duplicate@example.com" }),
 *   "UserAlreadyExistsError"
 * )
 * ```
 */
export function assertFailsWithTag<A, E extends { _tag: string }, R>(
  effect: Effect.Effect<A, E, R>,
  expectedTag: E['_tag']
) {
  return Effect.gen(function* () {
    const result = yield* Effect.result(effect)

    if (Result.isSuccess(result)) {
      return yield* Effect.die(
        new Error(`Expected effect to fail with ${expectedTag}, but it succeeded`)
      )
    }

    const error = result.failure
    if (error._tag !== expectedTag) {
      return yield* Effect.die(
        new Error(`Expected error tag ${expectedTag}, but got ${error._tag}`)
      )
    }

    return error
  })
}

/**
 * Assert that an effect fails (with any error)
 *
 * @example
 * ```typescript
 * const error = yield* assertFails(repo.findById("invalid"))
 * expect(error).toBeDefined()
 * ```
 */
export function assertFails<A, E, R>(effect: Effect.Effect<A, E, R>) {
  return Effect.gen(function* () {
    const result = yield* Effect.result(effect)

    if (Result.isSuccess(result)) {
      return yield* Effect.die(new Error('Expected effect to fail, but it succeeded'))
    }

    return result.failure
  })
}

/**
 * Assert that an Option is Some and return the value
 *
 * @example
 * ```typescript
 * const result = yield* repo.findById("id-123")
 * const user = assertSome(result)
 * expect(user.name).toBe("Alice")
 * ```
 */
export function assertSome<A>(option: Option.Option<A>) {
  if (Option.isNone(option)) {
    throw new Error('Expected Option to be Some, but got None')
  }
  return option.value
}

/**
 * Assert that an Option is None
 *
 * @example
 * ```typescript
 * const result = yield* repo.findById("non-existent")
 * assertNone(result)
 * ```
 */
export function assertNone<A>(option: Option.Option<A>) {
  if (Option.isSome(option)) {
    throw new Error('Expected Option to be None, but got Some')
  }
}

/**
 * Match an error and extract data
 *
 * Type-safe error pattern matching for tests.
 *
 * @example
 * ```typescript
 * const result = yield* runToEither(repo.create({ email: "dup@test.com" }))
 *
 * matchError(result, {
 *   UserAlreadyExistsError: (err) => {
 *     expect(err.email).toBe("dup@test.com")
 *   },
 *   _: () => {
 *     throw new Error("Unexpected error type")
 *   }
 * })
 * ```
 */
export function matchError<A, E extends { _tag: string }>(
  result: Result.Result<A, E>,
  handlers: {
    [K in E['_tag']]?: (error: Extract<E, { _tag: K }>) => void
  } & { _?: (error: E) => void }
) {
  if (Result.isSuccess(result)) {
    throw new Error('Expected effect to fail, but it succeeded')
  }

  const error = result.failure
  const handler = handlers[error._tag as E['_tag']]

  if (handler) {
    // Safe cast: we've matched the tag, so error is the correct Extract type
    handler(error as Extract<E, { _tag: typeof error._tag }>)
  } else if (handlers._) {
    handlers._(error)
  } else {
    throw new Error(`No handler for error tag: ${error._tag}`)
  }
}

/**
 * Create a test error with minimal required fields
 *
 * @example
 * ```typescript
 * const error = createTestError("UserNotFoundError", { userId: "123" })
 * ```
 */
export function createTestError<Tag extends string, Props extends Record<string, unknown>>(
  tag: Tag,
  props: Props
) {
  return {
    _tag: tag,
    ...props
  }
}
