/**
 * Default database shape used by the infrastructure package.
 *
 * Applications can declaration-merge concrete table definitions into this
 * interface while the provider and repository helpers remain schema-agnostic.
 */
export interface DB {
  readonly [table: string]: Record<string, unknown>
}
