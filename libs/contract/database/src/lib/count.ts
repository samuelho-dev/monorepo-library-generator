/**
 * Canonical DB count/aggregate decode.
 *
 * Postgres `COUNT(*)` / `SUM(...)` return bigint, surfaced by the driver as a
 * JS `number`, `bigint`, or numeric `string` depending on magnitude and config
 * (Kysely's `.count<number>()` annotation is optimistic). This single schema
 * accepts all three on the Encoded side and decodes to a `number` Type, so
 * count fields stop re-inventing the 3-way `Schema.Union([Number, BigInt,
 * String])` and DA layers stop sprinkling bare `Number(row.count)` coercions.
 *
 * @module @samuelho-dev/contract-database/count
 */

import { Schema, SchemaGetter } from 'effect'

/** A DB count/aggregate: Encoded `number | bigint | string`, Type `number`. */
export const CountFromDb = Schema.Union([Schema.Number, Schema.BigInt, Schema.String]).pipe(
  Schema.decodeTo(Schema.Number, {
    decode: SchemaGetter.transform((input: number | bigint | string) => Number(input)),
    encode: SchemaGetter.transform((n: number) => n)
  })
)
export type CountFromDb = typeof CountFromDb.Type
