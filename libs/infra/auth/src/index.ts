/**
 * Auth Infrastructure
 * @module @samuelho-dev/infra-auth
 */

export { AdminAuth, type AdminAuthShape } from './lib/admin-auth'
export {
  AuthError,
  type AuthServiceError,
  ForbiddenError,
  InvalidApiKeyError,
  InvalidTokenError,
  SessionExpiredError,
  UnauthorizedError
} from './lib/errors'
export {
  AuthService,
  type AuthServiceInterface,
  type AuthUserData,
  AuthVerifier,
  AuthVerifierLive,
  AuthVerifierTest
} from './lib/service'
export type { AuthContext } from './lib/types'
