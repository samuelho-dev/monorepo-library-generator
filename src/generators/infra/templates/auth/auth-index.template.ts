/**
 * Auth Infrastructure Index Template
 *
 * Generates the barrel export for auth infrastructure.
 *
 * Contract-First Architecture:
 * - infra-rpc defines AuthVerifier interface (Interface Segregation)
 * - infra-auth implements AuthVerifier via AuthVerifierLive layer
 * - Middleware is consolidated in infra-rpc (not duplicated here)
 *
 * @module monorepo-library-generator/infra-templates/auth/index
 */

import { TypeScriptBuilder } from "../../../../utils/code-builder"
import type { InfraTemplateOptions } from "../../../../utils/types"
import { WORKSPACE_CONFIG } from "../../../../utils/workspace-config"

/**
 * Generate auth index.ts file
 */
export function generateAuthIndexFile(options: InfraTemplateOptions) {
  const builder = new TypeScriptBuilder()
  const { packageName } = options
  const scope = WORKSPACE_CONFIG.getScope()

  builder.addFileHeader({
    title: "Auth Infrastructure Library",
    description: `Authentication infrastructure with session/token verification.

Contract-First Architecture:
- Consumes SupabaseAuth from provider-supabase
- Provides AuthService for auth operations
- Provides AuthVerifierLive layer for infra-rpc middleware

Integration with infra-rpc:
  import { AuthMiddlewareLive } from '${scope}/infra-rpc';
  import { AuthVerifierLive } from '${packageName}';

  // Compose layers
  const middleware = AuthMiddlewareLive.pipe(
    Layer.provide(AuthVerifierLive)
  );`
  })
  builder.addBlankLine()

  // Error exports
  builder.addSectionComment("Errors")
  builder.addBlankLine()

  builder.addRaw(`export {
  AuthError,
  UnauthorizedError,
  ForbiddenError,
  InvalidTokenError,
  SessionExpiredError,
  type AuthInfraError,
} from "./lib/errors";`)
  builder.addBlankLine()

  // Type exports
  builder.addSectionComment("Types")
  builder.addBlankLine()

  builder.addRaw(`export type {
  AuthContext,
} from "./lib/types";

export {
  AuthContextSchema,
} from "./lib/types";

// Re-export from provider for convenience
export type { AuthUser, AuthMethod } from "${scope}/provider-supabase";
export { AuthUserSchema } from "${scope}/provider-supabase";`)
  builder.addBlankLine()

  // Service exports
  builder.addSectionComment("Service")
  builder.addBlankLine()

  builder.addRaw(`export { AuthService, type AuthServiceInterface } from "./lib/service";`)
  builder.addBlankLine()

  // AuthVerifier implementation for infra-rpc
  builder.addSectionComment("AuthVerifier Implementation (for infra-rpc)")
  builder.addBlankLine()

  builder.addRaw(`export { AuthVerifierLive } from "./lib/service";`)
  builder.addBlankLine()

  // Usage example
  builder.addComment("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
  builder.addComment("Integration Example")
  builder.addComment("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
  builder.addComment("")
  builder.addComment("import { Layer } from 'effect';")
  builder.addComment(`import { AuthMiddlewareLive, AllMiddlewareLive } from '${scope}/infra-rpc';`)
  builder.addComment(`import { AuthVerifierLive, AuthService } from '${packageName}';`)
  builder.addComment(`import { SupabaseAuth } from '${scope}/provider-supabase';`)
  builder.addComment("")
  builder.addComment("// Compose auth layers for RPC middleware")
  builder.addComment("const RpcAuthLayer = AuthMiddlewareLive.pipe(")
  builder.addComment("  Layer.provide(AuthVerifierLive),")
  builder.addComment("  Layer.provide(AuthService.Live),")
  builder.addComment("  Layer.provide(SupabaseAuth.Live),")
  builder.addComment(");")
  builder.addComment("")
  builder.addComment("// Use with RPC router")
  builder.addComment("const router = MyRpcGroup.toRouter(handlers).pipe(")
  builder.addComment("  Effect.provide(RpcAuthLayer),")
  builder.addComment(");")
  builder.addComment("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

  return builder.toString()
}
