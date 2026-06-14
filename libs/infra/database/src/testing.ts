/**
 * Testing Infrastructure
 *
 * Pre-composed layers and utilities for testing data-access libraries.
 *
 * @module @samuelho-dev/infra-database/testing
 */

// Error matchers for testing
export {
  assertFails,
  assertFailsWithTag,
  assertNone,
  assertSome,
  assertSuccess,
  createTestError,
  matchError,
  runToEither,
  type TestResult
} from './lib/testing/error-matchers'
// In-memory store for testing
export {
  createInMemoryStore,
  createTestTimestamp,
  generateTestId,
  type InMemoryStore,
  type InMemoryStoreOptions
} from './lib/testing/in-memory-store'
// Repository factory for testing
export {
  type CreateExtendedInMemoryRepositoryOptions,
  type CreateInMemoryRepositoryOptions,
  createExtendedInMemoryRepository,
  createInMemoryRepository,
  type ExtendedRepositoryInterface,
  type StandardRepositoryInterface
} from './lib/testing/repository-factory'
