/**
 * Repository Combinators
 *
 * Folds the per-method data-access envelope — run query → enrich driver failure
 * into a {@link DatabaseError} carrying the operation/entity/identifiers → wrap
 * in an observability span — into three combinators bound to a service key.
 *
 * Without these, every DA method hand-writes the same ~14-line envelope:
 *
 * ```typescript
 * const findById = (id: DisputeId) =>
 *   database
 *     .query((db) => db.selectFrom('dispute').where('id', '=', id).selectAll().executeTakeFirst())
 *     .pipe(
 *       Effect.mapError((error) => new DatabaseError({
 *         message: 'Failed to find dispute by ID', operation: 'findById',
 *         entity: 'dispute', identifiers: { id }, cause: error
 *       })),
 *       Effect.map(Option.fromNullishOr),
 *       Effect.withSpan('DisputeDataAccess.findById')
 *     )
 * ```
 *
 * With a repository the same method is:
 *
 * ```typescript
 * const repo = makeRepository(database, DisputeDataAccess.key)
 * const findById = (id: DisputeId) =>
 *   repo.queryOne('dispute', 'findById', { id },
 *     (db) => db.selectFrom('dispute').where('id', '=', id).selectAll())
 * ```
 *
 * The `message`, span name, and span attributes are *derived*, never stored.
 * The driver error's `cause` is preserved unchanged, so `DatabaseError`
 * helpers that inspect it — e.g. `isUniqueViolation(constraint)` — keep working.
 *
 * Combinators run the Kysely terminal themselves (callers pass the builder up to
 * but not including `.execute*()`), so a single builder shape feeds all three:
 * `queryOne` → `executeTakeFirst` (→ `Option`), `queryMany` → `execute` (→ array),
 * `queryMutate` → `executeTakeFirstOrThrow` (→ row).
 *
 * @module @samuelho-dev/infra-database/repository
 */

import { DatabaseError } from '@samuelho-dev/contract-database'
import { type Context, Effect, Option } from 'effect'
import type { Compilable, InferResult, Kysely } from 'kysely'
import type { DB } from './schema'
import type { DatabaseService } from './service'

/**
 * The slice of {@link DatabaseService} a repository needs. Declared structurally
 * (not by importing the service value) so `makeRepository` stays a pure function
 * usable from any layer-build site that has already acquired the service.
 */
type DatabaseQuery = Pick<Context.Service.Shape<typeof DatabaseService>, 'query'>

/**
 * Identifier values attached to a `DatabaseError` and emitted as span
 * attributes. Branded id strings (`string & Brand<…>`) satisfy `string`.
 */
type Identifiers = Record<string, string>

/**
 * A Kysely builder that has selected its output shape `O` but not yet run a
 * terminal. Every concrete builder (select/insert/update/delete) implements
 * `Compilable<O>` and carries the three terminals below with these exact return
 * shapes (`SimplifySingleResult<O>` = `O | undefined`, `Simplify<O>[]` for the
 * array form). Typing them here — rather than redeclaring Kysely's `Simplify*`
 * utilities — keeps the combinators terminal-agnostic and fully typed off the
 * builder alone; `RowOf<B>` recovers the resolved row via Kysely's own
 * `InferResult`.
 *
 * The combinator supplies the terminal; `Buildable` is the contract the caller's
 * `(db) => …` thunk must return.
 */
interface Buildable<O> extends Compilable<O> {
  executeTakeFirst(): Promise<O | undefined>
  execute(): Promise<readonly O[]>
  executeTakeFirstOrThrow(): Promise<O>
}

/** Row type Kysely resolves for a single result of builder `B`. */
type RowOf<B> = B extends Compilable<unknown> ? InferResult<B>[number] : never

const enrich =
  (operation: string, entity: string, identifiers: Identifiers) =>
  (cause: DatabaseError): DatabaseError =>
    new DatabaseError({
      message: `Failed to ${operation} ${entity}`,
      operation,
      entity,
      identifiers,
      cause
    })

const spanOptions = (entity: string, operation: string, identifiers: Identifiers) => ({
  attributes: {
    'db.entity': entity,
    'db.operation': operation,
    ...prefixIds(identifiers)
  }
})

const prefixIds = (identifiers: Identifiers): Record<string, string> => {
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(identifiers)) out[`db.id.${key}`] = value
  return out
}

/**
 * Build the three query combinators bound to `database` and a service key.
 *
 * @param database - the acquired {@link DatabaseService} (its `query` member).
 * @param serviceKey - `Context.Service` key, used as the span-name prefix
 *   (e.g. `'@samuelho-dev/data-access-payment/DisputeDataAccess'`).
 */
export const makeRepository = (database: DatabaseQuery, serviceKey: string) => {
  const span = (operation: string) => `${serviceKey}.${operation}`

  /**
   * Single row → `Option`. Maps a missing row to `None` (never an error).
   * Driver failures enrich into `DatabaseError`.
   */
  const queryOne = <B extends Buildable<unknown>>(
    entity: keyof DB & string,
    operation: string,
    identifiers: Identifiers,
    build: (db: Kysely<DB>) => B
  ): Effect.Effect<Option.Option<RowOf<B>>, DatabaseError> =>
    database
      .query((db) => build(db).executeTakeFirst())
      .pipe(
        Effect.mapError(enrich(operation, entity, identifiers)),
        Effect.map((row) => Option.fromNullishOr(row as RowOf<B> | null | undefined)),
        Effect.withSpan(span(operation), spanOptions(entity, operation, identifiers))
      )

  /** Many rows → array. Empty result is a valid `[]`, not an error. */
  const queryMany = <B extends Buildable<unknown>>(
    entity: keyof DB & string,
    operation: string,
    identifiers: Identifiers,
    build: (db: Kysely<DB>) => B
  ): Effect.Effect<readonly RowOf<B>[], DatabaseError> =>
    database
      .query((db) => build(db).execute())
      .pipe(
        Effect.mapError(enrich(operation, entity, identifiers)),
        Effect.map((rows) => rows as readonly RowOf<B>[]),
        Effect.withSpan(span(operation), spanOptions(entity, operation, identifiers))
      )

  /**
   * Mutation returning exactly one row (insert/update/delete with
   * `.returningAll()`). A missing row (Kysely `NoResultError`) enriches into
   * `DatabaseError` like any other driver failure.
   */
  const queryMutate = <B extends Buildable<unknown>>(
    entity: keyof DB & string,
    operation: string,
    identifiers: Identifiers,
    build: (db: Kysely<DB>) => B
  ): Effect.Effect<RowOf<B>, DatabaseError> =>
    database
      .query((db) => build(db).executeTakeFirstOrThrow())
      .pipe(
        Effect.mapError(enrich(operation, entity, identifiers)),
        Effect.map((row) => row as RowOf<B>),
        Effect.withSpan(span(operation), spanOptions(entity, operation, identifiers))
      )

  return { queryOne, queryMany, queryMutate } as const
}

export type Repository = ReturnType<typeof makeRepository>
