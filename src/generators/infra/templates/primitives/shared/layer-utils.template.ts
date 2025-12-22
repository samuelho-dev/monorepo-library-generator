/**
 * Shared Layer Utilities Template
 *
 * Generates reusable utilities for Redis-backed layers.
 * Centralizes JSON serialization, key management, and common patterns.
 *
 * @module monorepo-library-generator/infra-templates/primitives/shared
 */

import { TypeScriptBuilder } from '../../../../../utils/code-builder';
import type { InfraTemplateOptions } from '../../../../../utils/types';
import { WORKSPACE_CONFIG } from '../../../../../utils/workspace-config';

/**
 * Generate shared layer utilities for Redis-backed services
 */
export function generateSharedLayerUtilsFile(options: InfraTemplateOptions) {
  const builder = new TypeScriptBuilder();
  const { fileName } = options;
  const scope = WORKSPACE_CONFIG.getScope();

  builder.addFileHeader({
    title: 'Shared Layer Utilities',
    description: `Reusable utilities for Redis-backed infrastructure layers.

Provides:
- JSON serialization/deserialization with Effect Schema
- Key serialization for Redis storage
- Health check patterns
- Common Redis client interfaces`,
    module: `${scope}/infra-${fileName}/layers/utils`,
    see: ['EFFECT_PATTERNS.md for layer patterns'],
  });

  builder.addImports([
    {
      from: 'effect',
      imports: ['Effect', 'Schema'],
    },
  ]);

  builder.addSectionComment('JSON Serialization Utilities');

  builder.addRaw(`/**
 * JSON serialization utilities using Effect Schema
 *
 * Schema.parseJson handles JSON parsing + validation in one step.
 * Errors flow through Effect's error channel (no exceptions).
 */

const JsonValue = Schema.parseJson(Schema.Unknown)
const decodeJson = Schema.decode(JsonValue)
const encodeJson = Schema.encode(JsonValue)

/**
 * Serialize a value to JSON string
 *
 * @example
 * \`\`\`typescript
 * const json = yield* serialize({ userId: "123", data: { name: "Test" } })
 * // json: '{"userId":"123","data":{"name":"Test"}}'
 * \`\`\`
 */
export const serialize = <V>(value: V): Effect.Effect<string, never, never> =>
  encodeJson(value).pipe(Effect.orDie) // JSON.stringify shouldn't fail for valid objects

/**
 * Deserialize a JSON string to a value
 *
 * @example
 * \`\`\`typescript
 * const data = yield* deserialize<UserData>('{"userId":"123"}')
 * // data: { userId: "123" }
 * \`\`\`
 */
export const deserialize = <V>(data: string): Effect.Effect<V, never, never> =>
  decodeJson(data).pipe(Effect.map((v) => v as V), Effect.orDie)

/**
 * Synchronous deserialize for use in callbacks
 *
 * Uses Effect.runSync since some handlers (like Redis subscription) are synchronous.
 * Only use when you cannot use Effect-based async handling.
 */
export const deserializeSync = <T>(data: string): T => {
  const result = Schema.decodeUnknownSync(JsonValue)(data)
  return result as T
}
`);

  builder.addSectionComment('Key Serialization');

  builder.addRaw(`/**
 * Serialize a key for Redis storage
 *
 * Handles both string keys (passed through) and object keys (JSON stringified).
 *
 * @example
 * \`\`\`typescript
 * serializeKey("user:123")           // "user:123"
 * serializeKey({ userId: "123" })    // '{"userId":"123"}'
 * \`\`\`
 */
export const serializeKey = <K>(key: K): string =>
  typeof key === "string" ? key : JSON.stringify(key)
`);

  builder.addSectionComment('Health Check Pattern');

  builder.addRaw(`/**
 * Create a health check effect that pings a service
 *
 * Returns true if ping succeeds with expected response, false otherwise.
 * Failures are caught and treated as unhealthy state.
 *
 * @example
 * \`\`\`typescript
 * const healthCheck = createHealthCheck(
 *   redis.ping(),
 *   (response) => response === "PONG",
 *   "Cache.healthCheck"
 * )
 * \`\`\`
 */
export const createHealthCheck = <T>(
  pingEffect: Effect.Effect<T>,
  validator: (response: T) => boolean,
  spanName: string
): Effect.Effect<boolean> =>
  pingEffect.pipe(
    Effect.map(validator),
    Effect.catchAll(() => Effect.succeed(false)),
    Effect.withSpan(spanName)
  )
`);

  builder.addSectionComment('Common Redis Client Interface');

  builder.addRaw(`/**
 * Base Redis client interface for common operations
 *
 * Extended by specific service Redis clients (Cache, Queue, PubSub).
 */
export interface BaseRedisClient {
  /**
   * Ping for health check
   */
  readonly ping: () => Effect.Effect<string>
}
`);

  return builder.toString();
}
