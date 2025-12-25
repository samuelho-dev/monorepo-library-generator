/**
 * Route Selector Middleware Template
 *
 * Generates middleware that automatically applies authentication based on RouteTag.
 * This is the key component for Contract-First architecture where contracts define
 * security levels and infrastructure enforces them.
 *
 * Route Types:
 * - "public": No authentication, only RequestMeta provided
 * - "protected": User authentication via Bearer token, CurrentUser provided
 * - "service": Service-to-service authentication, ServiceContext provided
 *
 * @module monorepo-library-generator/infra-templates/rpc/middleware/route-selector
 */

import { TypeScriptBuilder } from "../../../../../utils/code-builder"
import type { InfraTemplateOptions } from "../../../../../utils/types"
import { WORKSPACE_CONFIG } from "../../../../../utils/workspace-config"

/**
 * Generate route selector middleware file
 *
 * Creates middleware that selects auth based on RouteTag.
 */
export function generateRouteSelectorMiddlewareFile(
  options: InfraTemplateOptions
) {
  const builder = new TypeScriptBuilder()
  const { fileName } = options
  const scope = WORKSPACE_CONFIG.getScope()

  builder.addFileHeader({
    title: "Route Selector Middleware",
    description: `Automatic middleware selection based on RouteTag from contract definitions.

This implements the Contract-First security pattern where:
1. Contract defines RouteTag on each RPC (single source of truth)
2. Infrastructure reads RouteTag and applies appropriate middleware
3. Feature handlers don't need to know about auth - it's automatic

Route Types:
- "public": No authentication required
- "protected": User authentication (CurrentUser)
- "service": Service-to-service authentication (ServiceContext)`,
    module: `${scope}/infra-${fileName}/middleware/route-selector`,
    see: ["RouteTag from contract libraries"]
  })

  builder.addImports([
    { from: "effect", imports: ["Effect", "Layer", "Context", "Option"] },
    { from: "@effect/platform", imports: ["Headers"] }
  ])

  builder.addBlankLine()

  builder.addRaw(`// ============================================================================
// Contract-Auth Imports (Single Source of Truth)
// ============================================================================

// Import canonical route types from contract-auth
import {
  RouteTag,
  type RouteType,
  type RpcWithRouteTag,
} from "${scope}/contract-auth";

// Re-export for convenience (consumers can import from infra-rpc OR contract-auth)
export { RouteTag, type RouteType, type RpcWithRouteTag };
`)

  builder.addSectionComment("Route Type Utilities")

  builder.addRaw(`/**
 * Get route type from an RPC definition
 *
 * @example
 * \`\`\`typescript
 * const routeType = getRouteType(GetUser); // "public"
 * const middleware = selectMiddleware(routeType);
 * \`\`\`
 */
export function getRouteType<T extends RpcWithRouteTag>(rpc: T){
  return rpc[RouteTag];
}
`)

  builder.addSectionComment("Route Detection from Request")

  builder.addRaw(`/**
 * Detect route type from request headers
 *
 * Uses presence of specific headers to determine route type:
 * - x-service-token: Service route
 * - Authorization: Protected route (user auth)
 * - Neither: Public route
 *
 * This is used when RouteTag is not available on the RPC definition
 * (e.g., legacy RPCs or dynamic routing).
 */
export function detectRouteType(headers: Headers.Headers){
  // Service token takes priority
  if (Option.isSome(Headers.get(headers, "x-service-token"))) {
    return "service";
  }

  // Bearer token indicates protected route
  const auth = Headers.get(headers, "authorization");
  if (Option.isSome(auth) && auth.value.startsWith("Bearer ")) {
    return "protected";
  }

  // API key could be either protected or service
  if (Option.isSome(Headers.get(headers, "x-api-key"))) {
    return "protected";
  }

  // Default to public
  return "public";
}
`)

  builder.addSectionComment("Middleware Selection")

  builder.addRaw(`/**
 * Middleware selector configuration
 *
 * Maps route types to middleware layers.
 */
export interface MiddlewareSelectorConfig {
  /** Middleware for public routes (optional, typically just RequestMeta) */
  readonly publicMiddleware?: Layer.Layer<unknown>;

  /** Middleware for protected routes (user auth) */
  readonly protectedMiddleware: Layer.Layer<unknown>;

  /** Middleware for service routes (S2S auth) */
  readonly serviceMiddleware: Layer.Layer<unknown>;

  /** Middleware applied to ALL routes (typically RequestMeta) */
  readonly globalMiddleware?: Layer.Layer<unknown>;
}

/**
 * Create middleware selector
 *
 * Returns a function that selects the appropriate middleware
 * based on route type.
 *
 * @example
 * \`\`\`typescript
 * const selectMiddleware = createMiddlewareSelector({
 *   protectedMiddleware: AuthMiddlewareLive,
 *   serviceMiddleware: ServiceMiddlewareLive,
 *   globalMiddleware: RequestMetaMiddlewareLive,
 * });
 *
 * // In router setup
 * const middleware = selectMiddleware(getRouteType(GetUser));
 * \`\`\`
 */
export function createMiddlewareSelector(config: MiddlewareSelectorConfig) {
  return (routeType: RouteType) => {
    const baseLayer = config.globalMiddleware ?? Layer.empty;

    // Switch is exhaustive - TypeScript will error if a RouteType case is missing
    switch (routeType) {
      case "public":
        return config.publicMiddleware
          ? Layer.merge(baseLayer, config.publicMiddleware)
          : baseLayer;

      case "protected":
        return Layer.merge(baseLayer, config.protectedMiddleware);

      case "service":
        return Layer.merge(baseLayer, config.serviceMiddleware);
    }
  };
}
`)

  builder.addSectionComment("Router Integration")

  builder.addRaw(`/**
 * Apply middleware to RPC handler based on RouteTag
 *
 * This is the main integration point for Contract-First middleware.
 * It reads the RouteTag from the RPC definition and applies the
 * appropriate middleware automatically.
 *
 * @example
 * \`\`\`typescript
 * import { UserRpcs, GetUser, CreateUser } from "@scope/contract-user";
 *
 * const config: MiddlewareSelectorConfig = {
 *   protectedMiddleware: AuthMiddlewareLive,
 *   serviceMiddleware: ServiceMiddlewareLive,
 *   globalMiddleware: RequestMetaMiddlewareLive,
 * };
 *
 * // Automatically applies correct middleware to each handler
 * const handlers = applyRouteMiddleware(UserRpcs, config, {
 *   GetUser: (input) => userService.get(input.id),
 *   CreateUser: (input) => userService.create(input),
 * });
 * \`\`\`
 */
export function applyRouteMiddleware<Rpcs extends Record<string, RpcWithRouteTag>>(
  rpcs: Rpcs,
  config: MiddlewareSelectorConfig,
  handlers: { [K in keyof Rpcs]: (input: unknown) => Effect.Effect<unknown, unknown, unknown> }
) {
  const selectMiddleware = createMiddlewareSelector(config);

  const wrappedHandlers: Record<string, unknown> = {};

  for (const [name, rpc] of Object.entries(rpcs)) {
    const routeType = getRouteType(rpc);
    const handler = handlers[name];

    // Skip if handler is not defined for this RPC
    if (!handler) {
      continue;
    }

    // Apply middleware based on route type
    const middleware = selectMiddleware(routeType ?? "public");

    // Wrap handler with appropriate middleware
    wrappedHandlers[name] = (input: unknown) =>
      handler(input).pipe(
        Effect.provide(middleware)
      );
  }

  return wrappedHandlers;
}
`)

  builder.addSectionComment("Request Context")

  builder.addRaw(`/**
 * Request context provided to handlers
 *
 * Contains the detected route type for logging/metrics.
 */
export interface RequestRouteContext {
  readonly routeType: RouteType;
  readonly rpcName: string;
}

/**
 * RequestRouteContext Tag
 */
export class RequestRouteContextTag extends Context.Tag("@${fileName}/RequestRouteContext")<
  RequestRouteContextTag,
  RequestRouteContext
>() {}

/**
 * Create request route context layer
 *
 * Provides route context to handlers for observability.
 */
export function createRequestRouteContext(
  rpcName: string,
  routeType: RouteType
) {
  return Layer.succeed(RequestRouteContextTag, {
    routeType,
    rpcName,
  });
}
`)

  builder.addSectionComment("Development Helpers")

  builder.addRaw(`/**
 * Log route type for debugging
 */
export const logRouteType = <R extends RpcWithRouteTag>(rpc: R, name: string) =>
  Effect.gen(function*() {
    const routeType = getRouteType(rpc);
    yield* Effect.logDebug(\`[RPC] \${name} -> \${routeType}\`);
    return routeType;
  });

/**
 * Assert route type matches expected
 *
 * Use in tests to verify contract definitions are correct.
 */
export function assertRouteType<R extends RpcWithRouteTag>(
  rpc: R,
  expected: RouteType,
  name: string
) {
  const actual = getRouteType(rpc);
  if (actual !== expected) {
    throw new Error(\`Route type mismatch for \${name}: expected \${expected}, got \${actual}\`);
  }
}

/**
 * Validate all RPCs in a group have RouteTag defined
 */
export function validateRpcRoutes<Rpcs extends Record<string, unknown>>(
  rpcs: Rpcs
) {
  return Object.entries(rpcs).map(([name, rpc]) => {
    const hasRouteTag = typeof rpc === "object" && rpc !== null && RouteTag in rpc;
    return {
      name,
      routeType: hasRouteTag ? (rpc)[RouteTag] : "missing",
    };
  });
}
`)

  return builder.toString()
}
