/**
 * Auth Infrastructure Index Template
 *
 * Generates the barrel export for auth infrastructure.
 *
 * @module monorepo-library-generator/infra-templates/auth/index
 */

import { TypeScriptBuilder } from '../../../../utils/code-builder';
import type { InfraTemplateOptions } from '../../../../utils/types';
import { WORKSPACE_CONFIG } from '../../../../utils/workspace-config';

/**
 * Generate auth index.ts file
 */
export function generateAuthIndexFile(options: InfraTemplateOptions) {
  const builder = new TypeScriptBuilder();
  const { packageName } = options;
  const scope = WORKSPACE_CONFIG.getScope();

  builder.addFileHeader({
    title: 'Auth Infrastructure Library',
    description: `Authentication infrastructure with session/token verification and RPC middleware.

This library:
- Consumes SupabaseAuth from provider-supabase
- Provides AuthService for auth operations
- Exports middleware and handler factories for infra-rpc

Usage:
  import { AuthService, protectedHandler, publicHandler } from '${packageName}';`,
  });
  builder.addBlankLine();

  // Error exports
  builder.addSectionComment('Errors');
  builder.addBlankLine();

  builder.addRaw(`export {
  AuthError,
  UnauthorizedError,
  ForbiddenError,
  InvalidTokenError,
  SessionExpiredError,
  type AuthInfraError,
} from "./lib/service/errors";`);
  builder.addBlankLine();

  // Type exports
  builder.addSectionComment('Types');
  builder.addBlankLine();

  builder.addRaw(`export type {
  AuthContext,
  RequestMeta,
} from "./lib/service/types";

export {
  AuthContextSchema,
  RequestMetaSchema,
} from "./lib/service/types";

// Re-export from provider for convenience
export type { AuthUser, AuthMethod } from "${scope}/provider-supabase";
export { AuthUserSchema } from "${scope}/provider-supabase";`);
  builder.addBlankLine();

  // Service exports
  builder.addSectionComment('Service');
  builder.addBlankLine();

  builder.addRaw(`export { AuthService, type AuthServiceInterface } from "./lib/service/service";`);
  builder.addBlankLine();

  // Middleware exports
  builder.addSectionComment('Middleware & Handler Factories');
  builder.addBlankLine();

  builder.addRaw(`export {
  // Context Tags
  CurrentUser,
  OptionalUser,
  AuthContextTag,
  RequestMetaTag,
  AuthMethodTag,
  // Context Types
  type ProtectedHandlerContext,
  type PublicHandlerContext,
  // Middleware creators
  createAuthMiddleware,
  createPublicMiddleware,
  extractRequestMeta,
  // Handler factories
  protectedHandler,
  publicHandler,
} from "./lib/service/middleware";`);
  builder.addBlankLine();

  // Usage example
  builder.addComment('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  builder.addComment('Usage Examples');
  builder.addComment('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  builder.addComment('');
  builder.addComment("import { Effect, Option } from 'effect';");
  builder.addComment(
    `import { AuthService, protectedHandler, publicHandler } from '${packageName}';`,
  );
  builder.addComment('');
  builder.addComment('// Protected handler - requires authentication');
  builder.addComment('const getProfile = protectedHandler<{ id: string }, Profile, Error>(');
  builder.addComment('  ({ ctx, input }) =>');
  builder.addComment('    Effect.gen(function* () {');
  builder.addComment('      console.log(`User ${ctx.user.name} requested profile ${input.id}`);');
  builder.addComment('      return yield* profileRepository.findById(input.id);');
  builder.addComment('    })');
  builder.addComment(');');
  builder.addComment('');
  builder.addComment('// Public handler - optional authentication');
  builder.addComment('const listProducts = publicHandler<{ page: number }, Product[], Error>(');
  builder.addComment('  ({ ctx, input }) =>');
  builder.addComment('    Effect.gen(function* () {');
  builder.addComment('      if (Option.isSome(ctx.user)) {');
  builder.addComment('        // Personalized results');
  builder.addComment('      }');
  builder.addComment('      return yield* productRepository.list(input);');
  builder.addComment('    })');
  builder.addComment(');');
  builder.addComment('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  return builder.toString();
}
