/**
 * User RPC Errors
 *
 * Re-exports errors from shared/errors for RPC consumers.

All errors use Schema.TaggedError - no separate RPC error types needed.
This ensures a single source of truth for error definitions.
 *
 */

// Re-export all errors from shared/errors
// All errors use Schema.TaggedError for RPC compatibility
export { UserError, UserErrorCodes } from "../shared/errors";
export type { UserErrorCode } from "../shared/errors";
