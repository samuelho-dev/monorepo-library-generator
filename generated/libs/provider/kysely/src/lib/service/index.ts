/**
 * Kysely Service
 *
 * Service barrel exports for Kysely query builder provider.

Import options:

1. Service tag with query/transaction methods:
   import { Kysely } from '@scope/provider-kysely'

2. Type-only for type annotations:
   import type { Database, KyselyServiceInterface } from '@scope/provider-kysely'

3. Direct service import:
   import { Kysely } from '@scope/provider-kysely/service'
 *
 * @module @myorg/provider-kysely/service
 */

// ============================================================================
// Re-export service interface, tag, and Database type
// ============================================================================

export type { Database, KyselyServiceInterface } from "./service";
export { Kysely } from "./service";
