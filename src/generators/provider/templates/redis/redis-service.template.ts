/**
 * Redis Service Template
 *
 * Generates the main Redis Context.Tag with Live/Test/Dev layers.
 * Exposes sub-services for cache, pubsub, and queue operations,
 * plus extended operations and raw client access.
 *
 * @module monorepo-library-generator/provider/templates/redis/service
 */

import { TypeScriptBuilder } from '../../../../utils/code-builder'
import type { ProviderTemplateOptions } from '../../../../utils/types'
import { WORKSPACE_CONFIG } from '../../../../utils/workspace-config'

/**
 * Generate Redis main service file
 */
export function generateRedisServiceFile(options: ProviderTemplateOptions) {
  const builder = new TypeScriptBuilder()
  const { packageName } = options
  const scope = WORKSPACE_CONFIG.getScope()

  builder.addFileHeader({
    title: 'Redis Service',
    description: `Main Redis provider service with Effect integration.

Wraps ioredis SDK with Effect types and provides:
- Sub-services: cache, pubsub, queue (matching infra library interfaces)
- Extended operations: exists, expire, ttl, keys, scan
- Raw client access for advanced usage

Connection Management:
- Main connection for cache/queue operations
- Separate connection for pub/sub (Redis requirement)
- Automatic cleanup on scope close`,
    module: `${packageName}/service`,
    see: ['https://github.com/redis/ioredis for ioredis documentation']
  })
  builder.addBlankLine()

  // Imports
  builder.addImports([
    { from: 'effect', imports: ['Context', 'Effect', 'Layer', 'Schema'] },
    { from: 'ioredis', imports: [{ name: 'Redis', alias: 'IORedis' }], isTypeOnly: true },
    { from: `${scope}/env`, imports: ['env'] },
    { from: './cache', imports: ['makeCacheClient'] },
    { from: './errors', imports: ['RedisCommandError', 'RedisConnectionError'] },
    { from: './pubsub', imports: ['makePubSubClient'] },
    { from: './queue', imports: ['makeQueueClient'] },
    {
      from: './types',
      imports: [
        'RedisCacheClient',
        'RedisConfig',
        'RedisPubSubClient',
        'RedisQueueClient',
        'ScanOptions',
        'ScanResult'
      ],
      isTypeOnly: true
    }
  ])
  builder.addRaw(`import Redis from "ioredis"
import RedisMock from "ioredis-mock"`)
  builder.addBlankLine()

  // Service interface
  builder.addSectionComment('Service Interface')
  builder.addBlankLine()

  builder.addRaw(`/**
 * Redis Service Interface
 *
 * Provides unified access to Redis operations through sub-services:
 * - cache: GET/SET/SETEX/DEL operations
 * - pubsub: PUBLISH/SUBSCRIBE/UNSUBSCRIBE operations
 * - queue: LPUSH/BRPOP/RPOP list operations
 *
 * Plus extended common operations and raw client access.
 */
export interface RedisServiceInterface {
  /**
   * Configuration used to initialize the client
   */
  readonly config: RedisConfig  /**
   * Health check - verifies Redis connectivity
   */
  readonly healthCheck: Effect.Effect<boolean, RedisConnectionError>

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Sub-Services (matching infra library interfaces)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Cache operations (used by infra-cache)
   * Provides: get, set, setex, del, flushdb, ping
   */
  readonly cache: RedisCacheClient  /**
   * PubSub operations (used by infra-pubsub)
   * Provides: publish, subscribe, unsubscribe, ping
   */
  readonly pubsub: RedisPubSubClient  /**
   * Queue operations (used by infra-queue)
   * Provides: lpush, brpop, rpop, llen, lrange, ltrim, del, ping
   */
  readonly queue: RedisQueueClient  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Extended Operations
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Check if key exists
   */
  readonly exists: (key: string) => Effect.Effect<boolean, RedisCommandError>

  /**
   * Set key expiration in seconds
   */
  readonly expire: (key: string, seconds: number) => Effect.Effect<boolean, RedisCommandError>

  /**
   * Get TTL of key in seconds (-1 = no expiry, -2 = key not found)
   */
  readonly ttl: (key: string) => Effect.Effect<number, RedisCommandError>

  /**
   * Find keys matching pattern
   * WARNING: Use SCAN for production (keys can block Redis)
   */
  readonly keys: (pattern: string) => Effect.Effect<string[], RedisCommandError>

  /**
   * Incrementally iterate keys
   */
  readonly scan: (cursor: number, options?: ScanOptions) => Effect.Effect<ScanResult, RedisCommandError>

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Raw Command Execution
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Execute a custom command with Effect error handling
   *
   * Use for commands not exposed through the typed interface.
   * Wraps the command in proper error handling and tracing.
   *
   * @example
   * \`\`\`typescript
   * const result = yield* redis.executeCommand(
   *   (client) => client.hgetall("my-hash"),
   *   "HGETALL"
   * )
   * \`\`\`
   */
  readonly executeCommand: <A>(
    fn: (client: IORedis) => Promise<A>,
    commandName: string
  ) => Effect.Effect<A, RedisCommandError>
}`)
  builder.addBlankLine()

  // Context.Tag
  builder.addSectionComment('Context.Tag')
  builder.addBlankLine()

  builder.addRaw(`/**
 * Redis Service Tag
 *
 * Access via: yield* Redis
 *
 * Static layers:
 * - Redis.Live - Production with ioredis
 * - Redis.Test - Test layer with in-memory mock
 * - Redis.Dev - Development with debug logging
 * - Redis.make(config) - Custom configuration
 */
export class RedisService extends Context.Tag("Redis")<
  RedisService,
  RedisServiceInterface
>() {
  /**
   * Create a layer with custom configuration
   */
  static make(config: RedisConfig) {
    return Layer.scoped(
      RedisService,
      Effect.gen(function*() {
        const mainOptions = buildMainOptions(config)
        const subOptions = buildSubOptions(config)

        const mainClient = yield* Effect.acquireRelease(
          Effect.sync(() => new Redis(mainOptions)),
          (client) => Effect.sync(() => client.disconnect())
        )

        const subClient = yield* Effect.acquireRelease(
          Effect.sync(() => new Redis(subOptions)),
          (client) => Effect.sync(() => client.disconnect())
        )

        return makeRedisService(config, mainClient, subClient)
      })
    )
  }

  /**
   * Live layer using default localhost configuration
   *
   * For custom configuration, use RedisService.make(config)
   */
  static readonly Live = RedisService.make({
    host: "localhost",
    port: 6379,
    db: 0
  })

  /**
   * Test layer with in-memory mock
   *
   * No actual Redis connection - uses Map-based storage.
   * Provides working in-memory implementation for testing.
   */
  static readonly Test = Layer.sync(RedisService, () => {
    const store = new Map<string, string>()
    const ttls = new Map<string, number>()
    const lists = new Map<string, string[]>()
    const subscribers = new Map<string, ((message: string) => void)[]>()
    const mockClient = new RedisMock()

    const testConfig: RedisConfig = { host: "localhost", port: 6379 }

    return {
      config: testConfig,

      healthCheck: Effect.succeed(true),

      cache: {
        get: (key: string) => Effect.succeed(store.get(key) ?? null),
        set: (key: string, value: string) => Effect.sync(() => { store.set(key, value) }),
        setex: (key: string, seconds: number, value: string) => Effect.sync(() => {
          store.set(key, value)
          ttls.set(key, Date.now() + seconds * 1000)
        }),
        del: (key: string) => Effect.sync(() => {
          const existed = store.has(key) ? 1 : 0
          store.delete(key)
          ttls.delete(key)
          return existed
        }),
        flushdb: () => Effect.sync(() => {
          store.clear()
          ttls.clear()
          lists.clear()
        }),
        ping: () => Effect.succeed("PONG")
      },

      pubsub: {
        publish: (channel: string, message: string) => Effect.sync(() => {
          const handlers = subscribers.get(channel) ?? []
          for (const handler of handlers) {
            handler(message)
          }
          return handlers.length
        }),
        subscribe: (channel: string, handler: (message: string) => void) => Effect.sync(() => {
          const handlers = subscribers.get(channel) ?? []
          handlers.push(handler)
          subscribers.set(channel, handlers)
        }),
        unsubscribe: (channel: string) => Effect.sync(() => {
          subscribers.delete(channel)
        }),
        ping: () => Effect.succeed("PONG")
      },

      queue: {
        lpush: (key: string, value: string) => Effect.sync(() => {
          const list = lists.get(key) ?? []
          list.unshift(value)
          lists.set(key, list)
          return list.length
        }),
        brpop: (key: string) => Effect.sync(() => {
          const list = lists.get(key) ?? []
          const value = list.pop()
          if (value === undefined) return null
          lists.set(key, list)
          return [key, value]
        }),
        rpop: (key: string) => Effect.sync(() => {
          const list = lists.get(key) ?? []
          const value = list.pop()
          if (value === undefined) return null
          lists.set(key, list)
          return value
        }),
        llen: (key: string) => Effect.succeed(lists.get(key)?.length ?? 0),
        lrange: (key: string, start: number, stop: number) => Effect.sync(() => {
          const list = lists.get(key) ?? []
          const end = stop < 0 ? list.length + stop + 1 : stop + 1
          return list.slice(start, end)
        }),
        ltrim: (key: string, start: number, stop: number) => Effect.sync(() => {
          const list = lists.get(key) ?? []
          const end = stop < 0 ? list.length + stop + 1 : stop + 1
          lists.set(key, list.slice(start, end))
        }),
        del: (key: string) => Effect.sync(() => {
          const existed = lists.has(key) ? 1 : 0
          lists.delete(key)
          return existed
        }),
        ping: () => Effect.succeed("PONG")
      },

      exists: (key: string) => Effect.succeed(store.has(key) || lists.has(key)),
      expire: (key: string, seconds: number) => Effect.sync(() => {
        if (store.has(key) || lists.has(key)) {
          ttls.set(key, Date.now() + seconds * 1000)
          return true
        }
        return false
      }),
      ttl: (key: string) => Effect.sync(() => {
        const expiry = ttls.get(key)
        if (expiry === undefined) {
          return store.has(key) || lists.has(key) ? -1 : -2
        }
        return Math.max(0, Math.floor((expiry - Date.now()) / 1000))
      }),
      keys: (pattern: string) => Effect.sync(() => {
        const regex = new RegExp(\`^\${pattern.replace(/\\*/g, ".*").replace(/\\?/g, ".")}$\`)
        const allKeys = [...store.keys(), ...lists.keys()]
        return allKeys.filter((k) => regex.test(k))
      }),
      scan: (cursor: number, options?: ScanOptions) => Effect.sync(() => {
        const allKeys = [...store.keys(), ...lists.keys()]
        const count = options?.count ?? 10
        const match = options?.match
        let filtered = allKeys
        if (match) {
          const regex = new RegExp(\`^\${match.replace(/\\*/g, ".*").replace(/\\?/g, ".")}$\`)
          filtered = allKeys.filter((k) => regex.test(k))
        }
        const start = cursor
        const end = Math.min(start + count, filtered.length)
        const nextCursor = end >= filtered.length ? 0 : end
        return { cursor: nextCursor, keys: filtered.slice(start, end) }
      }),

      executeCommand: <A>(fn: (client: IORedis) => Promise<A>, commandName: string) =>
        Effect.tryPromise({
          try: () => fn(mockClient),
          catch: (error) =>
            new RedisCommandError({
              message: \`\${commandName} failed\`,
              command: commandName,
              cause: error
            })
        }).pipe(Effect.withSpan(\`Redis.\${commandName}\`)),
    }
  })

  /**
   * Dev layer with debug logging
   *
   * Uses same localhost config as Live, but with debug logging enabled.
   * For custom configuration, use RedisService.make(config)
   */
  static readonly Dev = Layer.scoped(
    RedisService,
    Effect.gen(function*() {
      yield* Effect.logDebug("[Redis] Initializing dev client...")

      const config: RedisConfig = {
        host: "localhost",
        port: 6379,
        db: 0
      }

      yield* Effect.logDebug("[Redis] Config loaded", { host: config.host, port: config.port })

      const mainClient = yield* Effect.acquireRelease(
        Effect.sync(() => new Redis({
          host: config.host ?? "localhost",
          port: config.port ?? 6379,
          db: config.db ?? 0,
        })),
        (client) => Effect.sync(() => client.disconnect())
      )

      const subClient = yield* Effect.acquireRelease(
        Effect.sync(() => new Redis({
          host: config.host ?? "localhost",
          port: config.port ?? 6379,
          db: config.db ?? 0,
        })),
        (client) => Effect.sync(() => client.disconnect())
      )

      yield* Effect.logDebug("[Redis] Connections established")

      return makeRedisService(config, mainClient, subClient)
    })
  )

  /**
   * Auto layer - Environment-aware layer selection
   *
   * Selects appropriate layer based on NODE_ENV:
   * - "production" → Live
   * - "development" → Dev
   * - "test" → Test
   * - default → Dev
   */
  static readonly Auto = Layer.suspend(() => {
    switch (env.NODE_ENV) {
      case "production":
        return RedisService.Live;
      case "test":
        return RedisService.Test;
      default:
        // development and other environments use Dev layer
        return RedisService.Dev;
    }
  })
}`)
  builder.addBlankLine()

  // Helper functions
  builder.addSectionComment('Service Factory Helpers')
  builder.addBlankLine()

  builder.addRaw(`/**
 * Build ioredis base options from config
 */
function buildBaseOptions(config: RedisConfig) {
  return {
    host: config.host ?? "localhost",
    port: config.port ?? 6379,
    db: config.db ?? 0,
    connectTimeout: config.connectTimeout ?? 10000,
    commandTimeout: config.commandTimeout ?? 20000,
    retryStrategy: (times: number) => Math.min(times * (config.retryDelayMs ?? 50), 2000),
    maxRetriesPerRequest: config.maxRetriesPerRequest ?? 3
  }
}

/**
 * Build main client options with auth and TLS
 */
function buildMainOptions(config: RedisConfig) {
  const base = buildBaseOptions(config)
  return {
    ...base,
    ...(config.password !== undefined ? { password: config.password } : {}),
    ...(config.tls ? { tls: {} } : {})
  }
}

/**
 * Build subscriber client options (simpler config for pub/sub)
 */
function buildSubOptions(config: RedisConfig) {
  return {
    host: config.host ?? "localhost",
    port: config.port ?? 6379,
    db: config.db ?? 0,
    ...(config.password !== undefined ? { password: config.password } : {}),
    ...(config.tls ? { tls: {} } : {})
  }
}

/**
 * Build SCAN command arguments from options
 */
function buildScanArgs(cursor: number, options?: ScanOptions): string | number[] {
  const args: string | number[] = [cursor]
  if (options?.match) {
    args.push("MATCH", options.match)
  }
  if (options?.count) {
    args.push("COUNT", options.count)
  }
  if (options?.type) {
    args.push("TYPE", options.type)
  }
  return args
}

/**
 * Schema for Redis SCAN response
 * SCAN returns [cursor: string, keys: string[]]
 */
const RedisScanResponse = Schema.Tuple(
  Schema.String,
  Schema.Array(Schema.String)
)

/**
 * Execute SCAN with dynamically built arguments
 * Returns strongly typed result via Effect Schema
 */
function executeScan(client: IORedis, cursor: number, options?: ScanOptions) {
  const args = buildScanArgs(cursor, options)
  return Effect.gen(function*() {
    // ioredis scan takes cursor first, then options as variadic args
    const rawResult = yield* Effect.tryPromise({
      try: () => client.call("SCAN", ...args),
      catch: (error) => new RedisCommandError({
        message: "SCAN command failed",
        command: "SCAN",
        cause: error
      })
    })
    // Decode with Schema for type safety
    const [nextCursor, keys] = yield* Schema.decodeUnknown(RedisScanResponse)(rawResult)
    return {
      cursor: parseInt(nextCursor, 10),
      keys
    }
  })
}

/**
 * Create Redis service implementation from ioredis clients
 */
function makeRedisService(
  config: RedisConfig,
  mainClient: IORedis,
  subClient: IORedis
) {
  return {
    config,

    healthCheck: Effect.tryPromise({
      try: () => mainClient.ping(),
      catch: (error) =>
        new RedisConnectionError({
          message: "Health check failed",
          ...(config.host !== undefined ? { host: config.host } : {}),
          ...(config.port !== undefined ? { port: config.port } : {}),
          cause: error,
        }),
    }).pipe(
      Effect.map(() => true),
      Effect.withSpan("Redis.healthCheck")
    ),

    cache: makeCacheClient(mainClient),
    pubsub: makePubSubClient(mainClient, subClient),
    queue: makeQueueClient(mainClient),

    exists: (key: string) =>
      Effect.tryPromise({
        try: () => mainClient.exists(key).then((r) => r > 0),
        catch: (error) =>
          new RedisCommandError({
            message: \`EXISTS failed for key: \${key}\`,
            command: "EXISTS",
            args: [key],
            cause: error
          })
      }).pipe(Effect.withSpan("Redis.exists", { attributes: { key } })),

    expire: (key: string, seconds: number) =>
      Effect.tryPromise({
        try: () => mainClient.expire(key, seconds).then((r) => r === 1),
        catch: (error) =>
          new RedisCommandError({
            message: \`EXPIRE failed for key: \${key}\`,
            command: "EXPIRE",
            args: [key, seconds],
            cause: error
          })
      }).pipe(Effect.withSpan("Redis.expire", { attributes: { key, seconds } })),

    ttl: (key: string) =>
      Effect.tryPromise({
        try: () => mainClient.ttl(key),
        catch: (error) =>
          new RedisCommandError({
            message: \`TTL failed for key: \${key}\`,
            command: "TTL",
            args: [key],
            cause: error
          })
      }).pipe(Effect.withSpan("Redis.ttl", { attributes: { key } })),

    keys: (pattern: string) =>
      Effect.tryPromise({
        try: () => mainClient.keys(pattern),
        catch: (error) =>
          new RedisCommandError({
            message: \`KEYS failed for pattern: \${pattern}\`,
            command: "KEYS",
            args: [pattern],
            cause: error
          })
      }).pipe(Effect.withSpan("Redis.keys", { attributes: { pattern } })),

    scan: (cursor: number, options?: ScanOptions) =>
      executeScan(mainClient, cursor, options).pipe(
        Effect.catchTag("ParseError", (error) =>
          Effect.fail(new RedisCommandError({
            message: \`SCAN response parsing failed at cursor: \${cursor}\`,
            command: "SCAN",
            args: [cursor, options],
            cause: error
          }))
        ),
        Effect.withSpan("Redis.scan", { attributes: { cursor } })
      ),

    executeCommand: <A>(fn: (client: IORedis) => Promise<A>, commandName: string) =>
      Effect.tryPromise({
        try: () => fn(mainClient),
        catch: (error) =>
          new RedisCommandError({
            message: \`\${commandName} failed\`,
            command: commandName,
            cause: error
          })
      }).pipe(Effect.withSpan(\`Redis.\${commandName}\`))
  }
}`)
  builder.addBlankLine()

  // Re-export as "Redis" alias
  builder.addSectionComment('Export Alias')
  builder.addBlankLine()

  builder.addRaw(`/**
 * Redis service (alias for RedisService)
 *
 * Use this for a cleaner API:
 * \`\`\`typescript
 * const redis = yield* Redis;
 * \`\`\`
 */
export { RedisService as Redis };`)

  return builder.toString()
}
