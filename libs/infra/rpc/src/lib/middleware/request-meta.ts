import { RpcMiddleware } from "@effect/rpc"
import { Context, Effect, Layer, Option } from "effect"

/**
 * Request Metadata Middleware
 *
 * Request metadata middleware applied to ALL RPC routes.

Provides:
- Request ID (from x-request-id header or generated)
- Timestamp
- Source IP/forwarded-for
- Parsed headers

This middleware is applied globally and is always available.
 *
 * @module @samuelho-dev/infra-rpc/middleware/request-meta
 */
// ============================================================================
// Request Metadata Types
// ============================================================================
/**
 * Request metadata provided to all handlers
 */
export interface RequestMetadata {
  /** Unique request identifier */
  readonly requestId: string

  /** Request timestamp */
  readonly timestamp: Date

  /** Source IP or forwarded-for */
  readonly source: string

  /** Parsed headers (lowercase keys) */
  readonly headers: Readonly<Record<string, string>>

  /** User agent string */
  readonly userAgent: string | null

  /** Correlation ID for distributed tracing */
  readonly correlationId: string | null
}

/**
 * RequestMeta Context Tag
 *
 * Available in ALL handlers (public, protected, and service).
 *
 * @example
 * ```typescript
 * const handler = Effect.gen(function*() {
 *   const meta = yield* RequestMeta;
 *   console.log("Request ID:", meta.requestId);
 *   console.log("Timestamp:", meta.timestamp);
 * });
 * ```
 */
export class RequestMeta extends Context.Tag("@rpc/RequestMeta")<
  RequestMeta,
  RequestMetadata
>() {}

// ============================================================================
// Request Meta Middleware
// ============================================================================
/**
 * RequestMetaMiddleware using native RpcMiddleware.Tag
 *
 * Applied globally to all RPC endpoints.
 */
export class RequestMetaMiddleware extends RpcMiddleware.Tag<RequestMetaMiddleware>()(
  "@rpc/RequestMetaMiddleware",
  {
    provides: RequestMeta,
  }
) {}

/**
 * RequestMetaMiddleware implementation
 *
 * Extracts metadata from request headers.
 */
export const RequestMetaMiddlewareLive = Layer.succeed(
  RequestMetaMiddleware,
  ({ headers }) =>
    Effect.sync(() => {
      // Convert Headers to plain Record
      const headersRecord: Record<string, string> = {}

      // Handle both Map-like and object-like headers
      if (typeof headers === "object" && headers !== null) {
        for (const [key, value] of Object.entries(headers)) {
          if (typeof value === "string") {
            headersRecord[key.toLowerCase()] = value
          }
        }
      }

      // Extract request ID (generate if not present)
      const requestId =
        headersRecord["x-request-id"] ??
        headersRecord["x-amzn-requestid"] ??
        crypto.randomUUID()

      // Extract correlation ID for distributed tracing
      const correlationId =
        headersRecord["x-correlation-id"] ??
        headersRecord["x-trace-id"] ??
        null

      // Extract source IP
      const source =
        headersRecord["x-forwarded-for"]?.split(",")[0]?.trim() ??
        headersRecord["x-real-ip"] ??
        "unknown"

      // Extract user agent
      const userAgent = headersRecord["user-agent"] ?? null

      return {
        requestId,
        timestamp: new Date(),
        source,
        headers: headersRecord,
        userAgent,
        correlationId
      }
    })
)
// ============================================================================
// Handler Context Helpers
// ============================================================================
/**
 * Combined handler context type
 *
 * For protected routes that have both user and metadata.
 */
export interface HandlerContext {
  readonly user: {
    readonly id: string
    readonly email: string
    readonly roles: ReadonlyArray<string>
  }
  readonly meta: RequestMetadata
}

/**
 * Get handler context in a single yield (for protected routes)
 *
 * DX improvement to avoid multiple yield* calls in every handler.
 *
 * @example
 * ```typescript
 * // Instead of:
 * GetUser: ({ id }) =>
 *   Effect.gen(function*() {
 *     const user = yield* CurrentUser;
 *     const meta = yield* RequestMeta;
 *     // ...
 *   })
 *
 * // Use:
 * GetUser: ({ id }) =>
 *   Effect.gen(function*() {
 *     const ctx = yield* getHandlerContext;
 *     ctx.user.id; // Authenticated user
 *     ctx.meta.requestId; // Request metadata
 *     // ...
 *   })
 * ```
 */
export const getHandlerContext = Effect.all({
  user: Effect.serviceOption(
    Context.GenericTag<{
      readonly id: string
      readonly email: string
      readonly roles: ReadonlyArray<string>
    }>("@rpc/CurrentUser")
  ).pipe(Effect.map(Option.getOrNull)),
  meta: RequestMeta
}).pipe(
  Effect.map(({ user, meta }) => ({
    user: user ?? { id: "", email: "", roles: [] },
    meta
  }))
)

/**
 * Get handler context with optional services
 *
 * For handlers that may not have all context available.
 */
export const getHandlerContextOptional = Effect.all({
  user: Effect.serviceOption(
    Context.GenericTag<{
      readonly id: string
      readonly email: string
      readonly roles: ReadonlyArray<string>
    }>("@rpc/CurrentUser")
  ),
  meta: Effect.serviceOption(RequestMeta)
}).pipe(
  Effect.map(({ user, meta }) => ({
    user: Option.getOrNull(user),
    meta: Option.getOrNull(meta)
  }))
)

// ============================================================================
// Observability Helpers
// ============================================================================
/**
 * Log request start with metadata
 */
export const logRequestStart = (rpcName: string) =>
  Effect.gen(function*() {
    const meta = yield* RequestMeta
    yield* Effect.logInfo(`[RPC] ${rpcName} started`, {
      requestId: meta.requestId,
      correlationId: meta.correlationId,
      source: meta.source
    })
  })

/**
 * Log request end with duration
 */
export const logRequestEnd = (rpcName: string, startTime: number) =>
  Effect.gen(function*() {
    const meta = yield* RequestMeta
    const duration = Date.now() - startTime
    yield* Effect.logInfo(`[RPC] ${rpcName} completed in ${duration}ms`, {
      requestId: meta.requestId,
      duration
    })
  })

/**
 * Create span attributes from request metadata
 *
 * Use with Effect.withSpan for distributed tracing.
 */
export const getSpanAttributes = Effect.gen(function*() {
  const meta = yield* RequestMeta
  return {
    "request.id": meta.requestId,
    "request.source": meta.source,
    "request.correlation_id": meta.correlationId ?? "none",
    "request.user_agent": meta.userAgent ?? "none"
  }
})
