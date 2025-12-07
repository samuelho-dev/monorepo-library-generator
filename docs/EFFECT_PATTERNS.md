# Effect.ts Pattern Reference Guide

> **📚 Related Documentation:**
>
> - [Architecture Overview](./ARCHITECTURE_OVERVIEW.md) - Library inventory and integration patterns
> - [Nx Standards](./NX_STANDARDS.md) - Naming conventions and workspace organization
> - [Export Patterns](./EXPORT_PATTERNS.md) - Platform-aware exports and barrel patterns
> - [Contract Libraries](./CONTRACT.md) - Domain interfaces using Effect patterns
> - [Data-Access Libraries](./DATA-ACCESS.md) - Repository implementations with Effect
> - [Feature Libraries](./FEATURE.md) - Business logic orchestration with Effect
> - [Infrastructure Libraries](./INFRA.md) - Cross-cutting concerns with Effect
> - [Provider Libraries](./PROVIDER.md) - External service adapters with Effect

## Quick Reference

This guide provides production-ready Effect.ts patterns (Effect 3.0+) for the monorepo.

## Service Definition Patterns

Effect provides two main approaches for defining services: **Effect.Service** (streamlined) and **Context.Tag** (explicit). Both are valid and supported in Effect 3.0+. Choose based on your requirements using the decision matrix below.

### 📊 Quick Decision Matrix

| Criteria                     | Effect.Service                | Context.Tag                      |
| ---------------------------- | ----------------------------- | -------------------------------- |
| **Boilerplate**              | Low (single declaration)      | Medium (separate Tag + Layer)    |
| **Multiple implementations** | Difficult (only .Default)     | Easy (Live, Test, Mock, Dev)     |
| **Accessor generation**      | Built-in (`accessors: true`)  | Manual                           |
| **Best for**                 | Standard services, prototypes | Complex architectures, libraries |
| **Recommended when**         | Single implementation needed  | Need test/mock/dev variants      |

**👉 Default Choice**: Use **Context.Tag** for this codebase - we need multiple layer implementations (Live, Test, Mock) for comprehensive testing and flexibility.

### Pattern 1: Context.Tag with Inline Interface (Recommended)

Use for non-generic services with <10 methods (90% of cases):

```typescript
// ✅ CORRECT - Modern Effect 3.0+ pattern with inline interface
export class PaymentService extends Context.Tag('PaymentService')<
  PaymentService,
  {
    readonly processPayment: (
      amount: number,
    ) => Effect.Effect<Payment, PaymentError>;
    readonly refundPayment: (id: string) => Effect.Effect<void, PaymentError>;
  }
>() {
  // Static Live property for layer composition
  static readonly Live = Layer.effect(
    this,
    Effect.gen(function* () {
      const stripe = yield* StripeService;
      const database = yield* DatabaseService;

      return {
        processPayment: (amount) =>
          Effect.gen(function* () {
            const result = yield* Effect.tryPromise({
              try: () =>
                stripe.paymentIntents.create({ amount, currency: 'usd' }),
              catch: (error) => new PaymentError({ cause: error }),
            });

            yield* database.query((db) =>
              db
                .insertInto('payments')
                .values({ amount, stripeId: result.id })
                .execute(),
            );

            return result;
          }),

        refundPayment: (id) =>
          Effect.tryPromise({
            try: () => stripe.refunds.create({ payment_intent: id }),
            catch: (error) => new PaymentError({ cause: error }),
          }).pipe(Effect.asVoid),
      };
    }),
  );

  // Test implementation included in service definition
  // ✅ BEST PRACTICE: Use complete mock factory for type safety
  static readonly Test = Layer.succeed(this, {
    processPayment: (amount) => {
      const mockPayment: Payment = {
        id: `test_${amount}`,
        status: 'succeeded',
        amount,
        currency: 'usd',
        created: Date.now(),
        object: 'payment_intent',
        livemode: false,
        client_secret: `test_secret_${amount}`,
        description: null,
        metadata: {},
      };
      return Effect.succeed(mockPayment);
    },
    refundPayment: () => Effect.succeed(void 0),
  });
}
```

### Pattern 2: Context.Tag with Separate Interface

Use when service has 10+ methods or interface is shared:

```typescript
// ✅ CORRECT - For complex services only
// interfaces.ts
export interface LoggingServiceInterface {
  readonly trace: (msg: string, meta?: LogMetadata) => Effect.Effect<void>;
  readonly debug: (msg: string, meta?: LogMetadata) => Effect.Effect<void>;
  readonly info: (msg: string, meta?: LogMetadata) => Effect.Effect<void>;
  readonly warn: (msg: string, meta?: LogMetadata) => Effect.Effect<void>;
  readonly error: (msg: string, meta?: LogMetadata) => Effect.Effect<void>;
  // ... 10+ more methods
}

// service.ts
export class LoggingService extends Context.Tag('LoggingService')<
  LoggingService,
  LoggingServiceInterface
>() {
  static readonly Live = Layer.effect(
    this,
    Effect.gen(function* () {
      const config = yield* Config;
      // Complex initialization
      return createStructuredLogger(config);
    }),
  );
}
```

### Pattern 3: Context.GenericTag for Generic Services

Use ONLY for services with type parameters (1% of cases):

```typescript
// ✅ CORRECT - For generic services only
export interface KyselyServiceInterface<DB> {
  readonly query: <T>(fn: (db: Kysely<DB>) => Promise<T>) => Effect.Effect<T, DatabaseQueryError>
  readonly transaction: <T>(fn: (trx: Transaction<DB>) => Effect.Effect<T, E>) => Effect.Effect<T, E | DatabaseQueryError>
}

// Generic service tag (GenericTag required for type parameters)
export const KyselyService = <DB>() =>
  Context.GenericTag<KyselyServiceInterface<DB>>("KyselyService")

// Layer factory (returns configured layer)
export const KyselyServiceLive = <DB>() =>
  Layer.scoped(
    KyselyService<DB>(),
    Effect.gen(function* () {
      const pool = yield* Effect.acquireRelease(
        Effect.sync(() => createPool(config)),
        (pool) => Effect.sync(() => pool.end())
      )

      const db = new Kysely<DB>({ dialect: new PostgresDialect({ pool }) })

      return {
        query: (fn) => Effect.tryPromise({
          try: () => fn(db),
          catch: (error) => new DatabaseQueryError({ cause: error })
        }),
        transaction: (fn) => // implementation
      }
    })
  )

// Usage
const MyDatabaseService = KyselyService<Database>()
```

### Pattern 4: Effect.Service - Alternative Pattern (Optional)

**Note**: This codebase uses **Context.Tag** (Patterns 1-3) for flexibility. Effect.Service is documented here for completeness but is NOT used in our generators.

**Effect.Service** combines Context.Tag and Layer in a single declaration:

```typescript
// Single-declaration service with auto-generated layer
class Logger extends Effect.Service<Logger>()('Logger', {
  sync: () => ({
    info: (msg: string) => Effect.sync(() => console.log(`[INFO] ${msg}`)),
    error: (msg: string) => Effect.sync(() => console.error(`[ERROR] ${msg}`)),
  }),
  accessors: true, // Optional: generates Logger.info() convenience functions
}) {}

// Usage
const program = Effect.gen(function* () {
  yield* Logger.info('Hello'); // Direct accessor (if accessors: true)
});

Effect.runPromise(program.pipe(Effect.provide(Logger.Default)));
```

**Options**: `sync`, `effect`, `scoped`, `succeed`, `dependencies`, `accessors`

**Why Context.Tag instead?**

- ✅ Multiple implementations (Live, Test, Mock, Dev) - Effect.Service only provides `.Default`
- ✅ Explicit layer control - easier to see dependencies
- ✅ Better for library code - consumers can provide their own implementations

### Pattern 5: Repository Pattern

Repositories use the same pattern as services:

```typescript
// ✅ CORRECT - Repository with inline interface
export class UserRepository extends Context.Tag('UserRepository')<
  UserRepository,
  {
    readonly findById: (
      id: string,
    ) => Effect.Effect<Option.Option<User>, DatabaseError>;
    readonly create: (input: UserInput) => Effect.Effect<User, DatabaseError>;
    readonly update: (
      id: string,
      input: Partial<UserInput>,
    ) => Effect.Effect<User, DatabaseError>;
    readonly delete: (id: string) => Effect.Effect<void, DatabaseError>;
  }
>() {
  static readonly Live = Layer.effect(
    this,
    Effect.gen(function* () {
      const database = yield* DatabaseService;
      const cache = yield* CacheService;

      return {
        findById: (id) =>
          Effect.gen(function* () {
            // Check cache first - use type-safe cache.get with schema
            const cached = yield* cache.get<User>(`user:${id}`, UserSchema);
            if (Option.isSome(cached)) return cached;

            // Query database
            const user = yield* database.query((db) =>
              db
                .selectFrom('users')
                .where('id', '=', id)
                .selectAll()
                .executeTakeFirst(),
            );

            // Cache result if found
            if (user) {
              yield* cache.set(`user:${id}`, user, UserSchema);
            }

            return Option.fromNullable(user);
          }),

        create: (input) =>
          database.query((db) =>
            db
              .insertInto('users')
              .values(input)
              .returningAll()
              .executeTakeFirstOrThrow(),
          ),

        update: (id, input) =>
          Effect.gen(function* () {
            const updated = yield* database.query((db) =>
              db
                .updateTable('users')
                .set(input)
                .where('id', '=', id)
                .returningAll()
                .executeTakeFirstOrThrow(),
            );
            // Invalidate cache
            yield* cache.delete(`user:${id}`);
            return updated;
          }),

        delete: (id) =>
          Effect.gen(function* () {
            yield* database.query((db) =>
              db.deleteFrom('users').where('id', '=', id).execute(),
            );
            yield* cache.delete(`user:${id}`);
          }),
      };
    }),
  );
}
```

### Built-in Effect Caching Operators

Effect provides built-in caching operators for **operation-level memoization**, complementing infrastructure-level caching (Redis, etc.). Use built-in operators for in-process caching of computations, API calls, and resource initialization.

**When to use built-in caching vs CacheService:**

| Caching Type | Scope | TTL Support | Persistence | Use Case |
|--------------|-------|-------------|-------------|----------|
| **Effect.cached** | Single process | Indefinite | In-memory | Pure computations, SDK clients |
| **Effect.cachedWithTTL** | Single process | Yes (duration) | In-memory | API rate limits, token refresh |
| **Effect.once** | Single process | Indefinite | In-memory | One-time initialization |
| **cachedFunction** | Single process | Custom | In-memory | Function memoization |
| **CacheService (Redis)** | Distributed | Yes (custom) | Persistent | User sessions, shared data |
| **Layered (Both)** | Hybrid | Both | Hybrid | High-traffic operations |

---

#### Pattern 1: Effect.cached - Indefinite Cache

**Cache operation result after first execution.** Subsequent calls return the cached value without re-executing.

```typescript
import { Effect } from "effect";

// User profile lookup with caching
const getUserProfile = (userId: string) =>
  Effect.gen(function* () {
    const repo = yield* UserRepository;
    const user = yield* repo.findById(userId);

    if (Option.isNone(user)) {
      return yield* Effect.fail(new UserNotFoundError({ userId }));
    }

    return user.value;
  }).pipe(
    Effect.cached // ✅ Result cached indefinitely
  );

// First call: Executes and caches
const profile1 = yield* getUserProfile("user-123");

// Second call: Returns cached value (no DB query)
const profile2 = yield* getUserProfile("user-123");

// ⚠️ Cache is per Effect instance
// Creating a new Effect creates a new cache
const freshLookup = getUserProfile("user-123"); // New cache
```

**Important:** Cache is bound to the Effect instance. To share cache across the application, create the cached Effect once and reuse:

```typescript
// ✅ GOOD: Single cached Effect shared across application
export class UserService extends Context.Tag("UserService")<
  UserService,
  {
    readonly getProfile: (
      userId: string
    ) => Effect.Effect<User, UserNotFoundError>;
  }
>() {
  static readonly Live = Layer.sync(this, () => {
    // Create cached operation once
    const cachedGetProfile = (userId: string) =>
      Effect.gen(function* () {
        const repo = yield* UserRepository;
        const user = yield* repo.findById(userId);
        // ...
        return user.value;
      }).pipe(Effect.cached);

    return {
      getProfile: cachedGetProfile,
    };
  });
}

// All calls share the same cache
const service = yield* UserService;
const user1 = yield* service.getProfile("user-123"); // Cached
const user2 = yield* service.getProfile("user-123"); // Cache hit
```

---

#### Pattern 2: Effect.cachedWithTTL - Time-Based Expiration

**Auto-refresh cache after duration.** Perfect for rate-limited APIs or time-sensitive data.

```typescript
import { Effect } from "effect";

// Exchange rate caching with 5-minute TTL
const getExchangeRate = (currency: string) =>
  Effect.gen(function* () {
    const api = yield* ExchangeRateAPI;
    yield* Effect.log(`Fetching exchange rate for ${currency}`);

    const rate = yield* Effect.tryPromise({
      try: () => api.getRates(currency),
      catch: (error) => new APIError({ message: String(error) }),
    });

    return rate;
  }).pipe(
    Effect.cachedWithTTL("5 minutes") // ✅ Refreshes every 5 minutes
  );

// First call: Fetches from API
const rate1 = yield* getExchangeRate("USD");

// Within 5 minutes: Returns cached value
yield* Effect.sleep("2 minutes");
const rate2 = yield* getExchangeRate("USD"); // Cache hit

// After 5 minutes: Refreshes from API
yield* Effect.sleep("4 minutes");
const rate3 = yield* getExchangeRate("USD"); // Fetches again
```

**Real-World: Token Refresh with TTL**

```typescript
// OAuth token with auto-refresh
const getAccessToken = Effect.gen(function* () {
  const oauth = yield* OAuthService;
  yield* Effect.log("Refreshing access token");

  const token = yield* oauth.refreshToken();
  return token;
}).pipe(
  Effect.cachedWithTTL("55 minutes") // Refresh 5min before expiry
);

// Use in API calls
const makeAuthenticatedRequest = (endpoint: string) =>
  Effect.gen(function* () {
    const token = yield* getAccessToken; // Cached or refreshed
    const api = yield* APIClient;

    return yield* api.request(endpoint, {
      headers: { Authorization: `Bearer ${token}` },
    });
  });
```

---

#### Pattern 3: Effect.once - One-Time Initialization

**Execute exactly once, even with concurrent calls.** Ideal for SDK initialization, config loading, database migration.

```typescript
import { Effect } from "effect";

// Initialize Stripe SDK exactly once
const initializeStripe = Effect.gen(function* () {
  yield* Effect.log("Initializing Stripe SDK");
  const config = yield* ConfigService;

  const stripe = new Stripe(config.stripeApiKey, {
    apiVersion: "2023-10-16",
  });

  yield* Effect.log("Stripe SDK initialized");
  return stripe;
}).pipe(
  Effect.once // ✅ Runs only on first call
);

// All concurrent calls wait for single initialization
const program = Effect.all(
  [
    initializeStripe, // First call: executes
    initializeStripe, // Waits for first call
    initializeStripe, // Waits for first call
  ],
  { concurrency: "unbounded" }
);

yield* program;
// Logs "Initializing Stripe SDK" only ONCE
```

**Database Migration Example:**

```typescript
const runMigrations = Effect.gen(function* () {
  const database = yield* DatabaseService;
  yield* Effect.log("Running database migrations");

  yield* database.migrate();

  yield* Effect.log("Migrations complete");
}).pipe(
  Effect.once // ✅ Migrations run exactly once
);

// Safe to call from multiple services
export class UserRepository extends Context.Tag("UserRepository")<
  UserRepository,
  RepositoryInterface
>() {
  static readonly Live = Layer.effect(
    this,
    Effect.gen(function* () {
      // Ensure migrations before repository starts
      yield* runMigrations; // Safe: runs once globally

      const database = yield* DatabaseService;
      return createRepository(database);
    })
  );
}
```

---

#### Pattern 4: cachedFunction - Function Memoization

**Memoize function calls by input parameters.** Results cached by argument equality.

```typescript
import { cachedFunction } from "effect/Function";
import { Effect } from "effect";

// Expensive shipping cost calculation
const calculateShippingCost = cachedFunction(
  (weight: number, distance: number) =>
    Effect.gen(function* () {
      yield* Effect.log(`Computing shipping for ${weight}kg, ${distance}km`);

      // Expensive calculation
      const baseRate = 5;
      const weightCost = weight * 0.5;
      const distanceCost = distance * 0.1;

      yield* Effect.sleep("100 millis"); // Simulate computation

      return baseRate + weightCost + distanceCost;
    })
);

// First call: Computes
const cost1 = yield* calculateShippingCost(10, 500);
// Logs: "Computing shipping for 10kg, 500km"

// Same arguments: Returns cached
const cost2 = yield* calculateShippingCost(10, 500);
// No log - cached result

// Different arguments: Computes new
const cost3 = yield* calculateShippingCost(20, 500);
// Logs: "Computing shipping for 20kg, 500km"
```

**Custom Equivalence:**

```typescript
import { Equal } from "effect";

interface ProductQuery {
  category: string;
  minPrice: number;
}

// Cache by object equality
const searchProducts = cachedFunction(
  (query: ProductQuery) =>
    Effect.gen(function* () {
      const db = yield* DatabaseService;
      yield* Effect.log(`Searching products`, query);

      const results = yield* db.query((qb) =>
        qb
          .selectFrom("products")
          .where("category", "=", query.category)
          .where("price", ">=", query.minPrice)
          .selectAll()
          .execute()
      );

      return results;
    }),
  {
    // Custom cache key equality
    equivalence: Equal.struct({
      category: Equal.string,
      minPrice: Equal.number,
    }),
  }
);

// Cached by object content, not reference
const results1 = yield* searchProducts({ category: "books", minPrice: 10 });
const results2 = yield* searchProducts({ category: "books", minPrice: 10 });
// Second call uses cache (same content)
```

---

#### Pattern 5: Layered Caching Strategy

**Combine Effect.cached (in-memory) + CacheService (distributed Redis)** for optimal performance.

```typescript
import { Effect, Option } from "effect";

// Two-tier caching: In-memory (L1) + Redis (L2)
const getProductDetails = (productId: string) =>
  Effect.gen(function* () {
    const cache = yield* CacheService; // L2: Redis
    const db = yield* DatabaseService;

    // Check L2 cache (Redis - shared across processes)
    const cached = yield* cache.get<Product>(`product:${productId}`);
    if (Option.isSome(cached)) {
      yield* Effect.log("L2 cache hit (Redis)");
      return cached.value;
    }

    // L2 miss: Query database
    yield* Effect.log("Cache miss - querying database");
    const product = yield* db.query((qb) =>
      qb
        .selectFrom("products")
        .where("id", "=", productId)
        .selectAll()
        .executeTakeFirst()
    );

    if (!product) {
      return yield* Effect.fail(new ProductNotFoundError({ productId }));
    }

    // Store in L2 cache (Redis)
    yield* cache.set(`product:${productId}`, product, "10 minutes");

    return product;
  }).pipe(
    Effect.cached // L1: In-memory cache per process
  );

// First call (Process A):
// 1. L1 miss (in-memory)
// 2. L2 miss (Redis)
// 3. Database query
// 4. Store in Redis
// 5. Cache in memory

// Second call (Process A):
// 1. L1 hit (in-memory) ✅ Fastest

// Call from Process B:
// 1. L1 miss (different process)
// 2. L2 hit (Redis) ✅ Fast, shared
```

**Decision Matrix for Layered Caching:**

```typescript
// Use L1 only (Effect.cached) when:
// - Single server/process
// - Low traffic
// - Data doesn't change across processes

// Use L2 only (CacheService/Redis) when:
// - Multiple servers
// - Need cache invalidation
// - Data shared across services

// Use L1 + L2 (Layered) when:
// - High traffic (thousands of req/sec)
// - Read-heavy operations
// - Multiple servers
// - Acceptable to serve slightly stale data
```

---

### Caching Strategy Decision Guide

| Scenario | Operator | Reason |
|----------|----------|--------|
| User profile lookup | Effect.cached | Rarely changes, high read |
| Exchange rates | Effect.cachedWithTTL | Time-sensitive |
| SDK initialization | Effect.once | Initialize exactly once |
| Shipping cost | cachedFunction | Depends on inputs |
| Multi-server app | CacheService | Share across processes |
| High-traffic reads | Layered | Best performance |
| API rate limits | Effect.cachedWithTTL | Respect quotas |
| Database connections | Effect.once | Pool initialization |
| Product catalog (multi-server) | Layered | Fast + shared |
| Configuration | Effect.once | Load once at startup |

---

### Anti-Patterns: What NOT to Do

```typescript
// ❌ WRONG: Creating new cached Effect each time
const getBadProfile = (userId: string) => {
  // Creates NEW cache on every call
  return Effect.gen(function* () {
    // ...
  }).pipe(Effect.cached);
};

// Each call creates new cache (no benefit)
yield* getBadProfile("user-123"); // Cache 1
yield* getBadProfile("user-123"); // Cache 2 (different instance!)

// ✅ CORRECT: Create cached Effect once, reuse
const cachedGetProfile = Effect.gen(function* () {
  // ...
}).pipe(Effect.cached);

yield* cachedGetProfile; // Cache
yield* cachedGetProfile; // Hit same cache

// ❌ WRONG: Using Effect.cached for cross-process data
// Will NOT share cache across servers
const sharedData = Effect.succeed(data).pipe(Effect.cached);

// ✅ CORRECT: Use CacheService for cross-process
const sharedData = Effect.gen(function* () {
  const cache = yield* CacheService;
  return yield* cache.get("shared-key");
});
```

---

### Cross-References

- [Repository Pattern with Caching](#repository-pattern-with-caching) - Infrastructure caching example
- [Stream Caching](./DATA-ACCESS.md) - Caching stream results
- [Effect Caching Documentation](https://effect.website/docs/caching/caching-effects/)

---

## Control Flow Patterns

### Decision Matrix: When to Use Control Flow Operators

Effect.ts provides declarative control flow operators that work seamlessly with Effects. Use this decision matrix to choose between plain JavaScript control flow and Effect operators:

| Scenario | Use Plain if/else | Use Effect.if/when/unless | Rationale |
|----------|-------------------|---------------------------|-----------|
| Condition is a **value** | ✅ **Recommended** | ❌ Unnecessary | Simple, readable, performant |
| Condition is an **Effect** | ❌ Can't use | ✅ **Required** | Must unwrap Effect first |
| Branches return **values** | ✅ **Recommended** | ❌ Over-engineering | No Effect context needed |
| Branches return **Effects** | ⚠️ Both work | ✅ **Clearer intent** | Effect operators show intent better |
| Optional execution (side effect) | ⚠️ if/else works | ✅ **Effect.when** | Explicit optional behavior |
| Guard clauses (early exit) | ⚠️ if with return | ✅ **Effect.unless** | Prevents nesting |
| Combining two parallel results | ❌ Complex | ✅ **Effect.zip** | Type-safe pairing |

**Rule of Thumb**:
- Use **Effect operators** when working primarily with Effects
- Use **plain JavaScript** when working with values
- When in doubt, **Effect.gen with if/else** is always valid

---

### Pattern 1: Effect.if - Binary Branching

**Use when**: You need to choose between two different effects based on a condition.

```typescript
import { Effect } from "effect";

// ✅ GOOD: Simple branching with Effect.if
const processOrder = (isPriority: boolean) =>
  Effect.if(isPriority, {
    onTrue: () =>
      Effect.gen(function* () {
        const expressService = yield* ExpressShippingService;
        return yield* expressService.ship();
      }),
    onFalse: () =>
      Effect.gen(function* () {
        const standardService = yield* StandardShippingService;
        return yield* standardService.ship();
      })
  });

// ⚠️ ACCEPTABLE: Effect.gen with plain if/else
const processOrderAlternative = (isPriority: boolean) =>
  Effect.gen(function* () {
    if (isPriority) {
      const expressService = yield* ExpressShippingService;
      return yield* expressService.ship();
    } else {
      const standardService = yield* StandardShippingService;
      return yield* standardService.ship();
    }
  });

// ❌ AVOID: Effect.if when condition is simple value
const getBadPrice = (isPremium: boolean) =>
  Effect.if(isPremium, {
    onTrue: () => Effect.succeed(99.99),
    onFalse: () => Effect.succeed(19.99)
  });

// ✅ BETTER: Plain JS for simple value branching
const getGoodPrice = (isPremium: boolean) =>
  Effect.succeed(isPremium ? 99.99 : 19.99);
```

**Effect.if with Effectful Condition**:

```typescript
import { Random } from "effect";

// Condition itself is an Effect
const randomChoice = Effect.if(Random.nextBoolean, {
  onTrue: () => Effect.log("Heads!").pipe(Effect.as("heads")),
  onFalse: () => Effect.log("Tails!").pipe(Effect.as("tails"))
});
```

---

### Pattern 2: Effect.when - Conditional Execution

**Use when**: You want to optionally execute an effect based on a condition. Returns `Option<A>` - `Some` if executed, `None` if skipped.

```typescript
import { Effect, Option } from "effect";

// ✅ GOOD: Guard clause with Effect.when
const sendNotification = (shouldNotify: boolean, userId: string) =>
  Effect.when(shouldNotify, () =>
    Effect.gen(function* () {
      const userRepo = yield* UserRepository;
      const user = yield* userRepo.findById(userId);

      if (Option.isNone(user)) {
        return yield* Effect.fail(new UserNotFoundError({ userId }));
      }

      const emailService = yield* EmailService;
      yield* emailService.send(user.value.email, "Notification");
    })
  );

// Result type: Effect<Option<void>, Error>
// - Some(void) when shouldNotify is true and effect succeeds
// - None when shouldNotify is false

// ✅ GOOD: Optional cache warming
const warmCacheIfEnabled = (config: Config) =>
  Effect.when(config.enableCaching, () =>
    Effect.gen(function* () {
      const cache = yield* CacheService;
      yield* cache.warmup();
      yield* Effect.log("Cache warmed successfully");
    })
  );

// Unwrap Option result
const result = yield* sendNotification(true, "user-123");
if (Option.isSome(result)) {
  console.log("Notification sent");
} else {
  console.log("Notification skipped");
}
```

**Effect.whenEffect** - Condition is an Effect:

```typescript
import { Random } from "effect";

// Random condition
const maybeSendEmail = (email: string) =>
  Effect.whenEffect(
    Random.nextBoolean, // Condition is Effect<boolean>
    () => EmailService.send(email, "Random notification")
  );
```

---

### Pattern 3: Effect.unless - Inverted Guard

**Use when**: You want to execute only if condition is **false** (inverted `when`).

```typescript
import { Effect } from "effect";

// ✅ GOOD: Early exit pattern with Effect.unless
const validateUser = (user: User) =>
  Effect.unless(user.isVerified, () =>
    Effect.fail(new UnverifiedUserError({ userId: user.id }))
  );

// Equivalent to:
// if (!user.isVerified) {
//   return Effect.fail(...)
// }

// ✅ GOOD: Skip expensive operation if already cached
const loadUserProfile = (userId: string) =>
  Effect.gen(function* () {
    const cache = yield* CacheService;
    const cached = yield* cache.get<UserProfile>(`user:${userId}`);

    // Only fetch if NOT cached
    yield* Effect.unless(Option.isSome(cached), () =>
      Effect.gen(function* () {
        const api = yield* UserAPI;
        const profile = yield* api.fetchProfile(userId);
        yield* cache.set(`user:${userId}`, profile);
      })
    );

    return Option.getOrElse(cached, () => /* default */);
  });
```

---

### Pattern 4: Effect.zip - Parallel Execution with Tuple Result

**Use when**: You need to run exactly **two** independent effects and combine results as a tuple `[A, B]`.

```typescript
import { Effect } from "effect";

// ✅ GOOD: Combine two independent queries
const getUserProfile = (userId: string) =>
  Effect.zip(
    UserRepository.findById(userId),
    PermissionsRepository.findByUserId(userId)
  ).pipe(
    Effect.map(([user, permissions]) => ({
      ...user,
      permissions
    }))
  );

// Result type: Effect<[User, Permission[]], Error>

// With concurrent option (parallel execution)
const getUserProfileParallel = (userId: string) =>
  Effect.zip(
    UserRepository.findById(userId),
    PermissionsRepository.findByUserId(userId),
    { concurrency: "unbounded" } // Run in parallel
  ).pipe(
    Effect.map(([user, permissions]) => ({ ...user, permissions }))
  );
```

**Comparison: Effect.zip vs Effect.all**:

```typescript
// Effect.zip: Exactly 2 effects, tuple result
const withZip = Effect.zip(effect1, effect2);
// Result: Effect<[A, B], E>

// Effect.all: Multiple effects, array or object result
const withAll = Effect.all([effect1, effect2]);
// Result: Effect<[A, B], E>

const withAllObject = Effect.all({
  user: effect1,
  permissions: effect2
});
// Result: Effect<{ user: A, permissions: B }, E>
```

**When to use each**:
- **Effect.zip**: Exactly 2 effects, prefer tuple destructuring
- **Effect.all**: 3+ effects, or when you want named results (object form)

---

### Pattern 5: Effect.zipWith - Combine with Custom Function

**Use when**: You want to combine two effects with a custom transformation.

```typescript
import { Effect } from "effect";

// ✅ GOOD: Custom combination logic
const getTotalPrice = (productId: string, quantity: number) =>
  Effect.zipWith(
    ProductRepository.findById(productId),
    DiscountService.getDiscount(productId),
    (product, discount) => {
      const basePrice = product.price * quantity;
      return basePrice * (1 - discount);
    }
  );

// Equivalent to:
const getTotalPriceAlternative = (productId: string, quantity: number) =>
  Effect.gen(function* () {
    const [product, discount] = yield* Effect.all([
      ProductRepository.findById(productId),
      DiscountService.getDiscount(productId)
    ]);

    const basePrice = product.price * quantity;
    return basePrice * (1 - discount);
  });
```

---

### Anti-Patterns: Control Flow

```typescript
// ❌ WRONG: Overusing Effect.if for complex branching
const badBranching = (status: string, user: User) =>
  Effect.if(status === "active", {
    onTrue: () =>
      Effect.if(user.isPremium, {
        onTrue: () => premiumActive(),
        onFalse: () => standardActive()
      }),
    onFalse: () =>
      Effect.if(status === "pending", {
        onTrue: () => pendingFlow(),
        onFalse: () => inactiveFlow()
      })
  });

// ✅ CORRECT: Use Effect.gen for complex logic
const goodBranching = (status: string, user: User) =>
  Effect.gen(function* () {
    if (status === "active") {
      return user.isPremium
        ? yield* premiumActive()
        : yield* standardActive();
    }

    if (status === "pending") {
      return yield* pendingFlow();
    }

    return yield* inactiveFlow();
  });

// ❌ WRONG: Using Effect operators for non-Effect values
const badValueBranching = (count: number) =>
  Effect.if(count > 10, {
    onTrue: () => Effect.succeed("many"),
    onFalse: () => Effect.succeed("few")
  });

// ✅ CORRECT: Plain JS for simple values
const goodValueBranching = (count: number) =>
  Effect.succeed(count > 10 ? "many" : "few");

// ❌ WRONG: Effect.zip for dependent operations
const badSequence = (userId: string) =>
  Effect.zip(
    createUser(userId),
    createOrder(userId) // Depends on user being created!
  );

// ✅ CORRECT: Sequential with Effect.gen
const goodSequence = (userId: string) =>
  Effect.gen(function* () {
    const user = yield* createUser(userId);
    const order = yield* createOrder(user.id); // Use created user
    return { user, order };
  });
```

---

### Decision Flowchart

```
Q: Do I need conditional logic?
│
├─ Condition is VALUE (boolean, number, etc.)?
│  │
│  ├─ Branches return VALUES?
│  │  └─ Use plain if/else or ternary operator ✅
│  │
│  └─ Branches return EFFECTS?
│     ├─ Simple binary choice?
│     │  └─ Use Effect.if or Effect.gen with if/else ⚠️
│     │
│     ├─ Optional execution (side effect)?
│     │  └─ Use Effect.when ✅
│     │
│     └─ Guard clause (early exit)?
│        └─ Use Effect.unless ✅
│
└─ Condition is EFFECT (Random.nextBoolean, API call)?
   │
   ├─ Binary choice?
   │  └─ Use Effect.if with effectful condition ✅
   │
   ├─ Optional execution?
   │  └─ Use Effect.whenEffect ✅
   │
   └─ Inverted guard?
      └─ Use Effect.unlessEffect ✅

Q: Do I need to combine two independent effects?
│
└─ Use Effect.zip or Effect.zipWith ✅
   (For 3+ effects, use Effect.all instead)
```

---

### Cross-References

- [Effect.all for batch operations](#effect-all-batch-operations) - Combining multiple effects
- [Effect.gen vs Combinators](#effect-gen-vs-combinators) - When to use generators
- [Error Handling Patterns](#error-handling-patterns) - Handling errors in branches

---

## Layer Creation Patterns

### Decision Tree: Choosing the Right Layer Constructor

```
START: Creating a new Layer for your service

1. Is this for TESTING or MOCKS?
   └─ YES → Use Layer.succeed (go to Test Pattern section below)
   └─ NO → Continue to step 2

2. Is service creation SYNCHRONOUS (no async/promises/Effects)?
   └─ YES → Use Layer.sync
   │       Example: new Stripe(key), createClient(), new Map()
   │       Key: Synchronous function that returns implementation
   │
   └─ NO → Continue to step 3

3. Does it need OTHER SERVICES via context injection?
   └─ YES → Continue to step 4
   │
   └─ NO → Continue to step 5

4. Does it have RESOURCES needing cleanup (connections, handles)?
   └─ YES → Use Layer.scoped + Effect.acquireRelease (see Pattern 3)
   │       Example: Database connection pool, WebSocket, file handle
   │       Key: Must clean up when scope ends
   │
   └─ NO → Use Layer.effect (see Pattern 2)
            Example: Services depending on config, other services
            Key: No cleanup needed, but needs Effect context for dependencies

5. Does it have RESOURCES needing cleanup (connections, handles)?
   └─ YES → Use Layer.scoped + Effect.acquireRelease
   │       Example: Database connection pool, WebSocket, file handle
   │       Key: Must clean up when scope ends
   │
   └─ NO → Use Layer.effect
            Example: Stateless transformers, pure computations
            Key: Async but no dependencies and no cleanup
```

### Decision Tree Summary Table

| Decision                         | Use                              | When                            | Cleanup?             |
| -------------------------------- | -------------------------------- | ------------------------------- | -------------------- |
| Sync, no deps, no cleanup        | `Layer.sync`                     | Stripe SDK, config objects      | No                   |
| Sync, needs deps, no cleanup     | `Layer.sync` first, then compose | Can't use deps in sync          | No                   |
| Async, needs deps, no cleanup    | `Layer.effect`                   | DatabaseService dependency      | No                   |
| Async, no deps, no cleanup       | `Layer.effect`                   | API calls without context       | No                   |
| Async, needs deps, NEEDS cleanup | `Layer.scoped`                   | DB pool, WebSocket              | YES - acquireRelease |
| Async, no deps, NEEDS cleanup    | `Layer.scoped`                   | File handle, connection         | YES - acquireRelease |
| Test/Mock layer                  | `Layer.succeed`                  | Testing with predictable values | No                   |

### Real-World Examples by Decision Path

**Example 1: Stripe Service (sync, no deps)**

```typescript
// ✅ Synchronous - no async/promises
static readonly Live = Layer.sync(this, () => new Stripe(apiKey))
```

**Example 2: PaymentService (async, needs deps, no cleanup)**

```typescript
// ✅ Needs DatabaseService, but no cleanup
static readonly Live = Layer.effect(this, Effect.gen(function* () {
  const db = yield* DatabaseService
  return { /* methods using db */ }
}))
```

**Example 3: KyselyService (async, needs deps, NEEDS cleanup)**

```typescript
// ✅ Needs pool creation AND cleanup
static readonly Live = Layer.scoped(this, Effect.gen(function* () {
  const pool = yield* Effect.acquireRelease(
    Effect.sync(() => new Pool(config)),
    (pool) => Effect.sync(() => pool.end())
  )
  const db = new Kysely({ dialect: new PostgresDialect({ pool }) })
  return { /* methods using db */ }
}))
```

**Example 4: Test Mock (no decisions needed)**

```typescript
// ✅ PATTERN B: Test layer as static property (recommended)
// Keep test layer with service definition for discoverability
export class PaymentService extends Context.Tag('PaymentService')<
  PaymentService,
  PaymentServiceInterface
>() {
  static readonly Live = Layer.effect(/* ... */);

  // ✅ Pattern B: Test layer as static property
  static readonly Test = Layer.succeed(this, {
    processPayment: () => Effect.succeed(mockResult),
    refundPayment: () => Effect.succeed(void 0),
  });
}
```

### Layer.sync - Synchronous Creation

```typescript
// ✅ For synchronous service creation (no async/Effects)
export class StripeService extends Context.Tag('StripeService')<
  StripeService,
  Stripe // Direct SDK type
>() {
  static readonly Live = Layer.sync(
    this,
    () => new Stripe(process.env.STRIPE_KEY!),
  );
}
```

### Layer.effect - Effectful Creation

```typescript
// ✅ When service needs dependencies - return object directly
export class PaymentService extends Context.Tag("PaymentService")<
  PaymentService,
  PaymentServiceInterface
>() {
  static readonly Live = Layer.effect(
    this,
    Effect.gen(function* () {
      const stripe = yield* StripeService
      const database = yield* DatabaseService

      // Direct object return - no .make() or .of()
      return {
        processPayment: (amount) => /* implementation */,
        refundPayment: (id) => /* implementation */
      }
    })
  )
}

// Alternative: Using Effect.map for simple transformations
export const ConfiguredServiceLive = Layer.effect(
  ConfiguredService,
  Effect.map(
    Config.string("API_KEY"),
    (apiKey) => ({ apiKey, makeRequest: () => /* ... */ })
  )
)
```

### Layer.scoped - Resource Management

```typescript
// ✅ For resources needing cleanup
export const DatabaseServiceLive = Layer.scoped(
  DatabaseService,
  Effect.gen(function* () {
    // Acquire resource with automatic cleanup
    const pool = yield* Effect.acquireRelease(
      Effect.sync(() => createPool(config)),
      (pool) => Effect.sync(() => pool.end()),
    );

    const db = new Kysely({ dialect: new PostgresDialect({ pool }) });

    // Direct object return - no .make() or .of()
    return {
      query: (fn) =>
        Effect.tryPromise({
          try: () => fn(db),
          catch: (error) => new DatabaseQueryError({ cause: error }),
        }),
    };
  }),
);

// Alternative: Using addFinalizer
export const WebSocketServiceLive = Layer.scoped(
  WebSocketService,
  Effect.gen(function* () {
    const ws = new WebSocket(url);

    // Register cleanup
    yield* Effect.addFinalizer(() => Effect.sync(() => ws.close()));

    // Direct object return
    return {
      send: (message) => Effect.sync(() => ws.send(message)),
      close: () => Effect.sync(() => ws.close()),
    };
  }),
);
```

### Layer.succeed - Test/Mock Layers

Use for creating test implementations with predictable behavior.

#### Simple Mock (Pattern B - Recommended)

**✅ PATTERN B**: Keep test layer with service definition for discoverability:

```typescript
// ✅ PATTERN B: Test layer as static property (recommended)
export class PaymentService extends Context.Tag("PaymentService")<
  PaymentService,
  PaymentServiceInterface
>() {
  static readonly Live = Layer.effect(
    this,
    Effect.gen(function* () {
      const stripe = yield* StripeService
      return {
        processPayment: (amount) => /* implementation */,
        refundPayment: (id) => /* implementation */
      }
    })
  )

  // ✅ Test layer as static property - keeps test and implementation together
  static readonly Test = Layer.succeed(this, {
    processPayment: () => Effect.succeed({
      id: 'test',
      status: 'success',
      amount: 1000,
      currency: 'usd'
    }),
    refundPayment: () => Effect.succeed(void 0)
  })
}
```

**Alternative: Separate Export (Legacy)**

Only use when test layer needs to be in a different file:

```typescript
// ⚠️ Less discoverable - only use when test must be separate
export const PaymentServiceTest = Layer.succeed(PaymentService, {
  processPayment: () =>
    Effect.succeed({
      id: 'test',
      status: 'success',
      amount: 1000,
      currency: 'usd',
    }),
  refundPayment: () => Effect.succeed(void 0),
});
```

#### Type-Safe Mock Factory (Complex Types)

**⭐ GOLD STANDARD**: For complex external SDK types or domain types with 10+ fields, use type-safe factory pattern to ensure compiler validates ALL required fields:

```typescript
// ✅ Type-safe factory - NO type assertions
// Compiler enforces ALL required fields are present

/**
 * Creates a complete mock PaymentIntent with all required Stripe fields.
 * No type assertions - TypeScript validates completeness at compile time.
 *
 * @param overrides - Partial override for specific test scenarios
 * @returns Fully typed Stripe.PaymentIntent without type coercion
 */
const createMockPaymentIntent = (
  overrides?: Partial<Stripe.PaymentIntent>,
): Stripe.PaymentIntent => {
  // Define complete base object with ALL required fields
  const base: Stripe.PaymentIntent = {
    id: 'pi_test_mock',
    object: 'payment_intent',
    amount: 1000,
    amount_capturable: 0,
    amount_received: 1000,
    application: null,
    application_fee_amount: null,
    automatic_payment_methods: null,
    canceled_at: null,
    cancellation_reason: null,
    capture_method: 'automatic',
    client_secret: 'pi_test_secret_mock',
    confirmation_method: 'automatic',
    created: Math.floor(Date.now() / 1000),
    currency: 'usd',
    customer: null,
    description: null,
    invoice: null,
    last_payment_error: null,
    latest_charge: null,
    livemode: false,
    metadata: {},
    next_action: null,
    payment_method: null,
    payment_method_types: ['card'],
    status: 'succeeded',
    // ... ALL other required fields
  };

  return { ...base, ...overrides };
  // ✅ No type assertion (as any, as Type) - compiler validates completeness
};

// ✅ PATTERN B: Use factory in test layer (static property)
export class StripeService extends Context.Tag('StripeService')<
  StripeService,
  StripeServiceInterface
>() {
  static readonly Live = Layer.sync(
    this,
    () => new Stripe(process.env.STRIPE_KEY!),
  );

  // ✅ Pattern B: Test layer with factory function
  static readonly Test = Layer.succeed(this, {
    createPaymentIntent: (params) =>
      Effect.succeed(
        createMockPaymentIntent({
          amount: params.amount,
          currency: params.currency,
        }),
      ),
    retrievePaymentIntent: (id) =>
      Effect.succeed(createMockPaymentIntent({ id })),
  });
}
```

**❌ ANTI-PATTERN - Type Assertions**:

```typescript
// ❌ WRONG - Type assertion masks missing fields
const mockPayment = {
  id: 'test',
  amount: 1000,
} as Stripe.PaymentIntent; // Compiler can't catch missing required fields!

// ❌ WRONG - Partial mock with assertion
return {
  id: 'test',
  status: 'succeeded',
} as PaymentIntent; // Missing required fields won't be caught
```

**When to Use Each Approach**:

| Pattern             | Use When                   | Example                          |
| ------------------- | -------------------------- | -------------------------------- |
| **Inline Mock**     | Simple types (<5 fields)   | Domain entities, DTOs            |
| **Factory Pattern** | Complex types (10+ fields) | External SDK types (Stripe, AWS) |
| **Factory Pattern** | Type safety critical       | Financial data, user records     |
| **Inline Mock**     | Rapid prototyping          | Early development, POCs          |

**Benefits of Factory Pattern**:

- ✅ Compiler enforces ALL required fields
- ✅ Type-safe overrides for test scenarios
- ✅ Reusable across multiple tests
- ✅ Self-documenting - shows complete type structure
- ✅ Prevents runtime errors from missing fields

## Pattern B: Test Layers as Static Properties

**Pattern B** is the **recommended approach** for organizing test layers in Effect.ts services. It keeps test implementations co-located with service definitions for better discoverability and maintainability.

### What is Pattern B?

Pattern B defines test layers as static properties directly on the service class, alongside the `Live` implementation:

```typescript
export class PaymentService extends Context.Tag("PaymentService")<
  PaymentService,
  PaymentServiceInterface
>() {
  // Production implementation
  static readonly Live = Layer.effect(
    this,
    Effect.gen(function* () {
      const stripe = yield* StripeService
      return {
        processPayment: (amount) => /* production logic */
      }
    })
  )

  // ✅ PATTERN B: Test implementation as static property
  static readonly Test = Layer.succeed(this, {
    processPayment: () => Effect.succeed(mockResult)
  })
}
```

### Why Pattern B?

**✅ Benefits**:

1. **Discoverability**: Test layer is immediately visible when reading service definition
2. **Co-location**: Test and implementation stay together, reducing file switching
3. **Type Safety**: TypeScript enforces test layer matches service interface
4. **Refactoring**: When service interface changes, test layer is right there to update
5. **IDE Support**: Autocomplete shows `Service.Test` alongside `Service.Live`
6. **Less Boilerplate**: No need for separate test utility files
7. **Convention**: Matches Effect.ts official patterns and ecosystem libraries

**Usage**:

```typescript
// Test file - just import the service
import { PaymentService } from './payment-service';
import { DatabaseService } from '@samuelho-dev/infra-database';

const TestLayer = Layer.mergeAll(
  DatabaseService.Test, // ✅ Clear and discoverable
  PaymentService.Test, // ✅ Clear and discoverable
);
```

### Pattern Comparison

#### Pattern B (Recommended): Static Property

```typescript
// service.ts
export class MyService extends Context.Tag('MyService')</*...*/> {
  static readonly Live = Layer.effect(/* ... */);
  static readonly Test = Layer.succeed(this, {
    /* mock */
  });
}

// test.ts
import { MyService } from './service';
Effect.provide(MyService.Test); // ✅ Discoverable
```

**Pros**:

- ✅ Test layer always visible with service
- ✅ IDE autocomplete shows all layer variants
- ✅ Single import needed
- ✅ Refactoring-friendly

**Cons**:

- ⚠️ Test code in production bundle (negligible size impact)

#### Pattern A (Legacy): Separate Export

```typescript
// service.ts
export class MyService extends Context.Tag('MyService')</*...*/> {
  static readonly Live = Layer.effect(/* ... */);
}

// service.test-utils.ts (separate file)
export const MyServiceTest = Layer.succeed(MyService, {
  /* mock */
});

// test.ts
import { MyService } from './service';
import { MyServiceTest } from './service.test-utils';
Effect.provide(MyServiceTest); // ⚠️ Less discoverable
```

**Pros**:

- ✅ Test code excluded from production bundle
- ✅ Separate test utilities file for complex setups

**Cons**:

- ❌ Requires multiple imports
- ❌ Easy to miss when service changes
- ❌ Less discoverable (need to know test utils file exists)
- ❌ More files to maintain

### When to Use Pattern A (Separate Export)

Only use separate exports when:

1. **Complex Test Setup**: Test layer requires extensive mock factories or utilities that would clutter service file
2. **Shared Test Infrastructure**: Test layer is used across multiple test files and benefits from centralization
3. **Bundle Size Critical**: Production bundle size is critical and test code must be excluded (rare)
4. **Team Preference**: Team has established convention for separate test files

### Pattern B Best Practices

**1. Multiple Test Variants**:

```typescript
export class PaymentService extends Context.Tag('PaymentService')</*...*/> {
  static readonly Live = Layer.effect(/* ... */);

  // Default test layer
  static readonly Test = Layer.succeed(this, {
    processPayment: () => Effect.succeed(successResult),
  });

  // Failure test layer
  static readonly TestFailure = Layer.succeed(this, {
    processPayment: () =>
      Effect.fail(new PaymentError({ message: 'Card declined' })),
  });

  // Mock with configurable overrides
  static readonly Mock = (overrides?: Partial<PaymentServiceInterface>) =>
    Layer.succeed(this, {
      processPayment:
        overrides?.processPayment ?? (() => Effect.succeed(mockResult)),
    });
}
```

**2. Dev Layer for Local Development**:

```typescript
export class PaymentService extends Context.Tag('PaymentService')</*...*/> {
  static readonly Live = Layer.effect(/* production */);
  static readonly Test = Layer.succeed(/* fast mocks */);

  // Dev layer with logging and delays
  static readonly Dev = Layer.effect(
    this,
    Effect.gen(function* () {
      const logger = yield* LoggingService;
      return {
        processPayment: (amount) =>
          Effect.gen(function* () {
            yield* logger.info(`[DEV] Processing payment: ${amount}`);
            yield* Effect.sleep('100 millis');
            return mockResult;
          }),
      };
    }),
  );
}
```

**3. Environment-Based Auto Layer**:

```typescript
export class PaymentService extends Context.Tag('PaymentService')</*...*/> {
  static readonly Live = Layer.effect(/* production */);
  static readonly Test = Layer.succeed(/* test */);
  static readonly Dev = Layer.effect(/* dev */);

  // Auto-select based on NODE_ENV
  static readonly Auto = Layer.unwrapEffect(
    Effect.gen(function* () {
      const env = yield* Config.string('NODE_ENV');
      switch (env) {
        case 'test':
          return PaymentService.Test;
        case 'development':
          return PaymentService.Dev;
        default:
          return PaymentService.Live;
      }
    }),
  );
}
```

### Migration from Pattern A to Pattern B

**Before (Pattern A)**:

```typescript
// service.ts
export class MyService extends Context.Tag('MyService')</*...*/> {
  static readonly Live = Layer.effect(/* ... */);
}

// service.test-utils.ts
export const MyServiceTest = Layer.succeed(MyService, {
  /* mock */
});
```

**After (Pattern B)**:

```typescript
// service.ts
export class MyService extends Context.Tag('MyService')</*...*/> {
  static readonly Live = Layer.effect(/* ... */);

  // ✅ Moved test layer here
  static readonly Test = Layer.succeed(this, {
    /* mock */
  });
}

// Delete service.test-utils.ts
```

**Update tests**:

```typescript
// Before
import { MyService } from './service';
import { MyServiceTest } from './service.test-utils';
Effect.provide(MyServiceTest);

// After
import { MyService } from './service';
Effect.provide(MyService.Test); // ✅ Cleaner
```

## Error Handling Patterns

**VALIDATED**: Both Data.TaggedError and Schema.TaggedError exist in Effect 3.0+. Choose based on error context.

### Error Type Selection Guide

#### Data.TaggedError - Domain & Business Logic Errors (Default)

**Use for**: Domain-specific errors in contracts, data-access, and feature layers.

✅ **Use Data.TaggedError when:**

- Domain validation errors (ProductNotFoundError, InvalidPriceError)
- Business rule violations (InsufficientStockError, UnauthorizedActionError)
- Repository operation failures (DatabaseError, CacheError)
- Service-level errors (PaymentProcessingError)
- **No schema encoding/decoding needed**
- Error is part of your domain model
- Staying within Effect runtime (no RPC boundary)

```typescript
// ✅ Domain errors in contracts layer
import { Data } from 'effect';

export class ProductNotFoundError extends Data.TaggedError(
  'ProductNotFoundError',
)<{
  readonly productId: string;
  readonly reason?: string;
}> {}

export class PaymentError extends Data.TaggedError('PaymentError')<{
  readonly message: string;
  readonly code?: string;
  readonly cause?: unknown;
}> {}

export class InsufficientFundsError extends Data.TaggedError(
  'InsufficientFundsError',
)<{
  readonly available: number;
  readonly required: number;
}> {}

// Union type for exhaustive error matching
export type PaymentErrors = PaymentError | InsufficientFundsError;

// Usage in service
const processPayment = (amount: number) =>
  Effect.gen(function* () {
    const balance = yield* getBalance();

    if (balance < amount) {
      return yield* Effect.fail(
        new InsufficientFundsError({ available: balance, required: amount }),
      );
    }

    return yield* chargePayment(amount);
  });
```

**Benefits:**

- ✅ Lightweight (no schema validation overhead)
- ✅ Fast error creation
- ✅ Ideal for domain logic
- ✅ Yieldable in Effect.gen (can `yield* new Error()`)

#### Schema.TaggedError - RPC & Serialization Boundaries

**Use for**: Errors that cross RPC boundaries and need schema validation.

✅ **Use Schema.TaggedError when:**

- Errors sent over tRPC, HTTP, or RPC protocols
- Need runtime schema validation of error structure
- Error properties need encoding/decoding (dates, complex types)
- Crossing service boundaries (microservices, API responses)
- Integration with @effect/rpc

```typescript
// ✅ RPC errors that cross boundaries
import { Schema } from 'effect';

export class PaymentRpcError extends Schema.TaggedError<PaymentRpcError>()(
  'PaymentRpcError',
  {
    message: Schema.String,
    code: Schema.String,
    timestamp: Schema.DateTimeUtc, // Schema encoding needed for Date
    metadata: Schema.optional(Schema.Record(Schema.String, Schema.Unknown)),
  },
) {}

// Usage in RPC router
import { Rpc } from '@effect/rpc';

export const paymentRouter = Rpc.make([
  ProcessPaymentRequest.pipe(
    Rpc.toHandler((req) =>
      processPayment(req.amount).pipe(
        // Transform domain error to RPC error
        Effect.catchAll((domainError) =>
          Effect.fail(
            new PaymentRpcError({
              message: domainError.message,
              code: 'PAYMENT_FAILED',
              timestamp: new Date().toISOString(),
            }),
          ),
        ),
      ),
    ),
  ),
]);
```

**Benefits:**

- ✅ Schema validation on encode/decode
- ✅ Type-safe serialization
- ✅ Works across RPC boundaries
- ✅ Complex type encoding (dates, branded types)

### Decision Matrix

| Scenario            | Use                | Rationale                |
| ------------------- | ------------------ | ------------------------ |
| Repository error    | Data.TaggedError   | Domain boundary, no RPC  |
| Service error       | Data.TaggedError   | Business logic, no RPC   |
| tRPC error response | Schema.TaggedError | Crosses RPC boundary     |
| HTTP API error      | Schema.TaggedError | Needs serialization      |
| Validation error    | Data.TaggedError   | Domain validation        |
| Database error      | Data.TaggedError   | Infrastructure, no RPC   |
| Microservice call   | Schema.TaggedError | Crosses service boundary |
| WebSocket error     | Schema.TaggedError | Needs wire encoding      |

### Error Transformation Pattern

Transform domain errors to RPC errors at the boundary:

```typescript
// Domain layer: Use Data.TaggedError
export class ProductNotFoundError extends Data.TaggedError(
  'ProductNotFoundError',
)<{
  readonly productId: string;
}> {}

// RPC layer: Transform to Schema.TaggedError
export class ProductNotFoundRpcError extends Schema.TaggedError<ProductNotFoundRpcError>()(
  'ProductNotFoundRpcError',
  {
    productId: Schema.String,
    timestamp: Schema.DateTimeUtc,
  },
) {}

// Transformation at RPC boundary
export const productRouter = Rpc.make([
  GetProductRequest.pipe(
    Rpc.toHandler((req) =>
      productService.getProduct(req.id).pipe(
        Effect.catchTag('ProductNotFoundError', (error) =>
          Effect.fail(
            new ProductNotFoundRpcError({
              productId: error.productId,
              timestamp: new Date().toISOString(),
            }),
          ),
        ),
      ),
    ),
  ),
]);
```

### Effect 4.0 Compatibility

Both error types are stable and expected to remain in Effect 4.0:

- ✅ **Data.TaggedError**: Core error type, guaranteed stability
- ✅ **Schema.TaggedError**: RPC integration, guaranteed stability

### Default Rule

**Use Data.TaggedError unless you're explicitly at an RPC boundary.**

When in doubt:

- Are you sending this error over the network? → Schema.TaggedError
- Is it internal domain logic? → Data.TaggedError

## Effect.all - Batch Operations & Parallel Execution

### Overview

`Effect.all` is Effect's primary tool for combining multiple independent effects. It enables parallel execution with fine-grained concurrency control, making it essential for batch operations, data loading, and performant APIs.

**Key Features**:
- Accepts arrays, objects, or iterables of effects
- Configurable concurrency (unbounded, bounded, or sequential)
- Short-circuits on first error (fail-fast behavior)
- Type-safe result aggregation

---

### Decision Matrix: Effect.all vs Alternatives

| Scenario | Use Effect.all | Use Alternative | Rationale |
|----------|----------------|-----------------|-----------|
| 2-10 independent effects | ✅ **Effect.all** | ⚠️ Effect.zip for exactly 2 | Clear intent, flexible result type |
| 10-100 independent effects | ✅ **Effect.all with concurrency limit** | ❌ | Prevents overwhelming services |
| 100+ independent effects | ⚠️ Consider Stream | ✅ **Stream.fromIterable + Stream.mapEffect** | Better memory management |
| Effects depend on each other | ❌ | ✅ **Effect.gen with yield\*** | Must execute sequentially |
| Need to collect errors | ⚠️ Fails fast | ✅ **Effect.allSuccesses** | Continue after errors |
| Named results needed | ✅ **Effect.all with object** | ⚠️ Effect.all with array + destructuring | Better readability |

---

### Pattern 1: Batch Operations with Array

**Use when**: You have multiple independent operations to run in parallel.

```typescript
import { Effect } from "effect";

// ✅ GOOD: Load multiple users in parallel
const loadDashboardData = (userId: string, teamIds: readonly string[]) =>
  Effect.all([
    UserRepository.findById(userId),
    TeamRepository.findByIds(teamIds),
    NotificationRepository.findUnread(userId),
    ActivityRepository.findRecent(userId, 10)
  ]).pipe(
    Effect.map(([user, teams, notifications, activities]) => ({
      user,
      teams,
      notifications,
      activities
    }))
  );

// Result type: Effect<{user: User, teams: Team[], ...}, Error>
```

---

### Pattern 2: Batch Operations with Object (Named Results)

**Use when**: You want readable, self-documenting result access.

```typescript
import { Effect } from "effect";

// ✅ BETTER: Named results for clarity
const loadDashboardData = (userId: string) =>
  Effect.all({
    user: UserRepository.findById(userId),
    teams: TeamRepository.findByUserId(userId),
    notifications: NotificationRepository.findUnread(userId),
    activities: ActivityRepository.findRecent(userId, 10)
  });

// Access with dot notation
const dashboard = yield* loadDashboardData("user-123");
console.log(dashboard.user.name);
console.log(dashboard.teams.length);

// Result type: Effect<{
//   user: User,
//   teams: Team[],
//   notifications: Notification[],
//   activities: Activity[]
// }, Error>
```

---

### Pattern 3: Concurrency Control

**Use when**: You need to limit concurrent operations to avoid overwhelming downstream services.

```typescript
import { Effect } from "effect";

// ❌ WRONG: Unbounded concurrency (10,000 users = 10,000 concurrent DB queries!)
const loadAllUsersBad = (userIds: readonly string[]) =>
  Effect.all(
    userIds.map(id => UserRepository.findById(id))
  );

// ✅ CORRECT: Bounded concurrency
const loadAllUsers = (userIds: readonly string[]) =>
  Effect.all(
    userIds.map(id => UserRepository.findById(id)),
    { concurrency: 10 } // Max 10 concurrent queries
  );

// ✅ CORRECT: Sequential execution (one at a time)
const loadSequentially = (userIds: readonly string[]) =>
  Effect.all(
    userIds.map(id => UserRepository.findById(id)),
    { concurrency: 1 } // Process one by one
  );

// ✅ CORRECT: Inherit parent concurrency
const loadWithInheritance = (userIds: readonly string[]) =>
  Effect.all(
    userIds.map(id => UserRepository.findById(id)),
    { concurrency: "inherit" } // Use parent's concurrency setting
  );
```

**Concurrency Options**:
- `{ concurrency: "unbounded" }` - No limit (default) - Use for < 10 operations
- `{ concurrency: N }` - Fixed limit - Use for 10-100 operations
- `{ concurrency: 1 }` - Sequential - Guarantees order
- `{ concurrency: "inherit" }` - Use parent's setting - For nested Effect.all calls

**Performance Guide**:
- **< 10 operations**: Unbounded OK
- **10-100 operations**: Bounded (5-20 concurrent)
- **100+ operations**: Consider Stream.fromIterable + Stream.mapEffect

---

### Pattern 4: Short-Circuiting Behavior

**Important**: `Effect.all` uses fail-fast semantics - it stops on the first error.

```typescript
import { Effect } from "effect";

const validateAllFields = (fields: readonly Field[]) =>
  Effect.all(
    fields.map(field => validateField(field))
  );

// If field[2] fails, fields[3+] never execute
// Remaining operations are interrupted

// ✅ Behavior: Fast failure detection
// ❌ Limitation: Don't get all validation errors
```

**When fail-fast is good**:
- External API calls (save time/cost on known failures)
- Database queries (don't waste connections)
- Expensive operations (stop early on critical failures)

**When fail-fast is bad**:
- Form validation (user wants all errors at once)
- Batch processing (need to know all failures)
- Data migrations (want full error report)

For these cases, use `Effect.allSuccesses` (Pattern 5).

---

### Pattern 5: Collecting All Results with Effect.allSuccesses

**Use when**: You want to process all items even if some fail, collecting both successes and failures.

```typescript
import { Effect, Option } from "effect";

// Process all items, collect successes and failures
const processAllItems = (items: readonly Item[]) =>
  Effect.allSuccesses(
    items.map(item => processItem(item))
  ).pipe(
    Effect.map((results) => {
      const successes = results.filter(Option.isSome).map(opt => opt.value);
      const failureCount = results.filter(Option.isNone).length;

      return {
        successes,
        failureCount,
        total: results.length,
        successRate: successes.length / results.length
      };
    })
  );

// Result type: Effect<Option<Result>[], never>
// - Some(result) for successful operations
// - None for failed operations
// - Never fails (always succeeds with array of Options)
```

**Real-World Example: Batch User Import**

```typescript
import { Effect, Option, Exit } from "effect";

interface ImportResult {
  readonly imported: readonly User[];
  readonly failed: readonly { email: string; error: string }[];
}

const importUsers = (emails: readonly string[]): Effect.Effect<ImportResult> =>
  Effect.allSuccesses(
    emails.map(email =>
      Effect.gen(function* () {
        // Validate email
        const validated = yield* validateEmail(email);

        // Check if user exists
        const existing = yield* UserRepository.findByEmail(email);
        if (Option.isSome(existing)) {
          return yield* Effect.fail(new DuplicateEmailError({ email }));
        }

        // Create user
        const user = yield* UserRepository.create({
          email: validated,
          createdAt: new Date()
        });

        return user;
      }).pipe(
        Effect.exit
      )
    )
  ).pipe(
    Effect.map((exits) => {
      const imported: User[] = [];
      const failed: { email: string; error: string }[] = [];

      exits.forEach((exit, index) => {
        if (Exit.isSuccess(exit)) {
          imported.push(exit.value);
        } else {
          failed.push({
            email: emails[index],
            error: Exit.isFailure(exit) ? exit.cause.toString() : "Unknown error"
          });
        }
      });

      return { imported, failed };
    })
  );

// Usage
const result = yield* importUsers(["user1@example.com", "user2@example.com"]);
console.log(`Imported: ${result.imported.length}, Failed: ${result.failed.length}`);
```

---

### Pattern 6: Effect.forEach - Functional Iteration

**Use when**: You want to transform an iterable with effects (more functional than Effect.all + map).

```typescript
import { Effect } from "effect";

// ✅ GOOD: Effect.forEach for transformation
const enrichUsers = (userIds: readonly string[]) =>
  Effect.forEach(
    userIds,
    (id) =>
      Effect.gen(function* () {
        const user = yield* UserRepository.findById(id);
        const orders = yield* OrderRepository.countByUserId(id);
        const lastLogin = yield* ActivityRepository.getLastLogin(id);

        return {
          ...user,
          orderCount: orders,
          lastLogin
        };
      }),
    { concurrency: 10 }
  );

// Equivalent to:
const enrichUsersAlternative = (userIds: readonly string[]) =>
  Effect.all(
    userIds.map(id =>
      Effect.gen(function* () {
        // same implementation
      })
    ),
    { concurrency: 10 }
  );
```

**Effect.forEach vs Effect.all + map**:
- `Effect.forEach`: More functional, clearer intent
- `Effect.all + map`: More explicit transformation
- Both are equivalent - choose based on team preference

---

### Anti-Patterns

```typescript
// ❌ WRONG: No concurrency control for external API
const fetchAllExternalUsers = (ids: readonly string[]) =>
  Effect.all(
    ids.map(id => ExternalAPI.fetchUser(id))
    // 1000 IDs = 1000 concurrent HTTP requests = rate limit! 💥
  );

// ✅ CORRECT: Bounded concurrency
const fetchAllExternalUsersCorrect = (ids: readonly string[]) =>
  Effect.all(
    ids.map(id => ExternalAPI.fetchUser(id)),
    { concurrency: 5 } // Respectful rate limiting
  );

// ❌ WRONG: Effect.all for dependent operations
const createUserAndOrder = (userId: string) =>
  Effect.all({
    user: createUser(userId),
    order: createOrder(userId) // Depends on user being created first!
  });

// ✅ CORRECT: Sequential with Effect.gen
const createUserAndOrderCorrect = (userId: string) =>
  Effect.gen(function* () {
    const user = yield* createUser(userId);
    const order = yield* createOrder(user.id); // Use created user's ID
    return { user, order };
  });

// ❌ WRONG: Effect.all for large datasets
const processThousandsOfFiles = (files: readonly File[]) =>
  Effect.all(
    files.map(file => processFile(file))
    // 10,000 files loaded into memory at once! 💥
  );

// ✅ CORRECT: Use Stream for large datasets
import { Stream } from "effect";

const processThousandsOfFilesCorrect = (files: readonly File[]) =>
  Stream.fromIterable(files).pipe(
    Stream.mapEffect(file => processFile(file), { concurrency: 10 }),
    Stream.runCollect
  );
```

---

### When to Use What

**Use Effect.all when**:
- Operations are independent (no data dependencies)
- Number of operations is known and reasonable (< 100)
- You want fail-fast behavior
- You need type-safe result aggregation

**Use Effect.allSuccesses when**:
- You need to process all items even if some fail
- Form validation (collect all errors)
- Batch operations (complete error report)
- Import/export operations

**Use Effect.forEach when**:
- You prefer functional iteration style
- Transforming iterables with effects
- Equivalent to Effect.all + map

**Use Stream.fromIterable when**:
- Processing 100+ items
- Memory efficiency is critical
- Backpressure control needed
- Working with large datasets

**Use Effect.gen with yield\* when**:
- Operations depend on each other
- Sequential execution required
- Complex control flow

---

### Real-World Examples

**Example 1: API Dashboard Load**

```typescript
const loadUserDashboard = (userId: string) =>
  Effect.all({
    profile: UserService.getProfile(userId),
    stats: AnalyticsService.getUserStats(userId),
    notifications: NotificationService.getUnread(userId),
    recentActivity: ActivityService.getRecent(userId, 10)
  }).pipe(
    Effect.withSpan("load-dashboard"), // Tracing
    Effect.timeout("3 seconds"), // Timeout for all operations
    Effect.catchAll((error) =>
      Effect.succeed({
        profile: null,
        stats: null,
        notifications: [],
        recentActivity: []
      }) // Graceful degradation
    )
  );
```

**Example 2: Batch Data Enrichment**

```typescript
const enrichProducts = (productIds: readonly string[]) =>
  Effect.forEach(
    productIds,
    (id) =>
      Effect.all({
        product: ProductRepository.findById(id),
        reviews: ReviewRepository.findByProductId(id),
        inventory: InventoryService.getStock(id),
        pricing: PricingService.getPrice(id)
      }).pipe(
        Effect.map(({ product, reviews, inventory, pricing }) => ({
          ...product,
          reviewCount: reviews.length,
          averageRating: calculateAverage(reviews),
          inStock: inventory > 0,
          price: pricing
        }))
      ),
    { concurrency: 20 } // Process 20 products at a time
  );
```

---

### Cross-References

- [Control Flow Patterns](#control-flow-patterns) - Effect.zip for exactly 2 effects
- [Streaming & Queuing Patterns](#streaming--queuing-patterns) - Stream.fromIterable for large datasets
- [Error Handling Patterns](#error-handling-patterns) - Handling errors in parallel operations

---

## Advanced Effect Patterns

This section covers production-grade patterns for resilience, resource management, validation, and error handling at scale.

### Pattern Selection Guide

Use this matrix to quickly identify which pattern best fits your use case:

| Pattern | Best For | Alternatives | Complexity |
|---------|----------|--------------|------------|
| tapErrorTag | Error observability without handling | catchTag (if handling needed) | Low |
| filterOrFail | Input validation with custom errors | Schema validation libraries | Low |
| parallelErrors | Collecting all validation errors | Default fail-fast behavior | Low |
| mapBoth | Transforming both success and error channels | Separate map + mapError | Low |
| timeout+retry | External API resilience with fallback | Circuit breaker (for cascades) | Medium |
| Circuit Breaker | Preventing cascading failures | Timeout+retry only | High |
| Exit-aware finalizers | Transactional cleanup (commit/rollback) | Simple acquireRelease | Medium |

**Quick Decision Tree:**
- Need to observe errors without handling? → **tapErrorTag**
- Need to validate data with custom errors? → **filterOrFail**
- Need to collect all errors from parallel operations? → **parallelErrors**
- Need to transform both success and error simultaneously? → **mapBoth**
- Need timeout protection for external APIs? → **timeout+retry**
- Need to prevent cascading failures? → **Circuit Breaker**
- Need conditional cleanup based on success/failure? → **Exit-aware finalizers**

---

### Resilience Patterns

#### Timeout + Retry + Cache Fallback

Multi-tier fallback strategy for external service calls with graceful degradation:

```typescript
import { Effect, Schedule, Option } from "effect";

const resilientGet = (id: string) =>
  Effect.tryPromise({
    try: () => sdkClient.get(id),
    catch: (error) => new SDKError({ cause: error }),
  }).pipe(
    Effect.timeout("5 seconds"),
    Effect.retry({
      schedule: Schedule.exponential("200 millis"),
      times: 3
    }),
    Effect.catchTag("TimeoutException", () =>
      Effect.gen(function* () {
        const cached = yield* cache.get<Resource>(`resource:${id}`);
        return yield* Option.match(cached, {
          onSome: Effect.succeed,
          onNone: () => Effect.fail(new ResourceUnavailableError({
            message: "Resource unavailable and no cache"
          }))
        });
      })
    )
  );
```

**Use for:** External APIs with unreliable networks, SLA-critical operations requiring graceful degradation.

---

#### Circuit Breaker Pattern

> **Pattern Overview:** Prevents cascading failures by tracking errors and fast-failing when threshold exceeded.
>
> **Core Implementation:**
> ```typescript
> const breaker = yield* createCircuitBreaker(effect, threshold, resetAfter);
> const result = yield* breaker.call;  // Fails fast when circuit is open
> ```
>
> **Key Components:**
> - State tracking with `Ref` (failures count, circuit status, last failure time)
> - Auto-reset after timeout period
> - Fail-fast when circuit open (avoids overwhelming failing service)
>
> **Full Implementation:** See provider template `service.template.ts:420-476`
>
> **Use for:** Microservices architectures, high-throughput systems, protecting against cascading failures.

---

#### Resilience Strategy Comparison

| Strategy | Protects Against | Overhead | Best For |
|----------|------------------|----------|----------|
| Timeout only | Hanging requests | Low | Internal services, simple APIs |
| Timeout + Retry | Transient failures | Medium | External APIs with retryable errors |
| Timeout + Retry + Cache | Service unavailability | Medium | Read operations, eventual consistency OK |
| Circuit Breaker | Cascading failures | Low (when open) | Microservices, distributed systems |
| Combined (all above) | Complete resilience | High | Critical external dependencies |

### Exit-Aware Finalizers

Conditional cleanup based on operation outcome using `Scope.addFinalizer` + `Exit.match`.

#### Database Transaction Pattern

```typescript
import { Effect, Exit, Scope } from "effect";

const withTransaction = <A, E>(
  operation: (conn: Connection) => Effect.Effect<A, E>
) =>
  Effect.acquireRelease(
    Effect.gen(function* () {
      const connection = yield* Effect.tryPromise({
        try: () => pool.connect(),
        catch: (error) => new DatabaseConnectionError({ cause: error })
      });
      yield* Effect.sync(() => connection.beginTransaction());

      // Exit-aware finalizer: commit or rollback based on outcome
      yield* Scope.addFinalizer((exit) =>
        Exit.match(exit, {
          onFailure: () =>
            Effect.gen(function* () {
              yield* Effect.tryPromise(() => connection.rollback()).pipe(
                Effect.catchAll(() => Effect.void)
              );
              yield* Effect.sync(() => connection.release());
            }),
          onSuccess: () =>
            Effect.gen(function* () {
              yield* Effect.tryPromise(() => connection.commit()).pipe(
                Effect.tapError(() =>
                  Effect.tryPromise(() => connection.rollback()).pipe(
                    Effect.catchAll(() => Effect.void)
                  )
                )
              );
              yield* Effect.sync(() => connection.release());
            })
        })
      );
      return connection;
    }),
    (connection) =>
      Effect.sync(() => connection.isConnected && connection.release()).pipe(
        Effect.catchAll(() => Effect.void)
      )
  ).pipe(Effect.flatMap(operation));
```

**Full implementation with error handling:** See infrastructure template `interface.template.ts:232-291`

---

#### Exit-Aware Cleanup Patterns

| Resource Type | Success Action | Failure Action | Pattern |
|---------------|----------------|----------------|---------|
| Database Transaction | `commit()` | `rollback()` | See example above |
| Message Queue | `ack()` | `nack()` | `Exit.isSuccess(exit) ? ack : nack` |
| Distributed Lock | `release({ status: 'completed' })` | `release({ status: 'failed' })` | Pass metadata to release |
| File Upload | `persist()` | `cleanup()` | Move vs delete temp file |
| Two-Phase Commit | `prepare() → commit()` | `abort()` | Coordinator pattern |

---

#### When to Use

| Use Case | Pattern | Rationale |
|----------|---------|-----------|
| Database transactions | Exit-aware finalizers | Need commit/rollback based on outcome |
| Message queues | Exit-aware finalizers | Need ack/nack based on processing result |
| Simple resource cleanup | `acquireRelease` | No conditional logic needed |
| Multiple independent resources | `Effect.all` + `acquireRelease` | Cleanup each independently |

### Data Validation with filterOrFail

Declarative validation that transforms data or fails with custom errors.

#### Object Validation with Chaining

```typescript
const processedData = yield* Effect.succeed(userData).pipe(
  // Validate structure
  Effect.filterOrFail(
    (user) => user.email.includes("@") && user.name.length > 0,
    (user) => new ValidationError({
      message: "Invalid user data",
      fields: {
        email: user.email.includes("@") ? null : "Email must contain @",
        name: user.name.length > 0 ? null : "Name cannot be empty"
      }
    })
  ),
  // Validate business rules
  Effect.filterOrFail(
    (user) => VALID_ROLES.includes(user.role),
    (user) => new ValidationError({ message: `Invalid role: ${user.role}` })
  ),
  // Process validated data
  Effect.flatMap((validUser) => repository.save(validUser))
);
```

#### Validation Pattern Variations

| Validation Type | Pattern | Example |
|-----------------|---------|---------|
| Single Value | `Effect.succeed(value).pipe(filterOrFail(...))` | Age range: `age >= 18 && age <= 120` |
| Object Props | `Effect.succeed(obj).pipe(filterOrFail(...))` | See example above |
| Chained Rules | Chain multiple `filterOrFail` operators | Structure check → business rules → save |
| Option→Value | `filterOrFail(Option.isSome, ...).pipe(map(v => v.value))` | Convert `Option<User>` to `User` or fail |
| Array Content | `filterOrFail(arr => arr.every(...))` | Validate all items meet criteria |

**Use for:** Input validation, business rule enforcement, API validation, multi-step pipelines.

### Batch Error Collection with parallelErrors

Collect all errors from parallel operations for comprehensive reporting.

#### Form Validation Example

```typescript
const validateForm = (formData: FormData) =>
  Effect.all([
    Effect.succeed(formData.email).pipe(
      Effect.filterOrFail(
        (email) => email.includes("@"),
        () => new ValidationError({ field: "email", message: "Invalid email" })
      )
    ),
    Effect.succeed(formData.age).pipe(
      Effect.filterOrFail(
        (age) => age >= 18,
        () => new ValidationError({ field: "age", message: "Must be 18+" })
      )
    )
  ]).pipe(
    Effect.parallelErrors,
    Effect.catchAll((errors) =>
      Effect.fail(new FormValidationError({
        message: "Form validation failed",
        fields: errors.map((e) => ({ field: e.field, error: e.message }))
      }))
    )
  );
```

---

#### Error Collection Strategies

| Strategy | Pattern | Use Case | Example |
|----------|---------|----------|---------|
| **Fail on All Errors** | `parallelErrors + catchAll(fail)` | Form validation | See example above |
| **Partial Success** | `parallelErrors + catchAll(succeed([]))` | Optional data fetching | Load products, return empty on failure |
| **Log & Fail** | `parallelErrors + catchAll(log + fail)` | Batch processing | Log all failures, then fail with summary |
| **Collect & Continue** | `parallelErrors + catchAll(succeed(errors))` | Diagnostics | Return error list for analysis |

---

#### Default vs parallelErrors Comparison

| Aspect | Default | parallelErrors |
|--------|---------|----------------|
| Failure Mode | Fail fast (first error) | Collect all errors |
| Error Type | Single error | Array of errors |
| Best For | Stop on first problem | Show all errors (better UX) |

**Use for:** Form validation, batch operations, multi-item validation. **Avoid:** When you need fail-fast behavior.

### Dual-Channel Transformation with mapBoth

Transform both success and error channels simultaneously in a single operation.

#### API Normalization Example

```typescript
const normalizedResult = yield* externalAPI.fetchUser(userId).pipe(
  Effect.mapBoth({
    onSuccess: (apiUser) => ({
      // Transform to domain model
      id: apiUser.user_id,
      name: apiUser.full_name,
      email: apiUser.email_address,
      createdAt: new Date(apiUser.created_at),
      // Add metadata
      source: "external_api",
      timestamp: Date.now()
    }),
    onFailure: (apiError) =>
      // Transform to domain error
      new DomainError({
        message: "Failed to fetch user",
        cause: apiError,
        statusCode: apiError.status_code,
        // Add observability
        timestamp: Date.now(),
        retryable: apiError.status_code >= 500
      })
  })
);
```

---

#### Common Use Cases

| Use Case | onSuccess Transforms | onFailure Transforms | Example |
|----------|---------------------|----------------------|---------|
| **API Normalization** | External→Domain model | SDK error→Domain error | See above |
| **API Response Format** | `{ status: 'success', data }` | `{ status: 'error', error }` | REST API responses |
| **Add Metadata** | `+ timestamp, source, cached` | `+ timestamp, retryable` | Observability |
| **Correlation Tracking** | `+ correlationId, duration` | `+ correlationId, duration` | Distributed tracing |

---

#### mapBoth vs Separate Operators

```typescript
// Using mapBoth (preferred when transforming both channels)
const result = yield* operation.pipe(
  Effect.mapBoth({ onSuccess: transform, onFailure: transformError })
);

// Using separate operators (use when only one channel needs transformation)
const result = yield* operation.pipe(
  Effect.map(transform),           // Only success
  Effect.mapError(transformError)  // Only error
);
```

**Use `mapBoth` when:** Both channels need transformation. **Use `map`/`mapError` when:** Only one channel needs transformation.

### Pattern Decision Tree

```
Error Handling:
├─ Observe only → tapErrorTag
├─ Transform → mapError / mapBoth
├─ Handle specific → catchTag
├─ Validate → filterOrFail
└─ Collect all → parallelErrors

Resources:
├─ Simple cleanup → acquireRelease
└─ Conditional (transactions) → Scope.addFinalizer + Exit.match

Resilience:
├─ Retry → Effect.retry + Schedule
├─ Timeout → Effect.timeout + fallback
└─ Circuit breaker → See provider template
```

## Effect.gen vs Combinators

### Use Effect.gen for:

- Multiple sequential operations
- Complex control flow
- Readable step-by-step logic

```typescript
// ✅ Good use of Effect.gen
const processOrder = (orderId: string) =>
  Effect.gen(function* () {
    const order = yield* getOrder(orderId);
    const user = yield* getUser(order.userId);

    if (!user.verified) {
      return yield* Effect.fail(new UnverifiedUserError());
    }

    const payment = yield* processPayment(order.total);
    yield* sendConfirmation(user.email, payment.id);

    return payment;
  });
```

### Use Combinators for:

- Simple transformations
- Parallel operations
- Concise pipelines

```typescript
// ✅ Good use of combinators
const getUserWithPermissions = (id: string) =>
  Effect.all([getUser(id), getPermissions(id)]).pipe(
    Effect.map(([user, permissions]) => ({
      ...user,
      permissions,
    })),
  );

// ✅ Error handling with combinators
const safeGetUser = (id: string) =>
  getUser(id).pipe(
    Effect.catchTag('UserNotFound', () => Effect.succeed(defaultUser)),
  );
```

## Schema Patterns (Advanced Validation & Documentation)

Effect Schema provides powerful runtime validation with TypeScript type inference. Beyond basic types, Schema offers filters, transformations, annotations, and projections for production-grade APIs.

### Schema.annotations() - OpenAPI & Documentation

Add metadata to schemas for auto-generated documentation, API specs, and better error messages.

```typescript
import { Schema } from "effect";

// ✅ Field-level annotations
export const Email = Schema.String.pipe(
  Schema.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/),
  Schema.annotations({
    title: "Email Address",
    description: "Valid email address for user communication",
    examples: ["user@example.com", "admin@company.org"],
    jsonSchema: {
      format: "email",
      minLength: 5,
      maxLength: 255
    }
  })
);

// ✅ Class-level annotations for entities
export class User extends Schema.Class<User>("User")({
  id: Schema.UUID.annotations({
    title: "User ID",
    description: "Unique identifier",
    examples: ["550e8400-e29b-41d4-a716-446655440000"]
  }),

  email: Email,

  age: Schema.Number.pipe(
    Schema.int(),
    Schema.greaterThanOrEqualTo(0),
    Schema.lessThanOrEqualTo(150)
  ).annotations({
    title: "Age",
    description: "User age in years",
    examples: [25, 42],
    jsonSchema: { minimum: 0, maximum: 150 }
  }),
}).pipe(
  Schema.annotations({
    identifier: "User",
    title: "User Entity",
    description: "Core user domain entity with validation and type safety",
    jsonSchema: {
      required: ["id", "email", "age"]
    }
  })
) {}

// ✅ Generate OpenAPI schemas from annotations
const openApiSchema = Schema.make(User); // Includes all annotations
```

**Use Cases:**
- Auto-generate OpenAPI/Swagger documentation
- Client SDK generation with metadata
- Form field labels and help text
- Better validation error messages
- API documentation tooling

---

### Schema.filter() - Custom Validation Logic

Add custom validation predicates beyond built-in validators for business rules.

```typescript
import { Schema } from "effect";

// ✅ Single field filter
export const PositiveEven = Schema.Number.pipe(
  Schema.filter((n) =>
    n > 0 && n % 2 === 0 || "Must be a positive even number"
  )
);

// ✅ Cross-field validation
export class DateRange extends Schema.Class<DateRange>("DateRange")({
  startDate: Schema.DateTimeUtc,
  endDate: Schema.DateTimeUtc,
}).pipe(
  Schema.filter((range) => {
    if (range.endDate <= range.startDate) {
      return {
        path: ["endDate"],
        message: "End date must be after start date"
      };
    }
    return true;
  })
) {}

// ✅ Multiple validation errors
export class PasswordInput extends Schema.Class<PasswordInput>("PasswordInput")({
  password: Schema.String,
  confirmPassword: Schema.String,
}).pipe(
  Schema.filter((input) => {
    const errors: Array<{ path: string[]; message: string }> = [];

    if (input.password.length < 8) {
      errors.push({
        path: ["password"],
        message: "Password must be at least 8 characters"
      });
    }

    if (input.password !== input.confirmPassword) {
      errors.push({
        path: ["confirmPassword"],
        message: "Passwords must match"
      });
    }

    return errors.length === 0 || errors;
  })
) {}

// ✅ Async validation with filterEffect
export const UniqueEmail = Schema.String.pipe(
  Schema.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/),
  Schema.filterEffect((email) =>
    Effect.gen(function* () {
      const userRepo = yield* UserRepository;
      const exists = yield* userRepo.existsByEmail(email);

      if (exists) {
        return yield* Effect.fail({
          path: ["email"],
          message: "Email already registered"
        });
      }

      return true;
    })
  )
);

// Usage in forms
const validateUserInput = (input: unknown) =>
  Schema.decodeUnknown(PasswordInput)(input).pipe(
    Effect.map((validated) => ({
      success: true,
      data: validated
    })),
    Effect.catchAll((error) => Effect.succeed({
      success: false,
      errors: error.message // Array of { path, message }
    }))
  );
```

**Use Cases:**
- Cross-field validation (date ranges, password matching)
- Database uniqueness checks (async validation)
- Business rule enforcement
- Form validation with multiple errors
- Domain invariants

---

### Schema.transform() - Data Normalization

Bi-directional transformations between encoded (API) and decoded (domain) formats.

```typescript
import { Schema } from "effect";

// ✅ String normalization
export const NormalizedEmail = Schema.String.pipe(
  Schema.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/),
  Schema.transform(
    Schema.String,
    {
      decode: (email) => email.toLowerCase().trim(),
      encode: (email) => email // Already normalized
    }
  )
);

// ✅ Type transformation (string → number)
export const PriceInCents = Schema.String.pipe(
  Schema.pattern(/^\d+\.\d{2}$/), // "19.99" format
  Schema.transform(
    Schema.Number,
    {
      decode: (str) => Math.round(parseFloat(str) * 100), // → 1999 cents
      encode: (cents) => (cents / 100).toFixed(2) // → "19.99"
    }
  )
);

// ✅ Async transformation with transformOrFail
export const ValidatedUserId = Schema.String.pipe(
  Schema.transformOrFail(
    Schema.String,
    {
      decode: (id) =>
        Effect.gen(function* () {
          const userApi = yield* UserAPI;
          const exists = yield* userApi.checkExists(id);

          if (!exists) {
            return yield* Effect.fail(
              new ParseResult.Type(
                Schema.String.ast,
                id,
                "User not found"
              )
            );
          }

          return id;
        }),
      encode: (id) => Effect.succeed(id)
    }
  )
);

// ✅ Object transformation for API compatibility
export const UserDto = Schema.Struct({
  id: Schema.UUID,
  email_address: NormalizedEmail,  // snake_case for API
  created_at: Schema.DateTimeUtc,
}).pipe(
  Schema.transform(
    Schema.Struct({
      id: Schema.UUID,
      email: Schema.String,       // camelCase for domain
      createdAt: Schema.Date,
    }),
    {
      decode: (dto) => ({
        id: dto.id,
        email: dto.email_address,
        createdAt: new Date(dto.created_at)
      }),
      encode: (domain) => ({
        id: domain.id,
        email_address: domain.email,
        created_at: domain.createdAt.toISOString()
      })
    }
  )
);
```

**Use Cases:**
- Email/string normalization (lowercase, trim)
- API ↔ Domain model transformations
- Unit conversions (dollars ↔ cents)
- Date format conversions
- Async API validation during parsing

---

### Schema Projections - Type Extraction

Extract Type (domain) or Encoded (API) portions from schemas with transformations.

```typescript
import { Schema } from "effect";

// Define full schema with transformation
const UserSchema = Schema.Struct({
  id: Schema.UUID,
  email: NormalizedEmail,      // Has transform
  created_at: Schema.DateTimeUtc,
}).pipe(
  Schema.transform(
    Schema.Struct({
      id: Schema.UUID,
      email: Schema.String,
      createdAt: Schema.Date,
    }),
    {
      decode: (encoded) => ({
        id: encoded.id,
        email: encoded.email,
        createdAt: new Date(encoded.created_at)
      }),
      encode: (decoded) => ({
        id: decoded.id,
        email: decoded.email,
        created_at: decoded.createdAt.toISOString()
      })
    }
  )
);

// ✅ Extract API format (pre-transformation)
const UserApiSchema = Schema.encodedSchema(UserSchema);
type UserApi = Schema.Schema.Type<typeof UserApiSchema>;
// { id: string; email: string; created_at: string }

// ✅ Extract Domain format (post-transformation)
const UserDomainSchema = Schema.typeSchema(UserSchema);
type UserDomain = Schema.Schema.Type<typeof UserDomainSchema>;
// { id: string; email: string; createdAt: Date }

// ✅ Use in different layers
// Contract layer: Full UserSchema (with transformations)
export { UserSchema };

// Feature RPC layer: API format only (no transformations)
export const UserResponse = Schema.encodedSchema(UserSchema);

// Data-access layer: Domain format
export const UserEntity = Schema.typeSchema(UserSchema);

// ✅ encodedBoundSchema - Preserve filters before transformation
const FilteredEmail = Schema.String.pipe(
  Schema.filter((s) => s.includes("@") || "Invalid email")
);

const TransformedEmail = FilteredEmail.pipe(
  Schema.transform(
    Schema.String,
    {
      decode: (s) => s.toLowerCase(),
      encode: (s) => s
    }
  )
);

// Get Encoded + filters (without transform)
const EncodedWithFilters = Schema.encodedBoundSchema(TransformedEmail);
// Includes email filter, but NOT the lowercase transform
```

**Use Cases:**
- Separate API DTOs from domain models
- Generate request/response types from shared schemas
- Type-safe API client generation
- Avoid redundant schema definitions
- Layer-specific type extraction

---

### Schema.pretty() - Custom Error Formatting

Improve error messages for debugging and user-facing validation.

```typescript
import { Schema, Pretty } from "effect";

// ✅ Custom pretty formatter
export const ProductSchema = Schema.Struct({
  id: Schema.UUID,
  name: Schema.String,
  price: Schema.Number,
}).pipe(
  Schema.annotations({
    pretty: () => (product) =>
      `Product(id="${product.id}", name="${product.name}", price=$${product.price.toFixed(2)})`
  })
);

// Usage
const formatter = Pretty.make(ProductSchema);
console.log(formatter({
  id: "123e4567-e89b-12d3-a456-426614174000",
  name: "Widget",
  price: 19.99
}));
// Output: Product(id="123e4567-e89b-12d3-a456-426614174000", name="Widget", price=$19.99)

// ✅ Error message customization
export const Age = Schema.Number.pipe(
  Schema.int(),
  Schema.greaterThanOrEqualTo(0),
  Schema.lessThanOrEqualTo(150),
  Schema.annotations({
    message: () => "Age must be an integer between 0 and 150"
  })
);

// Invalid age shows custom message instead of generic error
Schema.decodeUnknownSync(Age)(-5);
// Error: Age must be an integer between 0 and 150
```

**Use Cases:**
- User-friendly error messages
- Better debugging output
- Custom validation feedback
- Development tooling

---

### Advanced Schema Composition

Combine schemas with extend, partial, pick, and omit for reusability.

```typescript
import { Schema } from "effect";

// ✅ Base entity pattern
export const BaseEntity = Schema.Struct({
  id: Schema.UUID,
  createdAt: Schema.DateTimeUtc,
  updatedAt: Schema.DateTimeUtc,
});

// ✅ Extend base entity
export const Product = Schema.Struct({
  name: Schema.String,
  price: Schema.Number,
  sku: Schema.String,
}).pipe(
  Schema.extend(BaseEntity)
);
// Result: { id, createdAt, updatedAt, name, price, sku }

// ✅ Partial for updates
export const UpdateProduct = Schema.partial(
  Schema.pick(Product, "name", "price", "sku")
);
// Result: { name?, price?, sku? }

// ✅ Omit for creation
export const CreateProduct = Schema.omit(Product, "id", "createdAt", "updatedAt");
// Result: { name, price, sku }

// ✅ Pick for specific fields
export const ProductSummary = Schema.pick(Product, "id", "name", "price");
// Result: { id, name, price }

// ✅ Required - make all fields required
export const RequiredProduct = Schema.required(UpdateProduct);
// Result: { name, price, sku } (all required)

// ✅ Branded types for nominal typing
export const UserId = Schema.String.pipe(Schema.brand("UserId"));
export const ProductId = Schema.String.pipe(Schema.brand("ProductId"));

// Type-safe - cannot mix UserIds and ProductIds
const processUser = (id: Schema.Schema.Type<typeof UserId>) => {
  // id is branded as UserId
};

const productId: Schema.Schema.Type<typeof ProductId> = "123" as any;
processUser(productId); // ❌ Type error: ProductId is not assignable to UserId
```

**Use Cases:**
- Reduce schema duplication with base entities
- Create update/create variants from entities
- Type-safe nominal IDs (UserId vs ProductId)
- Domain-driven design patterns
- Bulk operations on optional fields

---

## Streaming & Queuing Patterns

Effect's **Stream** provides constant-memory data processing for large or unbounded datasets. Unlike arrays that load everything into memory, streams process elements one (or in chunks) at a time with built-in backpressure control.

**When to use Stream:**
- Processing 10,000+ database rows
- Infinite data sources (websockets, event streams, log tailing)
- CSV/JSON file exports with millions of rows
- Real-time event processing with backpressure
- Memory-constrained environments

**When NOT to use Stream:**
- Small datasets (<1000 items) - use Array
- One-time data transformations - use Effect.map
- Simple list operations - use ReadonlyArray methods

### Decision Matrix: Stream vs Array vs Queue

| Feature | Array | Stream | Queue |
|---------|-------|--------|-------|
| **Memory** | Load all | Constant (chunked) | Bounded buffer |
| **Data Size** | <1000 items | 1000+ items or unbounded | Unbounded (async) |
| **Backpressure** | No | Yes (built-in) | Yes (bounded) |
| **Performance** | Fast for small | Optimized for large | Async coordination |
| **Use Case** | In-memory lists | File I/O, DB exports | Producer/consumer |
| **Error Handling** | Throws | Effect-based | Effect-based |

---

### Stream Pattern 1: Basic Stream Creation & Consumption

**Creating Streams:**

```typescript
import { Stream, Effect } from "effect";

// From iterable
const numbersStream = Stream.fromIterable([1, 2, 3, 4, 5]);

// From range
const rangeStream = Stream.range(1, 100); // 1 to 100

// From single value
const singleStream = Stream.succeed(42);

// Empty stream
const emptyStream = Stream.empty;

// From Effect
const effectStream = Stream.fromEffect(
  Effect.gen(function* () {
    const data = yield* fetchData();
    return data;
  })
);

// Infinite stream
const infiniteStream = Stream.iterate(0, (n) => n + 1); // 0, 1, 2, 3, ...
```

**Consuming Streams:**

```typescript
// Collect all elements (use with caution on large streams)
const allItems = yield* Stream.runCollect(numbersStream);
// Returns: Chunk.Chunk<number>

// Run forEach (side effects)
yield* Stream.runForEach(numbersStream, (n) =>
  Effect.log(`Processing: ${n}`)
);

// Run to sink
const sum = yield* Stream.run(
  numbersStream,
  Sink.foldLeft(0, (acc, n: number) => acc + n)
);

// Take first N
const firstFive = yield* Stream.run(numbersStream, Sink.take(5));
```

**Real-World Example: Processing Paginated API Results**

```typescript
import { Stream, Effect } from "effect";

interface PaginatedResponse<T> {
  items: T[];
  nextCursor: string | null;
}

// Create stream from paginated API
const paginatedStream = <T>(
  fetchPage: (cursor: string | null) => Effect.Effect<PaginatedResponse<T>, Error>
): Stream.Stream<T, Error> =>
  Stream.unfoldEffect(null as string | null, (cursor) =>
    Effect.gen(function* () {
      const response = yield* fetchPage(cursor);

      if (response.items.length === 0) {
        return Option.none(); // End stream
      }

      return Option.some([
        response.items, // Current chunk
        response.nextCursor // Next state
      ] as const);
    })
  ).pipe(
    Stream.flatMap(Stream.fromIterable) // Flatten chunks
  );

// Usage
const allUsers = paginatedStream((cursor) =>
  Effect.tryPromise({
    try: () => api.users.list({ cursor, limit: 100 }),
    catch: (error) => new Error(`Failed to fetch users: ${error}`)
  })
);

// Process stream
yield* Stream.runForEach(allUsers, (user) =>
  Effect.log("Processing user", user.id)
);
```

---

### Stream Pattern 2: Stream Transformations

```typescript
import { Stream, Effect } from "effect";

const numbers = Stream.range(1, 10);

// map - Transform elements
const doubled = numbers.pipe(
  Stream.map((n) => n * 2)
);

// filter - Keep only matching elements
const evens = numbers.pipe(
  Stream.filter((n) => n % 2 === 0)
);

// flatMap - Transform to streams and flatten
const expanded = numbers.pipe(
  Stream.flatMap((n) => Stream.range(1, n))
);

// take - Limit elements
const firstThree = numbers.pipe(
  Stream.take(3)
);

// drop - Skip elements
const skipFirstTwo = numbers.pipe(
  Stream.drop(2)
);

// rechunk - Change chunk size (important for performance)
const largeChunks = numbers.pipe(
  Stream.rechunk(100) // Process in batches of 100
);

// mapEffect - Async transformations
const fetchedData = Stream.fromIterable(["id1", "id2", "id3"]).pipe(
  Stream.mapEffect((id) =>
    Effect.tryPromise({
      try: () => fetch(`/api/users/${id}`).then(r => r.json()),
      catch: (error) => new Error(`Fetch failed: ${error}`)
    })
  )
);
```

**Real-World Example: Data Processing Pipeline**

```typescript
import { Stream, Effect } from "effect";

interface RawData {
  id: string;
  value: string;
}

interface ProcessedData {
  id: string;
  value: number;
  timestamp: Date;
}

const processDataPipeline = (inputStream: Stream.Stream<RawData, Error>) =>
  inputStream.pipe(
    // Filter out invalid data
    Stream.filter((data) => data.value !== ""),

    // Transform with Effect (async validation)
    Stream.mapEffect((data) =>
      Effect.gen(function* () {
        const validated = yield* validateData(data);
        return validated;
      })
    ),

    // Map to processed format
    Stream.map((data): ProcessedData => ({
      id: data.id,
      value: parseInt(data.value, 10),
      timestamp: new Date()
    })),

    // Process in chunks for efficiency
    Stream.rechunk(50)
  );

// Usage
const rawStream = Stream.fromIterable(rawData);
const processedStream = processDataPipeline(rawStream);

yield* Stream.runForEach(processedStream, (item) =>
  Effect.log("Processed", item)
);
```

---

### Stream Pattern 3: Resourceful Streams (Critical for Safety)

**Stream.acquireRelease** ensures resources are properly cleaned up even if stream processing fails or is interrupted.

```typescript
import { Stream, Effect } from "effect";

// Database connection stream with auto-cleanup
const queryStream = <T>(query: string): Stream.Stream<T, Error> =>
  Stream.acquireRelease(
    // Acquire: Open database connection
    Effect.gen(function* () {
      const connection = yield* database.connect();
      yield* Effect.log("Database connection opened");
      return connection;
    }),
    // Release: Close connection (called even on error/interruption)
    (connection) =>
      Effect.gen(function* () {
        yield* connection.close();
        yield* Effect.log("Database connection closed");
      })
  ).pipe(
    Stream.flatMap((connection) =>
      Stream.fromEffect(
        Effect.tryPromise({
          try: () => connection.query<T>(query),
          catch: (error) => new Error(`Query failed: ${error}`)
        })
      ).pipe(
        Stream.flatMap(Stream.fromIterable)
      )
    )
  );

// File stream with auto-close
const fileStream = (path: string): Stream.Stream<string, Error> =>
  Stream.acquireRelease(
    // Acquire: Open file handle
    Effect.tryPromise({
      try: () => fs.open(path, 'r'),
      catch: (error) => new Error(`Failed to open file: ${error}`)
    }),
    // Release: Close file handle
    (fileHandle) =>
      Effect.tryPromise({
        try: () => fileHandle.close(),
        catch: () => new Error("Failed to close file")
      })
  ).pipe(
    Stream.flatMap((handle) =>
      Stream.fromEffect(
        Effect.tryPromise({
          try: () => handle.readFile('utf-8'),
          catch: (error) => new Error(`Read failed: ${error}`)
        })
      ).pipe(
        Stream.flatMap((content) =>
          Stream.fromIterable(content.split('\n'))
        )
      )
    )
  );

// Usage - resource automatically cleaned up
yield* Stream.runForEach(
  queryStream<User>("SELECT * FROM users"),
  (user) => Effect.log("User:", user)
);
// Database connection automatically closed here
```

**Stream.ensuring** - Run cleanup after stream completes:

```typescript
const streamWithCleanup = Stream.range(1, 100).pipe(
  Stream.ensuring(
    Effect.log("Stream processing completed - running cleanup")
  )
);
```

**Stream.finalizer** - Add finalizer to current scope:

```typescript
const streamWithFinalizer = Stream.fromEffect(
  Effect.gen(function* () {
    yield* Stream.finalizer(
      Effect.log("Finalizer running")
    );
    return 42;
  })
);
```

---

### Stream Pattern 4: Concurrency & Backpressure Control

```typescript
import { Stream, Effect, Schedule } from "effect";

// mapEffect with concurrency control
const concurrentStream = Stream.fromIterable(urls).pipe(
  Stream.mapEffect(
    (url) =>
      Effect.tryPromise({
        try: () => fetch(url).then(r => r.json()),
        catch: (error) => new Error(`Fetch failed: ${error}`)
      }),
    { concurrency: 5 } // Process up to 5 URLs concurrently
  )
);

// Buffer for backpressure
const bufferedStream = dataStream.pipe(
  Stream.buffer({ capacity: 100 }) // Buffer up to 100 items
);

// Merge multiple streams
const merged = Stream.merge(stream1, stream2);

// Zip streams (combine elements)
const zipped = Stream.zip(numbersStream, lettersStream);

// Rate limiting with delays
const rateLimited = Stream.fromIterable(requests).pipe(
  Stream.mapEffect((req) =>
    Effect.gen(function* () {
      yield* Effect.sleep("100 millis"); // 100ms between requests
      return yield* processRequest(req);
    })
  )
);
```

**Real-World Example: Concurrent API Calls with Rate Limiting**

```typescript
import { Stream, Effect, Schedule } from "effect";

interface ProcessingResult {
  id: string;
  status: "success" | "failed";
  data?: unknown;
  error?: string;
}

const processItemsWithRateLimit = (
  items: readonly string[],
  processItem: (id: string) => Effect.Effect<unknown, Error>
): Stream.Stream<ProcessingResult, never> =>
  Stream.fromIterable(items).pipe(
    // Process 10 items concurrently
    Stream.mapEffect(
      (id) =>
        processItem(id).pipe(
          // Add retry with exponential backoff
          Effect.retry({
            schedule: Schedule.exponential("100 millis").pipe(
              Schedule.compose(Schedule.recurs(3))
            )
          }),
          // Convert to result (never fail)
          Effect.match({
            onFailure: (error): ProcessingResult => ({
              id,
              status: "failed",
              error: error.message
            }),
            onSuccess: (data): ProcessingResult => ({
              id,
              status: "success",
              data
            })
          })
        ),
      { concurrency: 10 }
    ),
    // Add 50ms delay between batches for rate limiting
    Stream.rechunk(10),
    Stream.mapChunks((chunk) =>
      Chunk.map(chunk, (item) => {
        // Delay only applied between chunks
        return item;
      })
    ),
    Stream.mapEffect((result) =>
      Effect.sleep("50 millis").pipe(Effect.as(result))
    ),
    // Buffer results
    Stream.buffer({ capacity: 50 })
  );

// Usage
const results = processItemsWithRateLimit(
  itemIds,
  (id) =>
    Effect.tryPromise({
      try: () => api.processItem(id),
      catch: (error) => new Error(`Processing failed: ${error}`)
    })
);

yield* Stream.runForEach(results, (result) =>
  result.status === "success"
    ? Effect.log("Success:", result.id)
    : Effect.log("Failed:", result.id, result.error)
);
```

---

### Stream Pattern 5: Error Handling in Streams

```typescript
import { Stream, Effect } from "effect";

// catchAll - Handle all errors
const safeStream = dangerousStream.pipe(
  Stream.catchAll((error) =>
    Stream.fromEffect(Effect.log("Error occurred:", error)).pipe(
      Stream.flatMap(() => Stream.empty)
    )
  )
);

// catchSome - Handle specific errors
const partiallyHandled = dataStream.pipe(
  Stream.catchSome((error) =>
    error.message.includes("NotFound")
      ? Option.some(Stream.empty)
      : Option.none()
  )
);

// retry - Retry failed stream elements
const retriedStream = Stream.fromEffect(unstableEffect).pipe(
  Stream.retry({
    schedule: Schedule.exponential("100 millis")
  })
);

// Graceful degradation - continue on error
const resilientStream = Stream.fromIterable(items).pipe(
  Stream.mapEffect((item) =>
    processItem(item).pipe(
      Effect.catchAll((error) =>
        Effect.gen(function* () {
          yield* Effect.log("Processing failed, using default", error);
          return defaultValue;
        })
      )
    )
  )
);
```

**Real-World Example: Resilient Stream Processing**

```typescript
import { Stream, Effect, Schedule } from "effect";

const processStreamWithErrorHandling = <T, E, R>(
  stream: Stream.Stream<T, E, R>,
  processor: (item: T) => Effect.Effect<void, Error>
): Effect.Effect<{ processed: number; failed: number }, never, R> =>
  Effect.gen(function* () {
    let processed = 0;
    let failed = 0;

    yield* stream.pipe(
      // Retry individual items
      Stream.mapEffect((item) =>
        processor(item).pipe(
          Effect.retry({
            schedule: Schedule.exponential("100 millis").pipe(
              Schedule.compose(Schedule.recurs(2))
            )
          }),
          Effect.match({
            onFailure: (error) => {
              failed++;
              return Effect.log("Item processing failed:", error);
            },
            onSuccess: () => {
              processed++;
              return Effect.void;
            }
          }),
          Effect.flatten
        )
      ),
      // Continue on error (never fail the stream)
      Stream.catchAll((error) =>
        Stream.fromEffect(Effect.log("Stream error:", error)).pipe(
          Stream.flatMap(() => Stream.empty)
        )
      ),
      Stream.runDrain
    );

    return { processed, failed };
  });
```

---

## Sink Patterns

**Sink** is the counterpart to Stream - it consumes elements from a stream and produces a single result.

### Sink Pattern 1: Basic Sink Usage

```typescript
import { Stream, Sink, Chunk } from "effect";

const numbers = Stream.range(1, 100);

// collectAll - Collect into Chunk
const allNumbers = yield* Stream.run(numbers, Sink.collectAll());
// Returns: Chunk.Chunk<number>

// take - Take first N elements
const firstTen = yield* Stream.run(numbers, Sink.take(10));

// drain - Run stream for side effects, discard results
yield* Stream.run(
  numbers.pipe(Stream.mapEffect((n) => Effect.log(n))),
  Sink.drain
);

// head - Take first element
const first = yield* Stream.run(numbers, Sink.head());
// Returns: Option.Option<number>

// last - Take last element
const last = yield* Stream.run(numbers, Sink.last());
```

---

### Sink Pattern 2: Custom Sinks for Aggregation

```typescript
import { Sink, Stream, Effect } from "effect";

// foldLeft - Accumulate with function
const sum = yield* Stream.run(
  Stream.range(1, 100),
  Sink.foldLeft(0, (acc, n: number) => acc + n)
);

// Custom sink for average
const average = <N extends number>(
  stream: Stream.Stream<N, Error>
): Effect.Effect<number, Error> =>
  Stream.run(
    stream,
    Sink.foldLeft(
      { sum: 0, count: 0 },
      (acc, n: number) => ({
        sum: acc.sum + n,
        count: acc.count + 1
      })
    )
  ).pipe(
    Effect.map((result) =>
      result.count === 0 ? 0 : result.sum / result.count
    )
  );

// Usage
const avg = yield* average(Stream.fromIterable([1, 2, 3, 4, 5]));
// Returns: 3

// forEach - Side effects for each element
yield* Stream.run(
  numbers,
  Sink.forEach((n) => Effect.log("Processing:", n))
);
```

**Real-World Example: Computing Statistics**

```typescript
import { Sink, Stream, Effect } from "effect";

interface Stats {
  count: number;
  sum: number;
  min: number;
  max: number;
  avg: number;
}

const computeStats = (
  stream: Stream.Stream<number, Error>
): Effect.Effect<Stats, Error> =>
  Stream.run(
    stream,
    Sink.foldLeft(
      { count: 0, sum: 0, min: Infinity, max: -Infinity },
      (acc, n: number) => ({
        count: acc.count + 1,
        sum: acc.sum + n,
        min: Math.min(acc.min, n),
        max: Math.max(acc.max, n)
      })
    )
  ).pipe(
    Effect.map((result) => ({
      ...result,
      avg: result.count === 0 ? 0 : result.sum / result.count
    }))
  );

// Usage
const stats = yield* computeStats(Stream.range(1, 1000));
// Returns: { count: 1000, sum: 500500, min: 1, max: 1000, avg: 500.5 }
```

---

### Sink Pattern 3: File I/O with Streams + Sinks

**CSV Export Example:**

```typescript
import { Stream, Sink, Effect } from "effect";
import * as fs from "fs";

interface User {
  id: string;
  name: string;
  email: string;
}

const exportUsersToCSV = (
  users: Stream.Stream<User, Error>,
  filePath: string
): Effect.Effect<void, Error> =>
  Effect.gen(function* () {
    // Create write stream
    const writeStream = yield* Effect.tryPromise({
      try: () => Promise.resolve(fs.createWriteStream(filePath)),
      catch: (error) => new Error(`Failed to create file: ${error}`)
    });

    // Add CSV header
    writeStream.write("id,name,email\n");

    // Process stream and write to file
    yield* users.pipe(
      // Convert to CSV rows
      Stream.map(
        (user) => `${user.id},${user.name},${user.email}\n`
      ),
      // Write each row
      Stream.mapEffect((row) =>
        Effect.tryPromise({
          try: () =>
            new Promise<void>((resolve, reject) => {
              if (!writeStream.write(row)) {
                writeStream.once("drain", () => resolve());
              } else {
                resolve();
              }
            }),
          catch: (error) => new Error(`Write failed: ${error}`)
        })
      ),
      Stream.runDrain
    );

    // Close stream
    yield* Effect.tryPromise({
      try: () =>
        new Promise<void>((resolve) => {
          writeStream.end(() => resolve());
        }),
      catch: () => new Error("Failed to close file")
    });
  });

// Usage
const userStream = Stream.fromIterable(users);
yield* exportUsersToCSV(userStream, "users.csv");
```

---

## Stream + Sink Integration: Complete Pipeline Example

**End-to-End: Database → Stream → Transform → Aggregate → Export**

```typescript
import { Stream, Sink, Effect } from "effect";

// Full data processing pipeline
const dataProcessingPipeline = Effect.gen(function* () {
  const database = yield* DatabaseService;
  const logger = yield* LoggingService;

  yield* logger.info("Starting data export pipeline");

  // Step 1: Stream from database
  const rawDataStream = Stream.acquireRelease(
    Effect.gen(function* () {
      const connection = yield* database.connect();
      return connection;
    }),
    (connection) => connection.close()
  ).pipe(
    Stream.flatMap((connection) =>
      Stream.fromEffect(
        Effect.tryPromise({
          try: () => connection.query("SELECT * FROM sales WHERE year = 2024"),
          catch: (error) => new Error(`Query failed: ${error}`)
        })
      ).pipe(Stream.flatMap(Stream.fromIterable))
    )
  );

  // Step 2: Transform data
  const transformedStream = rawDataStream.pipe(
    // Filter invalid records
    Stream.filter((record) => record.amount > 0),

    // Enrich with async data
    Stream.mapEffect(
      (record) =>
        Effect.gen(function* () {
          const customer = yield* fetchCustomer(record.customerId);
          return { ...record, customerName: customer.name };
        }),
      { concurrency: 10 }
    ),

    // Process in chunks
    Stream.rechunk(100)
  );

  // Step 3: Compute aggregates (using Sink)
  const stats = yield* Stream.run(
    transformedStream,
    Sink.foldLeft(
      { totalSales: 0, count: 0, avgSale: 0 },
      (acc, record) => ({
        totalSales: acc.totalSales + record.amount,
        count: acc.count + 1,
        avgSale: 0 // Computed after
      })
    )
  ).pipe(
    Effect.map((result) => ({
      ...result,
      avgSale: result.count > 0 ? result.totalSales / result.count : 0
    }))
  );

  yield* logger.info("Pipeline complete", stats);

  return stats;
});
```

---

## Performance Considerations

### Memory Usage: Stream vs Array

```typescript
// ❌ BAD: Loads all 1 million records into memory
const allUsers = yield* database.query("SELECT * FROM users");
const processed = allUsers.map(processUser);

// ✅ GOOD: Constant memory usage
const userStream = Stream.acquireRelease(
  database.connect(),
  (conn) => conn.close()
).pipe(
  Stream.flatMap((conn) =>
    Stream.fromEffect(
      Effect.tryPromise({
        try: () => conn.query("SELECT * FROM users"),
        catch: (error) => new Error(`Query failed: ${error}`)
      })
    ).pipe(Stream.flatMap(Stream.fromIterable))
  ),
  Stream.mapEffect((user) => processUser(user)),
  Stream.rechunk(100) // Process in batches
);

yield* Stream.runDrain(userStream);
// Only 100 users in memory at a time
```

### Chunk Size Optimization

```typescript
// Default chunk size (16)
const defaultStream = Stream.fromIterable(items);

// Optimized for bulk operations (larger chunks = fewer allocations)
const bulkStream = Stream.fromIterable(items).pipe(
  Stream.rechunk(1000) // Process 1000 items at a time
);

// Optimized for low latency (smaller chunks = faster response)
const realTimeStream = Stream.fromIterable(items).pipe(
  Stream.rechunk(1) // Process immediately
);
```

---

## When to Use Stream vs Array: Decision Guide

| Scenario | Use | Reason |
|----------|-----|--------|
| <1000 items | Array | Faster, simpler |
| 1000-10,000 items | Either | Depends on memory constraints |
| 10,000+ items | Stream | Constant memory |
| Unbounded data | Stream | Only option |
| Real-time events | Stream | Built for streaming |
| One-time processing | Array | Simpler |
| Multiple passes | Array | Stream consumed once |
| CSV/JSON export | Stream + Sink | Memory efficient |
| Pagination | Stream | Natural fit |
| File I/O | Stream | Built-in backpressure |

---

## Cross-References

**Related Patterns:**
- [Runtime Preservation in Streams](./INFRA.md#runtime-preservation-in-streams) - Infrastructure patterns
- [Streaming APIs](./PROVIDER.md#streaming-api-with-callbacks) - Provider patterns
- [Data-Access Streaming](./DATA-ACCESS.md) - Repository stream queries

**Effect Documentation:**
- [Stream Introduction](https://effect.website/docs/stream/introduction/)
- [Resourceful Streams](https://effect.website/docs/stream/resourceful-streams/)
- [Sink Introduction](https://effect.website/docs/sink/introduction/)

---

## Service Composition Patterns

### Layer Composition at Application Level

```typescript
// ✅ Compose layers at application level
const AppLayer = Layer.mergeAll(
  // Infrastructure
  DatabaseService.Live,
  LoggingService.Live,
  CacheService.Live,

  // Providers
  StripeService.Live,
  ResendService.Live,

  // Repositories (depend on infra)
  UserRepository.Live,
  ProductRepository.Live,

  // Features (depend on repos + providers)
  PaymentService.Live,
  EmailService.Live,
);

// Use in application
const program = Effect.gen(function* () {
  const payment = yield* PaymentService;
  return yield* payment.processPayment(100);
}).pipe(Effect.provide(AppLayer), Effect.runPromise);

// For testing - compose with test layers
const TestLayer = Layer.mergeAll(
  DatabaseService.Test,
  LoggingService.Test,
  CacheService.Test,
  StripeService.Test,
  ResendService.Test,
  UserRepository.Live, // Can use real repos with test DB
  ProductRepository.Live,
  PaymentService.Live,
  EmailService.Live,
);
```

### Service Composition Decision Matrix

**Question: Which services should I compose together?**

| Layer Type                        | Should Combine    | Examples                                             | Rationale                                              |
| --------------------------------- | ----------------- | ---------------------------------------------------- | ------------------------------------------------------ |
| **Infrastructure Services**       | ✅ YES            | DatabaseService + CacheService + LoggingService      | No dependencies between them                           |
| **Provider Services**             | ✅ YES            | StripeService + ResendService + SupabaseService      | External SDKs, independent                             |
| **Repository Services**           | ✅ YES            | UserRepository + ProductRepository + OrderRepository | Depend on infra, not each other                        |
| **Feature Services**              | ⚠️ MAYBE          | PaymentService + EmailService + NotificationService  | Often interdependent - may need sequential composition |
| **Infrastructure + Providers**    | ✅ YES            | Provide infra, then providers                        | Providers depend on infra                              |
| **Providers + Repositories**      | ✅ YES            | Provide providers, then repos                        | Repos depend on providers                              |
| **Repositories + Features**       | ✅ YES            | Provide repos, then features                         | Features depend on repos                               |
| **Infrastructure + Repositories** | ✅ YES (implicit) | Don't combine - infra used by repos                  | Repos depend on infra via dependencies                 |

### Service Composition Patterns by Use Case

#### Pattern 1: Application Layer (All Services)

```typescript
// ✅ Recommended: Compose all layers in order
const AppLayer = Layer.mergeAll(
  // 1. Infrastructure (no dependencies)
  DatabaseService.Live,
  CacheService.Live,
  LoggingService.Live,
  ConfigService.Live,

  // 2. Providers (depend on infra optionally)
  StripeService.Live,
  ResendService.Live,
  SupabaseService.Live,

  // 3. Repositories (depend on infra + providers)
  UserRepository.Live,
  ProductRepository.Live,
  OrderRepository.Live,

  // 4. Features (depend on repos + providers)
  PaymentService.Live,
  EmailService.Live,
  NotificationService.Live,
);
```

#### Pattern 2: Conditional Feature Composition

```typescript
// ✅ For interdependent features, compose selectively
const CoreLayer = Layer.mergeAll(
  DatabaseService.Live,
  CacheService.Live,
  UserRepository.Live,
  AuthService.Live, // Needed by payment service
);

// Payment service depends on AuthService
const PaymentLayer = CoreLayer.pipe(Layer.provide(PaymentService.Live));

// Notification depends on auth but not payment
const NotificationLayer = CoreLayer.pipe(
  Layer.provide(NotificationService.Live),
);
```

#### Pattern 3: Testing Layer Composition

```typescript
// ✅ Use test/mock layers for specific services
const TestLayer = Layer.mergeAll(
  // Real services for database operations
  DatabaseService.Test,
  UserRepository.Live,
  ProductRepository.Live,

  // Mocked services for external dependencies
  StripeService.Test,
  ResendService.Test,

  // Feature services use real repos with test data
  PaymentService.Live,
  EmailService.Live,
);
```

#### Pattern 4: Development Layer Composition

```typescript
// ✅ Use Dev layers with logging and delays for local development
const DevLayer = Layer.mergeAll(
  ConfigService.Dev, // Config from env
  DatabaseService.Dev, // Real DB with logging
  LoggingService.Dev, // Verbose logging
  StripeService.Test, // Mock Stripe in dev
  ResendService.Test, // Mock email in dev
  UserRepository.Live, // Real repos
  ProductRepository.Live,
  PaymentService.Live, // Real services with mocked SDKs
  EmailService.Live,
);
```

### When to Use Layer.provide vs Layer.mergeAll

| Scenario                         | Use                              | Why                                 |
| -------------------------------- | -------------------------------- | ----------------------------------- |
| Multiple independent services    | `Layer.mergeAll`                 | Simpler, all provided together      |
| Service A depends on B           | `Layer.mergeAll` first, then use | Order doesn't matter with mergeAll  |
| Sequential dependency resolution | `Layer.provide`                  | Force explicit ordering for clarity |
| Testing single service           | `Layer.provide`                  | Minimal layer for isolation         |
| Complex interdependencies        | Custom composition               | Use explicit Layer.provide chain    |

### Anti-Patterns: What NOT to Do

```typescript
// ❌ WRONG - Don't provide dependencies within a layer
export const PaymentServiceLive = Layer.effect(
  PaymentService,
  Effect.gen(function* () {
    const stripe = yield* StripeService
    // ...
  })
).pipe(
  Layer.provide(StripeService.Live)  // ❌ WRONG - app should provide this
)

// ✅ CORRECT - Let app compose dependencies
export const PaymentServiceLive = Layer.effect(
  PaymentService,
  Effect.gen(function* () {
    const stripe = yield* StripeService  // Needed by consumer to provide
    // ...
  })
)

// ❌ WRONG - Don't nest Effect.gen in layers
const AppLayer = Layer.effect(
  ???,
  Effect.gen(function* () {
    return Layer.mergeAll(...)  // ❌ Can't return Layer from Effect
  })
)

// ✅ CORRECT - Compose layers directly
const AppLayer = Layer.mergeAll(...)
```

## State Management with Effect Ref

**Effect Ref** provides thread-safe state for concurrent Effect programs. Use for state shared across fibers where race conditions must be prevented.

### Basic Ref Pattern (Pure Updates)

```typescript
import { Ref, Effect, Context, Layer } from 'effect';

// Create ref in service layer
export class CacheService extends Context.Tag('CacheService')<
  CacheService,
  {
    readonly increment: () => Effect.Effect<void>;
    readonly get: () => Effect.Effect<number>;
  }
>() {
  static readonly Live = Layer.effect(
    this,
    Effect.gen(function* () {
      const counter = yield* Ref.make(0);

      return {
        increment: () => Ref.update(counter, (n) => n + 1),
        get: () => Ref.get(counter),
      };
    }),
  );
}

// Usage - thread-safe concurrent updates
const program = Effect.gen(function* () {
  const cache = yield* CacheService;

  // 100 concurrent increments - all will be applied correctly
  yield* Effect.all(
    Array.from({ length: 100 }, () => cache.increment()),
    { concurrency: 'unbounded' },
  );

  const value = yield* cache.get(); // ✅ Guaranteed to be 100
});
```

### Ref API

| Operation             | Purpose                              | Example                                  |
| --------------------- | ------------------------------------ | ---------------------------------------- |
| `Ref.make(initial)`   | Create ref                           | `yield* Ref.make(0)`                     |
| `Ref.get(ref)`        | Read value                           | `yield* Ref.get(counter)`                |
| `Ref.set(ref, value)` | Set value                            | `yield* Ref.set(counter, 10)`            |
| `Ref.update(ref, fn)` | Update atomically with pure function | `yield* Ref.update(counter, n => n + 1)` |

### When to Use Ref vs SynchronizedRef

✅ **Use Ref for**: Pure state updates without effects

- Connection pools, rate limiters, caches with pre-fetched data, concurrent counters, feature flags
- Updates are synchronous pure functions

✅ **Use SynchronizedRef for**: Effectful state updates

- Updates requiring database queries, API calls, or other effects
- Use `SynchronizedRef.updateEffect` for atomic effectful updates

❌ **Don't use for**: React state, request-scoped data, immutable config, database state

### Best Practices

```typescript
// ✅ CORRECT with Ref - Perform effects before update
const data = yield * fetchData();
yield * Ref.update(state, (current) => ({ ...current, data }));

// ❌ WRONG with Ref - Effects inside update function (pure functions only!)
yield *
  Ref.update(state, (current) => {
    const data = yield * fetchData(); // ERROR - can't use yield* in pure function!
    return { ...current, data };
  });

// ✅ CORRECT with SynchronizedRef - Effects ARE allowed in updateEffect
yield *
  SynchronizedRef.updateEffect(state, (current) =>
    Effect.gen(function* () {
      const data = yield* fetchData(); // ✅ This works with SynchronizedRef!
      return { ...current, data };
    }),
  );
```

### SynchronizedRef Pattern (Effectful Updates)

Use **SynchronizedRef** when state updates require effects (database queries, API calls):

```typescript
import { SynchronizedRef, Effect, Context, Layer } from 'effect';

export class DataCache extends Context.Tag('DataCache')<
  DataCache,
  {
    readonly refresh: (id: string) => Effect.Effect<void>;
  }
>() {
  static readonly Live = Layer.effect(
    this,
    Effect.gen(function* () {
      const cache = yield* SynchronizedRef.make<Map<string, Data>>(new Map());

      return {
        refresh: (id) =>
          SynchronizedRef.updateEffect(cache, (current) =>
            Effect.gen(function* () {
              const data = yield* fetchFromDatabase(id); // ✅ Effects allowed!
              const updated = new Map(current);
              updated.set(id, data);
              return updated;
            }),
          ),
      };
    }),
  );
}
```

## State Management with @effect-atom/atom (Client-Side)

**CRITICAL DISTINCTION**: `@effect-atom/atom` is a **different library** from Effect's built-in `Ref`. Use Atom for **client-side React state**, Ref for **server-side concurrent state**.

### Atom vs Ref: Decision Table

| Aspect           | @effect-atom/atom                            | Effect Ref                             | Effect SynchronizedRef                               |
| ---------------- | -------------------------------------------- | -------------------------------------- | ---------------------------------------------------- |
| **Platform**     | Client/Browser only                          | Server/Node.js                         | Server/Node.js                                       |
| **Purpose**      | React reactive state                         | Thread-safe concurrent state           | Effectful concurrent updates                         |
| **APIs**         | Atom.make, Atom.get, Atom.set, Atom.update   | Ref.make, Ref.get, Ref.set, Ref.update | SynchronizedRef.make, SynchronizedRef.updateEffect   |
| **Integration**  | useAtomValue, useAtomSet hooks               | Effect.gen, service layers             | Effect.gen, service layers                           |
| **Use Cases**    | Cart, filters, form state                    | Pools, limiters, counters              | Database refreshes, API caching                      |
| **Package**      | @effect-atom/atom-react                      | effect (built-in)                      | effect (built-in)                                    |
| **Dependencies** | React                                        | None                                   | None                                                 |
| **Example**      | `const atom = yield* Atom.make({items: []})` | `const ref = yield* Ref.make(0)`       | `const ref = yield* SynchronizedRef.make(new Map())` |

### Atom Basics (Client-Side State)

**Use Atom for**: React component state, UI toggles, form data, search filters, shopping carts.

```typescript
// ✅ Client-side: Create atom in service layer
import { Atom } from '@effect-atom/atom-react';
import { Effect, Context, Layer } from 'effect';

export class CartService extends Context.Tag('CartService')<
  CartService,
  {
    readonly getItems: () => Effect.Effect<CartItem[]>;
    readonly addItem: (item: CartItem) => Effect.Effect<void>;
    readonly removeItem: (productId: string) => Effect.Effect<void>;
    readonly getTotalPrice: () => Effect.Effect<number>;
  }
>() {
  static readonly Live = Layer.effect(
    this,
    Effect.gen(function* () {
      // Create reactive atom for cart state
      const cartAtom = yield* Atom.make<{ items: CartItem[] }>({ items: [] });

      return {
        getItems: () =>
          Effect.gen(function* () {
            const state = yield* Atom.get(cartAtom);
            return state.items;
          }),

        addItem: (item) =>
          Atom.update(cartAtom, (state) => ({
            items: [
              ...state.items.filter((i) => i.productId !== item.productId),
              item,
            ],
          })),

        removeItem: (productId) =>
          Atom.update(cartAtom, (state) => ({
            items: state.items.filter((item) => item.productId !== productId),
          })),

        getTotalPrice: () =>
          Effect.gen(function* () {
            const state = yield* Atom.get(cartAtom);
            return state.items.reduce(
              (sum, item) => sum + item.price * item.quantity,
              0,
            );
          }),
      };
    }),
  );
}
```

### Atom API Reference

| Operation               | Purpose                        | Example                                |
| ----------------------- | ------------------------------ | -------------------------------------- |
| `Atom.make(initial)`    | Create atom                    | `yield* Atom.make({ count: 0 })`       |
| `Atom.get(atom)`        | Read current value             | `yield* Atom.get(countAtom)`           |
| `Atom.set(atom, value)` | Set value                      | `Atom.set(countAtom, 10)`              |
| `Atom.update(atom, fn)` | Update with pure function      | `Atom.update(countAtom, n => n + 1)`   |
| `Atom.family(fn)`       | Create dynamic atoms from keys | `Atom.family((key) => Atom.make(key))` |
| `Atom.map(atom, fn)`    | Derive from another atom       | `Atom.map(userAtom, u => u.name)`      |
| `Atom.runtime(layer)`   | Create atom runtime            | `Atom.runtime(Layer.empty)`            |

### React Integration with useAtomValue and useAtomSet

Use React hooks to read and update atom values in components:

```typescript
// ✅ React component using Atom
import { useAtomValue, useAtomSet } from '@effect-atom/atom-react';
import { CartService } from './cart-service';

export function CartComponent() {
  const cartService = useCartService(); // Get service from context
  const cartAtom = cartService.cartAtom; // Reference to atom

  // Read atom value with hook
  const cart = useAtomValue(cartAtom);

  // Get setter function for atom
  const setCart = useAtomSet(cartAtom);

  // Combined hook (read + write)
  const [cart, setCart] = useAtom(cartAtom);

  return (
    <div>
      <h2>Cart ({cart.items.length} items)</h2>
      <button
        onClick={() =>
          setCart((state) => ({
            items: [...state.items, newItem],
          }))
        }
      >
        Add Item
      </button>
    </div>
  );
}
```

### AtomRuntimeProvider Setup

Provide the Atom runtime to your React application:

```typescript
// ✅ app/layout.tsx
import { AtomRuntimeProvider } from '@samuelho-dev/ui-state/client';
import { ClientRuntimeProvider } from '@samuelho-dev/ui-state/client';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html>
      <body>
        {/* Provide Effect Atom runtime */}
        <AtomRuntimeProvider>
          {/* Provide any additional Effect runtimes */}
          <ClientRuntimeProvider>{children}</ClientRuntimeProvider>
        </AtomRuntimeProvider>
      </body>
    </html>
  );
}
```

### Atom.family for Dynamic State

Use `Atom.family` to create a set of atoms keyed by values (e.g., separate atom per user):

```typescript
// ✅ Create family of atoms for user preferences
const userPreferencesFamily = Atom.family((userId: string) =>
  Atom.make({
    theme: 'light',
    notifications: true,
    language: 'en',
  }),
);

// Usage: Different atom instance per userId
const user1Prefs = userPreferencesFamily('user-123');
const user2Prefs = userPreferencesFamily('user-456');
```

### Atom.map for Derived State

Create derived atoms that compute values from other atoms:

```typescript
// ✅ Derive total price from cart atom
const cartAtom = yield* Atom.make({ items: [...] })

const totalPriceAtom = Atom.map(cartAtom, (cart) =>
  cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
)

// When reading totalPriceAtom, it always reflects current cart
const price = yield* Atom.get(totalPriceAtom)
```

### Server vs Client State: When to Use Each

**Use Atom (Client) for:**

- ✅ React component state
- ✅ UI toggles and modals
- ✅ Form input values
- ✅ Search filters and pagination
- ✅ Shopping cart contents
- ✅ User preferences (display, theme)

**Use Ref (Server) for:**

- ✅ Connection pools
- ✅ Rate limiters
- ✅ Cache entries (pre-fetched data)
- ✅ Concurrent counters
- ✅ Feature flags
- ✅ Session tracking

**Use SynchronizedRef (Server, Effectful) for:**

- ✅ Updates requiring database queries
- ✅ API calls during state updates
- ✅ Atomic database transactions
- ✅ Effects with side effects

### Common Patterns

**Pattern 1: Search State with Atom**

```typescript
// ✅ Client-side search state
const searchAtom =
  yield *
  Atom.make({
    query: '',
    filters: {},
    page: 1,
    sortBy: '_text_match:desc',
  });

// React component updates
const setFilters = (newFilters) =>
  Atom.update(searchAtom, (state) => ({
    ...state,
    filters: newFilters,
    page: 1, // Reset to first page
  }));
```

**Pattern 2: Form State with Atom**

```typescript
// ✅ Form validation state in Atom
const formAtom =
  yield *
  Atom.make({
    values: { name: '', email: '' },
    errors: {},
    touched: {},
  });

// Validate on change
const handleFieldChange = (field: string, value: string) =>
  Atom.update(formAtom, (state) => ({
    ...state,
    values: { ...state.values, [field]: value },
    errors: validateField(field, value),
  }));
```

### Effect 4.0 Compatibility

✅ **@effect-atom/atom is stable and independent of Effect version**

- Works with Effect 3.0+
- No breaking changes expected in Effect 4.0
- Separate library from core Effect

### Important Notes

1. **Atoms are client-side only**: Never use Atom in server-side code (API routes, services)
2. **Ref is server-side only**: Never try to use Ref in React components (won't have Effect context)
3. **Runtime preservation**: If calling Effects from React event handlers, preserve the runtime
4. **Keep Atoms simple**: Use atoms for UI state; use services for business logic

## Running Effects

### Critical Context: Running in This Codebase

**IMPORTANT**: This monorepo uses a specific running pattern strategy:

1. ✅ **Templates NEVER use Effect.run\*** - By design, generated library code returns Effects, never runs them
2. ✅ **Running happens ONLY at application boundaries** - Apps/servers, not libraries
3. ✅ **Tests use it.scoped** - No manual Effect.runPromise (see TESTING_PATTERNS.md)
4. ✅ **Callbacks use Runtime.runFork** - Preserved runtime for SDK integration

**Why this matters**: If you're writing library code (features, data-access, providers), you should NEVER need to run effects. This section is for application developers and special integration cases only.

---

### Decision Matrix: Choosing the Right Runner

| Context | Runner | When to Use | Constraints | Example |
|---------|--------|-------------|-------------|---------|
| **Application entry point** | `Effect.runPromise` | Main function in apps/servers | Can fail (throws) | `await Effect.runPromise(app)` |
| **Node.js CLI** | `NodeRuntime.runMain` | CLI programs | Handles signals | `NodeRuntime.runMain(cli)` |
| **Tests** | `it.scoped` | ALL test cases | Automatic scope mgmt | See TESTING_PATTERNS.md |
| **Callbacks (WebSocket, etc)** | `Runtime.runFork` | SDK callbacks, event handlers | Preserve runtime | WebSocket.on("message", ...) |
| **Background tasks** | `Runtime.runFork` | Fire-and-forget | Non-blocking | Background job processing |
| **Pure sync effects** | `Effect.runSync` | Config loading, constants | Must be synchronous | `Effect.runSync(loadConfig)` |
| **Library code** | ❌ **NEVER** | Exported functions | Return Effect, don't run | All template-generated code |

**Quick Rules**:
- Application entry → `Effect.runPromise`
- Tests → `it.scoped` (never manual)
- Callbacks → `Runtime.runFork`
- Libraries → Return Effect (don't run)
- Doubt? → Return Effect and let consumer run it

---

### Pattern 1: Effect.runPromise (Application Entry Point)

**Use when**: Running Effect at application boundaries (main function, server startup).

```typescript
import { Effect, Layer } from "effect";

// ✅ CORRECT: Application entry point (apps/api/src/main.ts)
async function main() {
  const program = Effect.gen(function* () {
    const server = yield* HttpServer;
    yield* server.start();
    yield* Effect.log("Server started successfully");
  });

  await Effect.runPromise(
    program.pipe(Effect.provide(AppLayer))
  );
}

main().catch((error) => {
  console.error("Application failed:", error);
  process.exit(1);
});
```

**Characteristics**:
- Returns `Promise<A>`
- Throws on failure (use try/catch or .catch)
- Loses Effect error types (becomes generic Error)
- Use at application boundaries ONLY

**⚠️ Critical**: Never use in library code:

```typescript
// ❌ WRONG: Running effects in library exports
export async function saveUser(user: User) {
  // DON'T DO THIS in libraries!
  return await Effect.runPromise(
    UserRepository.save(user).pipe(Effect.provide(AppLayer))
  );
}

// ✅ CORRECT: Return Effect, let consumer run it
export const saveUser = (user: User): Effect.Effect<void, RepositoryError, UserRepository> =>
  Effect.gen(function* () {
    const repo = yield* UserRepository;
    yield* repo.save(user);
  });
```

---

### Pattern 2: Effect.runSync (Pure Synchronous Effects)

**Use when**: Effect is guaranteed synchronous (rare in practice).

```typescript
import { Effect } from "effect";

// ✅ CORRECT: Pure sync effect
const config = Effect.runSync(
  Effect.succeed({ apiKey: "test", port: 3000 })
);

// ❌ WRONG: Running async effect
const userData = Effect.runSync(
  Effect.gen(function* () {
    const db = yield* DatabaseService; // RUNTIME ERROR! Async operation
    return yield* db.query(...);
  })
);
// Error: "Running sync effects requires that the effect be synchronous"
```

**Characteristics**:
- Returns `A` (not Promise)
- **THROWS** if effect is async
- Use ONLY for pure computations
- Rare in practice (prefer runPromise)

**When runSync is appropriate**:
- Loading static configuration at module init
- Computing constants
- Pure transformations (no async/await)

**When runSync is NOT appropriate** (99% of cases):
- Database queries
- API calls
- File I/O
- Any Effect using `yield*` with services

---

### Pattern 3: Runtime.runFork (Background Tasks & Callbacks)

**Use when**: Fire-and-forget operations or callback integration.

```typescript
import { Effect, Runtime } from "effect";

// ✅ CORRECT: Background task with runtime preservation
const scheduleCleanup = Effect.gen(function* () {
  const runtime = yield* Effect.runtime();
  const runFork = Runtime.runFork(runtime);

  // Schedule cleanup every hour
  setInterval(() => {
    runFork(
      Effect.gen(function* () {
        const cache = yield* CacheService;
        yield* cache.cleanup();
        yield* Effect.log("Cache cleaned");
      })
    );
  }, 3600000);
});

// ✅ CORRECT: WebSocket with preserved runtime
const setupWebSocket = Effect.gen(function* () {
  const runtime = yield* Effect.runtime();
  const runFork = Runtime.runFork(runtime);

  websocket.on("message", (data) => {
    runFork(handleMessage(data)); // Preserves context and layers
  });
});
```

**Characteristics**:
- Returns `RuntimeFiber<A, E>`
- Non-blocking (doesn't wait for completion)
- Preserves Effect error types
- Use for callbacks, background tasks

**Why preserve runtime?**
- Callback has access to all services (DatabaseService, etc.)
- Layer composition works
- Context tags available
- Proper error tracking

See [Runtime Preservation](#runtime-preservation-for-callbacks) section below for complete details.

---

### Pattern 4: NodeRuntime.runMain (CLI Applications)

**Use when**: Building CLI tools with graceful shutdown.

```typescript
import { NodeRuntime } from "@effect/platform-node";
import { Effect, Layer } from "effect";

// ✅ CORRECT: CLI application (apps/cli/src/main.ts)
const program = Effect.gen(function* () {
  const cli = yield* CliService;
  const args = yield* cli.parseArgs(process.argv);
  yield* cli.execute(args);
});

NodeRuntime.runMain(
  program.pipe(Effect.provide(AppLayer))
);

// Benefits:
// - Graceful shutdown on SIGTERM/SIGINT
// - Automatic error logging with stack traces
// - Exit code handling (0 for success, 1 for failure)
// - Resource cleanup on interruption
```

---

### Application Entry Points (Summary)

```typescript
// ✅ Recommended: Effect.runPromise for async contexts
await Effect.runPromise(program.pipe(Effect.provide(AppLayer)));

// ✅ For Node.js CLI applications
import { NodeRuntime } from '@effect/platform-node';

NodeRuntime.runMain(program.pipe(Effect.provide(AppLayer)));

// ✅ For testing - use @effect/vitest (see TESTING_PATTERNS.md)
import { Effect, Layer } from 'effect';
import { expect, it } from '@effect/vitest';

it.scoped('should process payment', () =>
  Effect.gen(function* () {
    const result = yield* processPayment(100);
    expect(result.status).toBe('success');
  }).pipe(Effect.provide(Layer.fresh(TestLayer))),
);

// ❌ AVOID: runSync for async effects
Effect.runSync(asyncEffect); // Will throw if effect is async

// ✅ Use runSync only for pure synchronous effects
Effect.runSync(Effect.succeed(42));
```

---

### Where Effects Are Run in This Codebase

**Application Layer** (apps/*/src/main.ts):
```typescript
// Entry point - ONLY place to run effects in apps
await Effect.runPromise(program.pipe(Effect.provide(AppLayer)));
```

**Test Layer** (\*.spec.ts files):
```typescript
// Tests - @effect/vitest handles running, NEVER manual runPromise
it.scoped("test", () =>
  Effect.gen(function* () {
    // Test code here - framework runs it
  }).pipe(Effect.provide(Layer.fresh(TestLayer)))
);
```

**Callback Layer** (WebSocket, event handlers):
```typescript
// Callbacks - Runtime preservation pattern (see below)
const runtime = yield* Effect.runtime();
const runFork = Runtime.runFork(runtime);

websocket.on("message", (data) => {
  runFork(handleMessage(data)); // Preserves context
});
```

**Library Layer** (libs/\*\*/src/\*\*/\*.ts):
```typescript
// Libraries - NEVER run effects, always return Effect
export const operation = (): Effect.Effect<A, E, R> =>
  Effect.gen(function* () {
    // Implementation - returns Effect, doesn't run it
  });
```

---

### Anti-Patterns: Running Effects

```typescript
// ❌ WRONG: Running effects in library code
export class UserRepository {
  async findById(id: string): Promise<User> {
    // NEVER do this in libraries!
    return await Effect.runPromise(
      Effect.gen(function* () {
        const db = yield* DatabaseService;
        return yield* db.query(...);
      })
    );
  }
}

// ✅ CORRECT: Return Effect, let consumer run it
export class UserRepository {
  findById(id: string): Effect.Effect<User, Error, DatabaseService> {
    return Effect.gen(function* () {
      const db = yield* DatabaseService;
      return yield* db.query(...);
    });
  }
}

// ❌ WRONG: Manual runPromise in tests
it("should find user", async () => {
  const result = await Effect.runPromise(
    UserRepository.findById("123").pipe(Effect.provide(TestLayer))
  );
  expect(result).toBeDefined();
});

// ✅ CORRECT: Use it.scoped (see TESTING_PATTERNS.md)
it.scoped("should find user", () =>
  Effect.gen(function* () {
    const repo = yield* UserRepository;
    const result = yield* repo.findById("123");
    expect(result).toBeDefined();
  }).pipe(Effect.provide(Layer.fresh(TestLayer)))
);

// ❌ WRONG: runSync with async operations
const user = Effect.runSync(
  Effect.gen(function* () {
    const repo = yield* UserRepository; // THROWS! Async operation
    return yield* repo.findById("123");
  })
);

// ✅ CORRECT: Use runPromise for async
const user = await Effect.runPromise(
  Effect.gen(function* () {
    const repo = yield* UserRepository;
    return yield* repo.findById("123");
  }).pipe(Effect.provide(AppLayer))
);
```

---

### Cross-References

- [Testing Patterns](./TESTING_PATTERNS.md) - Complete guide to it.scoped and test execution
- [Runtime Preservation](#runtime-preservation-for-callbacks) - Callback integration patterns (below)
- [Layer Composition](#layer-creation-patterns) - How to provide dependencies before running

---

## ⚠️ CRITICAL: Runtime Preservation for Callbacks

**This pattern is essential for correctness when integrating Effect with callback-based APIs.** Failure to preserve the runtime leads to lost context, missing dependencies, and hard-to-debug failures in production.

### Why Runtime Preservation is Critical

When you call `Effect.runPromise()` or `Effect.runSync()` without the current runtime:

- ❌ Creates a **new, isolated runtime** with no access to your services
- ❌ Context tags (CurrentUser, DatabaseService, etc.) are **not available**
- ❌ Layer composition is **lost** - services can't be injected
- ❌ Errors aren't properly tracked or caught
- ❌ Fibers aren't part of your application's concurrency model

### Decision Rule: When to Capture Runtime

| Scenario                 | Capture Runtime?       | Rationale                           | Example                               |
| ------------------------ | ---------------------- | ----------------------------------- | ------------------------------------- |
| **Callback-based SDK**   | ✅ YES                 | SDK controls execution timing       | WebSocket, Node event emitters        |
| **Promise-based SDK**    | ✅ YES                 | Need Effect context in continuation | SDK callbacks, custom Promise chains  |
| **Kysely transactions**  | ✅ YES                 | Async callback needs service access | `db.transaction().execute(async ...)` |
| **Effect-based service** | ❌ NO                  | Service already has runtime         | DatabaseService.transaction()         |
| **Inside Effect.gen**    | ❌ NO                  | Already in Effect context           | Service operations, computed values   |
| **Library exports**      | ✅ YES (conditionally) | Consumer may need their runtime     | SDK wrappers, adapters                |

### Pattern 1: WebSocket with Runtime Preservation

```typescript
// ❌ WRONG - Runtime context lost
websocket.on('message', (data) => {
  Effect.runPromise(handleMessage(data)); // Creates new runtime!
});

// ✅ CORRECT - Preserve runtime with Effect.runtime
const setupWebSocket = Effect.gen(function* () {
  const runtime = yield* Effect.runtime();
  const runFork = Runtime.runFork(runtime);

  websocket.on('message', (data) => {
    runFork(handleMessage(data)); // Preserves context and layers
  });

  // Cleanup on scope exit
  yield* Effect.addFinalizer(() => Effect.sync(() => websocket.close()));
});
```

**Why this matters**: The `handleMessage` Effect now has access to all services (DatabaseService, CurrentUser context, etc.) that were provided via layers.

### Pattern 2: FiberHandle for Managed Callbacks

Use when you need explicit control over forked fibers:

```typescript
// ✅ Alternative: Use FiberHandle for managed callbacks
const setupWebSocket = Effect.gen(function* () {
  const handle = yield* FiberHandle.make();

  websocket.on('message', (data) => {
    FiberHandle.run(handle, handleMessage(data)); // Runtime preserved
  });

  // Cleanup on scope exit - all forked fibers cleaned up
  yield* Effect.addFinalizer(() => Effect.sync(() => websocket.close()));
});
```

**Advantage**: FiberHandle automatically manages all forked fibers and cleans them up when the scope exits.

### Pattern 3: Kysely Transactions with Effect Runtime Preservation

**Critical**: Kysely's `db.transaction().execute()` callback runs in an async context that loses the Effect runtime.

```typescript
// ❌ WRONG - DatabaseService not available in transaction
export const UserRepository = class extends Context.Tag('UserRepository')<
  UserRepository,
  {
    readonly createWithRelated: (
      data: CreateUserData,
    ) => Effect.Effect<User, RepositoryError>;
  }
>() {
  static readonly Live = Layer.effect(
    this,
    Effect.gen(function* () {
      const database = yield* DatabaseService;

      return {
        createWithRelated: (data) =>
          database.query((db) =>
            db.transaction().execute(async (trx) => {
              // ❌ PROBLEM: Can't use Effect here - runtime lost
              // const something = yield* SomeService  // ERROR!
              return await createUser(trx, data);
            }),
          ),
      };
    }),
  );
};

// ✅ CORRECT - Preserve runtime for Effect execution within transaction
export const UserRepository = class extends Context.Tag('UserRepository')<
  UserRepository,
  {
    readonly createWithRelated: (
      data: CreateUserData,
    ) => Effect.Effect<User, RepositoryError>;
  }
>() {
  static readonly Live = Layer.effect(
    this,
    Effect.gen(function* () {
      const database = yield* DatabaseService;
      const runtime = yield* Effect.runtime();

      return {
        createWithRelated: (data) =>
          database.query((db) =>
            db.transaction().execute(async (trx) => {
              // ✅ CORRECT: Preserve runtime for Effect execution within transaction
              return await Runtime.runPromise(runtime)(
                Effect.gen(function* () {
                  const user = yield* createUser(trx, data);
                  const profile = yield* createProfile(trx, user.id);
                  return { ...user, profile };
                }),
              );
            }),
          ),
      };
    }),
  );
};
```

**Why this is critical**: The `createUser` and `createProfile` Effects may depend on services through the context. Capturing the runtime ensures they have access.

### Pattern 4: SDK Adapter with Runtime Preservation

When creating an adapter around an SDK with callbacks:

```typescript
// ✅ CORRECT - SDK adapter preserving runtime
export class StripeWebhookService extends Context.Tag('StripeWebhookService')<
  StripeWebhookService,
  {
    readonly setupWebhookListener: () => Effect.Effect<void>;
  }
>() {
  static readonly Live = Layer.effect(
    this,
    Effect.gen(function* () {
      const stripe = yield* StripeService;
      const logger = yield* LoggingService;
      const runtime = yield* Effect.runtime();

      return {
        setupWebhookListener: () =>
          Effect.gen(function* () {
            const runFork = Runtime.runFork(runtime);

            // SDK provides callbacks, we need to preserve runtime
            stripe.webhooks.onEvent('payment_intent.succeeded', (event) => {
              runFork(
                Effect.gen(function* () {
                  yield* logger.info(`Webhook received: ${event.id}`);
                  yield* handlePaymentSuccess(event);
                }),
              );
            });
          }),
      };
    }),
  );
}
```

### Common Mistakes

**Mistake 1: New runtime per callback**

```typescript
// ❌ WRONG - Creates new runtime for each message
websocket.on('message', (data) => {
  Effect.runPromise(handleMessage(data)); // WRONG!
});
```

**Mistake 2: Using await instead of Runtime.runPromise**

```typescript
// ❌ WRONG - Mixing async/await (different runtime)
websocket.on('message', async (data) => {
  await Effect.runPromise(handleMessage(data)); // WRONG!
});
```

**Mistake 3: Forgetting runtime in nested callbacks**

```typescript
// ❌ WRONG - Runtime lost in nested promise chain
const runtime = yield * Effect.runtime();
sdk.onEvent(() => {
  sdk.nested.callback(() => {
    // Runtime NOT available here - lost through callback chain
  });
});
```

**Correct approach for nested callbacks**:

```typescript
// ✅ CORRECT - Preserve runtime through entire callback chain
const runtime = yield * Effect.runtime();
const runFork = Runtime.runFork(runtime);

sdk.onEvent(() => {
  sdk.nested.callback(() => {
    runFork(nestedEffect); // Runtime available here
  });
});
```

### Testing Runtime Preservation

Use `@effect/vitest` to test runtime preservation:

```typescript
import { describe, expect, it } from '@effect/vitest'; // ✅ All from @effect/vitest
import { Effect, Layer, Runtime } from 'effect';

describe('RuntimePreservation', () => {
  it.scoped('should preserve runtime in callbacks', () => // ✅ Always it.scoped
    Effect.gen(function* () {
      const runtime = yield* Effect.runtime();
      const runFork = Runtime.runFork(runtime);

      let called = false;
      runFork(
        Effect.gen(function* () {
          called = true;
        }),
      );

      expect(called).toBe(true);
    }).pipe(Effect.provide(Layer.fresh(Layer.empty)))); // ✅ Always Layer.fresh
});
```

### Effect 4.0 Compatibility

✅ **Runtime preservation is stable in Effect 3.0+**

- `Effect.runtime()` API guaranteed stable
- `Runtime.runFork()` API guaranteed stable
- `FiberHandle` API guaranteed stable
- No breaking changes expected in Effect 4.0

### Related Patterns

- **Layer Composition**: See "Service Composition Patterns" for how context flows through layers
- **Error Handling**: Captured runtime preserves error context through callbacks
- **Fiber Management**: Runtime preservation works with Fiber, FiberSet, FiberMap
- **Resource Management**: Use `Effect.addFinalizer()` with runtime preservation for cleanup

## Concurrent Execution with Fiber, FiberSet, and FiberMap

**Fibers** are Effect's lightweight concurrency primitive (like goroutines). Use **FiberSet** for unkeyed concurrent tasks, **FiberMap** for keyed tasks with deduplication.

### Fiber Basics

```typescript
import { Effect, Fiber } from 'effect';

// Fork background work
const program = Effect.gen(function* () {
  const fiber = yield* Effect.fork(expensiveTask);

  // Do other work while fiber runs
  yield* otherWork;

  // Wait for result
  const result = yield* Fiber.join(fiber);
});
```

### FiberSet - Unkeyed Concurrent Tasks

Auto-manages lifecycle of concurrent operations.

```typescript
import { FiberSet } from 'effect';

export class JobProcessor extends Context.Tag('JobProcessor')<
  JobProcessor,
  {
    readonly processJob: (job: Job) => Effect.Effect<void>;
  }
>() {
  static readonly Live = Layer.scoped(
    this,
    Effect.gen(function* () {
      const fiberSet = yield* FiberSet.make();

      return {
        processJob: (job) => FiberSet.run(fiberSet, processJobLogic(job)),
        // FiberSet auto-cleaned up by Layer.scoped
      };
    }),
  );
}
```

### FiberMap - Keyed Tasks with Deduplication

Prevents duplicate concurrent work for the same key.

```typescript
import { FiberMap, Option } from 'effect';

export class CacheRefresh extends Context.Tag('CacheRefresh')<
  CacheRefresh,
  {
    readonly refresh: (key: string) => Effect.Effect<void>;
  }
>() {
  static readonly Live = Layer.scoped(
    this,
    Effect.gen(function* () {
      const fiberMap = yield* FiberMap.make<string>();

      return {
        refresh: (key) =>
          Effect.gen(function* () {
            // Check if already refreshing
            const existing = yield* FiberMap.get(fiberMap, key);
            if (Option.isSome(existing)) {
              yield* Fiber.join(existing.value); // Wait for existing
              return;
            }

            // Start new refresh
            yield* FiberMap.run(fiberMap, key, refreshLogic(key));
          }),
      };
    }),
  );
}
```

### When to Use Each

| Pattern        | Use Case                | Example                                               |
| -------------- | ----------------------- | ----------------------------------------------------- |
| **Fiber**      | Manual control          | Background tasks with explicit join/interrupt         |
| **FiberSet**   | Unkeyed concurrent work | Job processors, background workers                    |
| **FiberMap**   | Keyed work with dedup   | Cache refresh, API request deduplication              |
| **Effect.all** | Simple parallelism      | Parallel independent tasks (preferred for most cases) |

---

## Advanced Concurrency Primitives

Effect provides five core concurrency primitives for coordination and resource management: **Queue**, **Semaphore**, **PubSub**, **Latch**, and **Deferred**. Each solves specific concurrency challenges.

### Queue - Producer/Consumer Patterns

**Queue** provides type-safe, asynchronous queuing with automatic backpressure for work distribution and task processing.

```typescript
import { Queue, Effect, Scope } from "effect";

// ✅ Background job processing with bounded queue
export class JobQueueService extends Context.Tag("JobQueueService")<
  JobQueueService,
  {
    readonly enqueue: <T>(job: Job<T>) => Effect.Effect<boolean>;
    readonly start: Effect.Effect<void, never, Scope.Scope>;
  }
>() {
  static readonly Live = Layer.scoped(
    this,
    Effect.gen(function* () {
      // Bounded queue with backpressure (max 1000 pending jobs)
      const jobQueue = yield* Queue.bounded<Job<unknown>>(1000);

      return {
        enqueue: (job) => Queue.offer(jobQueue, job),

        start: Effect.gen(function* () {
          // Background processor (runs until scope closes)
          while (true) {
            // Take batch of jobs
            const jobs = yield* Queue.takeUpTo(jobQueue, 10);

            // Process with controlled concurrency
            yield* Effect.all(
              jobs.map(job => processJob(job)),
              { concurrency: 5 }
            );
          }
        }).pipe(Effect.forkScoped)
      };
    })
  );
}

// ✅ Email queue with fire-and-forget pattern
export class EmailService extends Context.Tag("EmailService")<
  EmailService,
  {
    readonly sendEmail: (email: Email) => Effect.Effect<void>;
  }
>() {
  static readonly Live = Layer.effect(
    this,
    Effect.gen(function* () {
      const jobQueue = yield* JobQueueService;

      return {
        sendEmail: (email) =>
          jobQueue.enqueue({
            type: "send_email",
            payload: email,
            retries: 3
          }).pipe(Effect.asVoid)
      };
    })
  );
}
```

**Queue Strategies:**

| Strategy | Behavior When Full | Use Case |
|----------|-------------------|----------|
| `Queue.bounded(n)` | Suspends offers (backpressure) | Job queues, work distribution |
| `Queue.dropping(n)` | Discards new items | Non-critical events, metrics |
| `Queue.sliding(n)` | Removes oldest for new | Real-time data, latest-wins |
| `Queue.unbounded()` | Never full (grows infinitely) | Development, low-volume |

**Key Operations:**
- `Queue.offer` - Add item (suspends if full for bounded)
- `Queue.take` - Remove item (suspends if empty)
- `Queue.takeUpTo(n)` - Batch processing (non-blocking)
- `Queue.takeAll` - Drain queue
- `Queue.poll` - Non-blocking take (returns Option)

**Use Cases:**
- Background job processing (emails, reports, exports)
- Task distribution across workers
- Event buffering with backpressure
- Rate-limited API call queuing

---

### Semaphore - Resource Limiting & Rate Control

**Semaphore** provides permit-based concurrency control for protecting shared resources and rate limiting.

```typescript
import { Effect } from "effect";

// ✅ API rate limiting (max 5 concurrent requests)
export class StripeService extends Context.Tag("StripeService")<
  StripeService,
  {
    readonly createCharge: (params: ChargeParams) => Effect.Effect<Charge, StripeError>;
  }
>() {
  static readonly Live = Layer.scoped(
    this,
    Effect.gen(function* () {
      const stripe = new Stripe(config.apiKey);

      // Limit to 5 concurrent API calls
      const rateLimiter = yield* Effect.makeSemaphore(5);

      return {
        createCharge: (params) =>
          rateLimiter.withPermits(1)(
            Effect.tryPromise({
              try: () => stripe.charges.create(params),
              catch: (error) => new StripeError({ cause: error })
            })
          )
      };
    })
  );
}

// ✅ Database connection pool protection
export class DatabaseService extends Context.Tag("DatabaseService")<
  DatabaseService,
  {
    readonly query: <T>(fn: (db: Kysely<DB>) => Promise<T>) => Effect.Effect<T, DatabaseError>;
  }
>() {
  static readonly Live = Layer.scoped(
    this,
    Effect.gen(function* () {
      const pool = yield* createDatabasePool();

      // Protect pool with semaphore (max 20 connections)
      const poolLimiter = yield* Effect.makeSemaphore(20);

      return {
        query: (fn) =>
          poolLimiter.withPermits(1)(
            Effect.tryPromise({
              try: () => fn(kysely),
              catch: (error) => new DatabaseError({ cause: error })
            })
          )
      };
    })
  );
}

// ✅ Sequential execution (1-permit semaphore)
const sequential = Effect.makeSemaphore(1);

const tasks = [task1, task2, task3];
yield* Effect.all(
  tasks.map(task =>
    sequential.pipe(
      Effect.flatMap(sem => sem.withPermits(1)(task))
    )
  )
);
// Executes sequentially despite Effect.all
```

**Semaphore API:**
- `Effect.makeSemaphore(n)` - Create with n permits
- `semaphore.withPermits(count)(effect)` - Acquire → run → release
- `semaphore.take(count)` - Manual acquire
- `semaphore.release(count)` - Manual release

**Use Cases:**
- API rate limiting (prevent 429 errors)
- Database connection pools
- File system access limits
- Sequential execution guarantees
- Resource throttling

---

### PubSub - Event Broadcasting

**PubSub** broadcasts messages to all subscribers with built-in backpressure strategies.

```typescript
import { PubSub, Queue, Effect, Scope } from "effect";

// ✅ Event bus for domain events
export class EventBusService extends Context.Tag("EventBusService")<
  EventBusService,
  {
    readonly publish: (event: DomainEvent) => Effect.Effect<boolean>;
    readonly subscribe: Effect.Effect<Queue.Dequeue<DomainEvent>, never, Scope.Scope>;
  }
>() {
  static readonly Live = Layer.scoped(
    this,
    Effect.gen(function* () {
      // Sliding strategy handles slow consumers
      const eventBus = yield* PubSub.bounded<DomainEvent>(1000);

      return {
        publish: (event) => PubSub.publish(eventBus, event),
        subscribe: PubSub.subscribe(eventBus)
      };
    })
  );
}

// ✅ Real-time notifications with multiple subscribers
export class NotificationService extends Context.Tag("NotificationService")<
  NotificationService,
  {
    readonly notifyUserCreated: (user: User) => Effect.Effect<void>;
  }
>() {
  static readonly Live = Layer.effect(
    this,
    Effect.gen(function* () {
      const eventBus = yield* EventBusService;

      return {
        notifyUserCreated: (user) =>
          eventBus.publish({
            type: "UserCreated",
            payload: user,
            timestamp: new Date()
          }).pipe(Effect.asVoid)
      };
    })
  );
}

// ✅ Subscribe and process events
const processEvents = Effect.gen(function* () {
  const eventBus = yield* EventBusService;
  const subscription = yield* eventBus.subscribe;

  // Process events forever
  yield* Queue.take(subscription).pipe(
    Effect.flatMap(event => handleEvent(event)),
    Effect.forever,
    Effect.forkScoped
  );
});

// ✅ WebSocket broadcasting
export class WebSocketServer extends Context.Tag("WebSocketServer")<
  WebSocketServer,
  {
    readonly broadcast: (message: Message) => Effect.Effect<void>;
    readonly registerClient: (ws: WebSocket) => Effect.Effect<void, never, Scope.Scope>;
  }
>() {
  static readonly Live = Layer.scoped(
    this,
    Effect.gen(function* () {
      const messageBus = yield* PubSub.unbounded<Message>();

      return {
        broadcast: (message) =>
          PubSub.publish(messageBus, message).pipe(Effect.asVoid),

        registerClient: (ws) =>
          Effect.gen(function* () {
            const subscription = yield* PubSub.subscribe(messageBus);

            // Forward messages to this client
            yield* Queue.take(subscription).pipe(
              Effect.flatMap(msg =>
                Effect.sync(() => ws.send(JSON.stringify(msg)))
              ),
              Effect.forever,
              Effect.forkScoped
            );
          })
      };
    })
  );
}
```

**PubSub Strategies:**

| Strategy | Behavior When Full | Use Case |
|----------|-------------------|----------|
| `PubSub.bounded(n)` | Suspends publishers | Critical events |
| `PubSub.dropping(n)` | Discards new messages | Non-critical notifications |
| `PubSub.sliding(n)` | Removes oldest messages | Real-time data streams |
| `PubSub.unbounded()` | Never full | Development, low-volume |

**IMPORTANT:** Subscribe BEFORE publishing to guarantee event receipt.

**Use Cases:**
- Domain event broadcasting
- WebSocket message distribution
- Real-time notifications
- Distributed logging (fan-out)
- Event-driven cache invalidation

---

### Latch - Startup Coordination

**Latch** provides one-time synchronization gates for coordinating initialization.

```typescript
import { Effect } from "effect";

// ✅ Block operations until database migrations complete
export class DatabaseService extends Context.Tag("DatabaseService")<
  DatabaseService,
  {
    readonly query: <T>(fn: QueryFn<T>) => Effect.Effect<T, DatabaseError>;
    readonly waitForMigrations: Effect.Effect<void>;
  }
>() {
  static readonly Live = Layer.scoped(
    this,
    Effect.gen(function* () {
      const db = yield* initializeDatabase();
      const migrationLatch = yield* Effect.makeLatch(false); // Closed

      // Run migrations in background, open when done
      yield* Effect.forkScoped(
        Effect.gen(function* () {
          yield* runMigrations(db);
          yield* migrationLatch.open();
        })
      );

      return {
        query: (fn) =>
          migrationLatch.whenOpen(  // Wait for migrations
            Effect.tryPromise({
              try: () => fn(db),
              catch: (error) => new DatabaseError({ cause: error })
            })
          ),

        waitForMigrations: migrationLatch.await()
      };
    })
  );
}

// ✅ Application startup coordination
const app = Effect.gen(function* () {
  const db = yield* DatabaseService;

  // Block until migrations complete
  yield* db.waitForMigrations();

  // Now safe to handle requests
  yield* startHttpServer();
});

// ✅ Cache warmup coordination
export class CacheService extends Context.Tag("CacheService")<
  CacheService,
  {
    readonly get: <T>(key: string) => Effect.Effect<Option.Option<T>>;
  }
>() {
  static readonly Live = Layer.scoped(
    this,
    Effect.gen(function* () {
      const cache = new Map<string, unknown>();
      const warmupLatch = yield* Effect.makeLatch(false);

      // Background warmup
      yield* Effect.forkScoped(
        Effect.gen(function* () {
          yield* loadCriticalData(cache);
          yield* warmupLatch.open();
        })
      );

      return {
        get: (key) =>
          warmupLatch.whenOpen(  // Wait for warmup
            Effect.sync(() => Option.fromNullable(cache.get(key)))
          )
      };
    })
  );
}
```

**Latch API:**
- `Effect.makeLatch(open: boolean)` - Create latch (open/closed)
- `latch.open()` - Open gate (unblocks waiting fibers)
- `latch.await()` - Wait for gate to open
- `latch.whenOpen(effect)` - Run effect only when open

**Use Cases:**
- Block requests until database migrations finish
- Wait for configuration loading
- Coordinate service initialization
- Ensure cache warmup before serving traffic

---

### Deferred - Fiber Coordination

**Deferred** is a promise-like primitive for one-time value resolution with fiber coordination.

```typescript
import { Deferred, Effect } from "effect";

// ✅ Lazy resource initialization
export class ResourceService extends Context.Tag("ResourceService")<
  ResourceService,
  {
    readonly getHandle: Effect.Effect<ResourceHandle, InitError>;
  }
>() {
  static readonly Live = Layer.scoped(
    this,
    Effect.gen(function* () {
      const handleDeferred = yield* Deferred.make<ResourceHandle, InitError>();

      // Initialize on first access
      const initOnce = Effect.gen(function* () {
        // Check if already initialized
        const result = yield* Deferred.poll(handleDeferred);

        if (Option.isNone(result)) {
          // Not initialized yet, do it now
          const handle = yield* initializeResource();
          yield* Deferred.succeed(handleDeferred, handle);
        }
      });

      return {
        getHandle: Effect.gen(function* () {
          yield* initOnce;
          return yield* Deferred.await(handleDeferred);
        })
      };
    })
  );
}

// ✅ Cache warmup with result passing
export class CacheService extends Context.Tag("CacheService")<
  CacheService,
  {
    readonly warmup: Effect.Effect<Map<string, unknown>, CacheError>;
    readonly get: <T>(key: string) => Effect.Effect<Option.Option<T>, CacheError>;
  }
>() {
  static readonly Live = Layer.scoped(
    this,
    Effect.gen(function* () {
      const cacheDeferred = yield* Deferred.make<Map<string, unknown>, CacheError>();

      // Background warmup
      yield* Effect.forkScoped(
        Effect.gen(function* () {
          const cache = new Map<string, unknown>();
          yield* loadUserCache(cache);
          yield* loadProductCache(cache);
          yield* Deferred.succeed(cacheDeferred, cache);
        }).pipe(
          Effect.catchAll((error) =>
            Deferred.fail(cacheDeferred, error)
          )
        )
      );

      return {
        warmup: Deferred.await(cacheDeferred),

        get: (key) =>
          Effect.gen(function* () {
            const cache = yield* Deferred.await(cacheDeferred);
            return Option.fromNullable(cache.get(key));
          })
      };
    })
  );
}

// ✅ Work handoff between fibers
const coordinatedWork = Effect.gen(function* () {
  const resultDeferred = yield* Deferred.make<Result, WorkError>();

  // Producer fiber
  yield* Effect.forkScoped(
    Effect.gen(function* () {
      const result = yield* doExpensiveWork();
      yield* Deferred.succeed(resultDeferred, result);
    })
  );

  // Consumer fiber (waits for result)
  yield* Effect.forkScoped(
    Effect.gen(function* () {
      const result = yield* Deferred.await(resultDeferred);
      yield* processResult(result);
    })
  );
});
```

**Deferred API:**
- `Deferred.make<A, E>()` - Create deferred
- `Deferred.succeed(d, value)` - Resolve with success
- `Deferred.fail(d, error)` - Resolve with failure
- `Deferred.await(d)` - Wait for resolution
- `Deferred.poll(d)` - Non-blocking status check (returns Option)

**Deferred vs Latch vs Queue:**

| Primitive | Value | Multiple Use | Can Fail |
|-----------|-------|--------------|----------|
| **Deferred** | Yes (type A) | No (one-time) | Yes (type E) |
| **Latch** | No (gate only) | No (one-time) | No |
| **Queue** | Yes (type A) | Yes (stream) | Yes (type E) |

**Use Cases:**
- Lazy resource initialization (initialize on first use)
- Cache warmup with error handling
- Configuration loading with validation
- Work handoff between fibers with typed results

---

## Parallel Operations

### Effect.all for Concurrent Execution

Effect.all supports both **array syntax** and **object syntax** for running effects in parallel.

#### Syntax Selection Guide

| Syntax     | Use When                             | Result Type             | Destructuring          |
| ---------- | ------------------------------------ | ----------------------- | ---------------------- |
| **Array**  | Homogeneous data, similar operations | Tuple `[A, B, C]`       | `[a, b, c]` positional |
| **Object** | Heterogeneous data, named access     | Object `{ a: A, b: B }` | `{ a, b }` by name     |

#### Array Syntax - Positional Results

Use for **homogeneous collections** or when order matters:

```typescript
// ✅ Array syntax: Homogeneous data (all same type/purpose)
const getUserData = (userId: string) =>
  Effect.all(
    [getUserProfile(userId), getUserOrders(userId), getUserPreferences(userId)],
    { concurrency: 'unbounded' },
  ).pipe(
    Effect.map(([profile, orders, preferences]) => ({
      ...profile,
      orders,
      preferences,
    })),
  );

// ✅ Good for processing similar items
const validateFields = (fields: string[]) =>
  Effect.all(
    fields.map((field) => validateField(field)),
    { concurrency: 'unbounded' },
  ).pipe(Effect.map((results) => results.every((valid) => valid)));
```

**When to use**:

- Similar operations on different inputs
- Positional meaning (order matters)
- Homogeneous result types
- Dynamic number of effects

#### Object Syntax - Named Results

Use for **heterogeneous data** with semantic meaning:

```typescript
// ✅ Object syntax: Heterogeneous data with semantic names
const getProductPage = (productId: string) =>
  Effect.gen(function* () {
    const {
      product, // Product entity
      reviews, // Review list
      seller, // Seller entity
      viewCount, // Number
    } = yield* Effect.all(
      {
        product: productRepo.findById(productId),
        reviews: reviewRepo.findByProduct(productId),
        seller: Effect.gen(function* () {
          const prod = yield* productRepo.findById(productId);
          return yield* sellerRepo.findById(prod.sellerId);
        }),
        viewCount: analytics.getProductViews(productId),
      },
      { concurrency: 'unbounded' },
    );

    return { product, reviews, seller, analytics: { viewCount } };
  });

// ✅ Good for dashboard data aggregation
const getDashboardData = (userId: string) =>
  Effect.all(
    {
      user: fetchUser(userId),
      stats: fetchUserStats(userId),
      notifications: fetchNotifications(userId),
      preferences: fetchPreferences(userId),
    },
    { concurrency: 'unbounded' },
  );
```

**When to use**:

- Different types of data
- Semantic field names improve readability
- Fixed set of named results
- Better self-documenting code

#### Concurrency and Error Modes

Both syntaxes support the same options:

```typescript
// ✅ Parallel with early exit on first error (default)
Effect.all(effects, { concurrency: 'unbounded', mode: 'default' });

// ✅ Collect all results, even with errors (Either)
Effect.all(effects, { concurrency: 'unbounded', mode: 'either' });

// ✅ Validate all, collecting all errors
Effect.all(effects, { concurrency: 'unbounded', mode: 'validate' });

// ✅ Limited concurrency
Effect.all(effects, { concurrency: 5 }); // Max 5 parallel operations

// ✅ Sequential execution
Effect.all(effects, { concurrency: 1 }); // Same as sequential
```

#### Decision Matrix

```
Do results have semantic meaning?
├─ YES → Object syntax
│   Example: { product, reviews, seller }
│   Benefit: Self-documenting, clear field names
│
└─ NO → Are results homogeneous?
    ├─ YES → Array syntax
    │   Example: fields.map(f => validate(f))
    │   Benefit: Works with dynamic collections
    │
    └─ NO → Object syntax
        Example: { count: getCount(), name: getName() }
        Benefit: Type-safe named access
```

#### Common Patterns

```typescript
// ✅ Parallel with limited concurrency
const processBatch = (items: Item[]) =>
  Effect.forEach(
    items,
    (item) => processItem(item),
    { concurrency: 5 }, // Process max 5 items at once
  );

// ✅ Race effects - first to complete wins
const fetchWithTimeout = (url: string) =>
  Effect.race(
    fetchData(url),
    Effect.sleep('5 seconds').pipe(
      Effect.flatMap(() => Effect.fail(new TimeoutError())),
    ),
  );

// ✅ Collect errors with validate mode
const validateAllFields = (data: FormData) =>
  Effect.all(
    {
      name: validateName(data.name),
      email: validateEmail(data.email),
      age: validateAge(data.age),
    },
    {
      concurrency: 'unbounded',
      mode: 'validate', // Collect all validation errors
    },
  );
```

#### Migration Between Syntaxes

```typescript
// Before: Array syntax
const [product, reviews, seller] =
  yield *
  Effect.all(
    [
      productRepo.findById(id),
      reviewRepo.findByProduct(id),
      sellerRepo.findById(sellerId),
    ],
    { concurrency: 'unbounded' },
  );

// After: Object syntax (better readability)
const { product, reviews, seller } =
  yield *
  Effect.all(
    {
      product: productRepo.findById(id),
      reviews: reviewRepo.findByProduct(id),
      seller: sellerRepo.findById(sellerId),
    },
    { concurrency: 'unbounded' },
  );
```

### Effect 4.0 Compatibility Notes

**Stable in Effect 3.0+**: Both array and object syntax are stable
**Effect 4.0 Status**: No breaking changes expected
**Recommendation**: Prefer object syntax for better readability when results have semantic meaning

## Comprehensive Test Layer Patterns

### Live, Test, Dev, and Mock Layers

```typescript
export class PaymentService extends Context.Tag('PaymentService')<
  PaymentService,
  PaymentServiceInterface
>() {
  // Production layer with real dependencies
  static readonly Live = Layer.effect(
    this,
    Effect.gen(function* () {
      const stripe = yield* StripeService;
      const db = yield* DatabaseService;
      const logger = yield* LoggingService;

      return {
        processPayment: (amount) =>
          Effect.gen(function* () {
            yield* logger.info(`Processing payment: ${amount}`);
            const result = yield* Effect.tryPromise({
              try: () =>
                stripe.paymentIntents.create({ amount, currency: 'usd' }),
              catch: (error) => new PaymentError({ cause: error }),
            });
            yield* db.query((db) =>
              db
                .insertInto('payments')
                .values({ amount, stripeId: result.id })
                .execute(),
            );
            return result;
          }),
      };
    }),
  );

  // Test layer with deterministic results
  static readonly Test = Layer.succeed(this, {
    processPayment: (amount) =>
      Effect.succeed({
        id: `test-${amount}`,
        status: 'success',
        amount,
        created: 1234567890,
      }),
    refundPayment: () => Effect.succeed(void 0),
  });

  // Dev layer with logging and delays for local development
  static readonly Dev = Layer.effect(
    this,
    Effect.gen(function* () {
      const logger = yield* LoggingService;

      return {
        processPayment: (amount) =>
          Effect.gen(function* () {
            yield* logger.info(`[DEV] Processing payment: ${amount}`);
            yield* Effect.sleep('100 millis'); // Simulate network delay
            return {
              id: `dev-${Date.now()}`,
              status: 'success' as const,
              amount,
              created: Date.now(),
            };
          }),
        refundPayment: (id) =>
          Effect.gen(function* () {
            yield* logger.info(`[DEV] Refunding payment: ${id}`);
            yield* Effect.sleep('50 millis');
          }),
      };
    }),
  );

  // Configurable mock layer for specific test scenarios
  static readonly Mock = (overrides?: Partial<PaymentServiceInterface>) =>
    Layer.succeed(this, {
      processPayment:
        overrides?.processPayment ??
        ((amount) =>
          Effect.succeed({
            id: 'mock-123',
            status: 'success',
            amount,
            created: Date.now(),
          })),
      refundPayment: overrides?.refundPayment ?? (() => Effect.succeed(void 0)),
    });

  // Auto layer - selects appropriate layer based on environment
  static readonly Auto = Layer.unwrapEffect(
    Effect.gen(function* () {
      const env = yield* Config.string('NODE_ENV').pipe(
        Effect.orElse(() => Effect.succeed('production')),
      );

      switch (env) {
        case 'test':
          return PaymentService.Test;
        case 'development':
          return PaymentService.Dev;
        case 'production':
        default:
          return PaymentService.Live;
      }
    }),
  );
}

// Usage in tests with specific scenarios
import { describe, expect, it } from '@effect/vitest'; // ✅ All from @effect/vitest

describe('PaymentService', () => {
  it.scoped('should handle payment failures', () => { // ✅ Always it.scoped
    const TestLayer = Layer.mergeAll(
      DatabaseService.Test,
      LoggingService.Test,
      PaymentService.Mock({
        processPayment: () =>
          Effect.fail(new PaymentError({ message: 'Card declined' })),
      }),
    );

    return Effect.gen(function* () {
      const result = yield* processPayment(100).pipe(Effect.either);
      expect(Either.isLeft(result)).toBe(true);
    }).pipe(Effect.provide(Layer.fresh(TestLayer))); // ✅ Always Layer.fresh
  });

  it.scoped('should process payment successfully', () => { // ✅ Always it.scoped
    const TestLayer = Layer.mergeAll(
      DatabaseService.Test,
      LoggingService.Test,
      PaymentService.Test,
    );

    return Effect.gen(function* () {
      const result = yield* processPayment(100);
      expect(result.status).toBe('success');
      expect(result.amount).toBe(100);
    }).pipe(Effect.provide(Layer.fresh(TestLayer))); // ✅ Always Layer.fresh
  });
});
```

### Layer.fresh - Test Isolation

Effect layers are memoized by default for performance. In tests, use `Layer.fresh` to create fresh instances and prevent state leakage between tests.

#### Why Layer.fresh Matters

**The Problem**: Effect layers are memoized globally by default. When multiple tests use the same layer, they share the same instance:

```typescript
// ❌ PROBLEM: Shared memoized layer
it.scoped("test 1 adds item to cache", () =>
  Effect.gen(function* () {
    const cache = yield* CacheService;
    yield* cache.set("key", "value1");
    // Cache now has: { key: "value1" }
  }).pipe(Effect.provide(CacheService.Test))
);

it.scoped("test 2 expects empty cache", () =>
  Effect.gen(function* () {
    const cache = yield* CacheService;
    const result = yield* cache.get("key");
    // ❌ FLAKY: key="value1" still exists from test 1!
    expect(Option.isNone(result)).toBe(true);
  }).pipe(Effect.provide(CacheService.Test))
);
```

**The Solution**: Wrap test layers with `Layer.fresh` to create fresh instances:

```typescript
// ✅ CORRECT: Fresh layer instance per test
it.scoped("test 1 adds item to cache", () =>
  Effect.gen(function* () {
    const cache = yield* CacheService;
    yield* cache.set("key", "value1");
    // Cache has: { key: "value1" }
  }).pipe(Effect.provide(Layer.fresh(CacheService.Test)))
);

it.scoped("test 2 expects empty cache", () =>
  Effect.gen(function* () {
    const cache = yield* CacheService;
    const result = yield* cache.get("key");
    // ✅ PASSES: Fresh cache instance, no key
    expect(Option.isNone(result)).toBe(true);
  }).pipe(Effect.provide(Layer.fresh(CacheService.Test)))
);
```

#### When to Use Layer.fresh

**Always Use** (in tests):
- ✅ Test layers (`Service.Test`)
- ✅ Inline mocks (`Layer.succeed(...)`)
- ✅ Repository tests (in-memory Map/Set storage)
- ✅ Any stateful service in tests
- ✅ Dev layers with logging or state

**Never Use** (in production):
- ❌ Production layers (`Service.Live`) - should be memoized for performance
- ❌ Non-test code - memoization is a feature, not a bug

**Quick Decision Tree**:
```
Are you in a test file?
├─ YES → Use Layer.fresh for all test layers
└─ NO  → DO NOT use Layer.fresh (keep memoization)
```

#### Pattern: Layer.fresh with Composed Layers

When composing multiple layers, wrap the entire composition:

```typescript
// Repository with mocked database
const MockDatabase = Layer.succeed(DatabaseService, {
  query: () => Effect.succeed([{ id: 1, name: "Test" }])
});

it.scoped("repository test with mock", () =>
  Effect.gen(function* () {
    const repo = yield* UserRepository;
    const users = yield* repo.findAll();
    expect(users.length).toBe(1);
  }).pipe(
    Effect.provide(Layer.fresh(
      UserRepositoryLive.pipe(Layer.provide(MockDatabase))
    ))
  )
);
```

#### Pattern: Layer.fresh with Multiple Services

Wrap each test layer individually when using multiple services:

```typescript
it.scoped("orchestration test", () =>
  Effect.gen(function* () {
    const payment = yield* PaymentService;
    const email = yield* EmailService;
    const logger = yield* LoggerService;

    yield* payment.processPayment(100);
    yield* email.sendReceipt("user@example.com");
    yield* logger.info("Payment completed");
  }).pipe(
    Effect.provide(PaymentService.Live),
    Effect.provide(Layer.fresh(EmailService.Test)),
    Effect.provide(Layer.fresh(LoggerService.Test))
  )
);
```

#### Benefits of Layer.fresh

1. **Test Isolation**: Each test starts with clean state
2. **Prevents Flaky Tests**: No state leakage between test runs
3. **Predictable Results**: Tests don't depend on execution order
4. **Minimal Cost**: 1-5ms overhead per test (worth it for reliability)
5. **Self-Documenting**: Makes test isolation explicit

#### Performance Considerations

**Overhead**: Creating fresh layers adds 1-5ms per test for in-memory layers. This is negligible compared to:
- Network I/O: 10-1000ms
- Database queries: 10-100ms
- Debugging one flaky test: 10+ minutes

**Recommendation**: Always use `Layer.fresh` for tests. The reliability benefit far outweighs the minimal performance cost.

**Reference**: [Effect Testing Guide - Layer.fresh](https://effect.website/docs/guides/testing/vitest#layer-fresh)

## Layer Dependency Visualization

### ASCII Layer Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                   Application Layer                      │
│  (Complete composition: Infra + Providers + Repos + Features) │
└─────────────────────────────────────────────────────────┘
  ▲
  │ provides
  │
┌─────────────────────────────────────────────────────────┐
│              Feature Services Layer                      │
│  PaymentService • EmailService • NotificationService    │
│  (Depends on: Repositories + Providers)                 │
└─────────────────────────────────────────────────────────┘
  ▲
  │ provides (both layers)
  │
┌──────────────────────────┬──────────────────────────────┐
│ Repository Services      │   Provider Services          │
│ ────────────────────     │   ──────────────────         │
│ UserRepository           │   StripeService              │
│ ProductRepository        │   ResendService              │
│ OrderRepository          │   SupabaseService            │
│ (Depends on: Infra)      │   (Depends on: Infra)        │
└──────────────────────────┴──────────────────────────────┘
  ▲                            ▲
  │ provides                   │ provides
  │                            │
┌─────────────────────────────────────────────────────────┐
│             Infrastructure Services Layer               │
│  ConfigService • LoggingService • DatabaseService • CacheService  │
│  (No dependencies)                                       │
└─────────────────────────────────────────────────────────┘
```

### Dependency Flow Rules

1. **Infrastructure** has NO dependencies
2. **Providers** depend ONLY on Infrastructure (optional)
3. **Repositories** depend on Infrastructure + Providers
4. **Features** depend on Repositories + Providers
5. **Application** composes all layers

### Layering Example

```typescript
// Infrastructure (no dependencies)
const InfraLayer = Layer.mergeAll(ConfigService.Live, LoggingService.Live);

// Providers (depend on infra)
const ProviderLayer = Layer.mergeAll(
  DatabaseService.Live,
  CacheService.Live,
  StripeService.Live,
).pipe(Layer.provide(InfraLayer));

// Repositories (depend on providers)
const RepositoryLayer = Layer.mergeAll(
  UserRepository.Live,
  ProductRepository.Live,
  OrderRepository.Live,
).pipe(Layer.provide(ProviderLayer));

// Features (depend on repos and providers)
const FeatureLayer = Layer.mergeAll(
  PaymentService.Live,
  EmailService.Live,
  NotificationService.Live,
).pipe(Layer.provide(Layer.merge(RepositoryLayer, ProviderLayer)));

// Complete application layer
export const AppLayer = Layer.mergeAll(
  InfraLayer,
  ProviderLayer,
  RepositoryLayer,
  FeatureLayer,
);

// For development
export const DevLayer = Layer.mergeAll(
  ConfigService.Dev,
  LoggingService.Dev,
  DatabaseService.Dev,
  CacheService.Dev,
  StripeService.Test,
  UserRepository.Live,
  ProductRepository.Live,
  OrderRepository.Live,
  PaymentService.Dev,
  EmailService.Test,
  NotificationService.Test,
);

// For testing
export const TestLayer = Layer.mergeAll(
  ConfigService.Test,
  LoggingService.Test,
  DatabaseService.Test,
  CacheService.Test,
  StripeService.Test,
  UserRepository.Test,
  ProductRepository.Test,
  OrderRepository.Test,
  PaymentService.Test,
  EmailService.Test,
  NotificationService.Test,
);
```

## Common Anti-Patterns to Avoid

### ❌ Using Context.GenericTag for Non-Generic Services

```typescript
// ❌ WRONG - Unnecessary
export const PaymentService = Context.GenericTag<PaymentServiceInterface>(
  '@feature/payment/PaymentService',
);

// ✅ CORRECT - Use Context.Tag
export class PaymentService extends Context.Tag('PaymentService')<
  PaymentService,
  PaymentServiceInterface
>() {}
```

### ❌ Using Verbose Patterns (.of(), .make())

```typescript
// ❌ WRONG - Unnecessary factory methods
export class PaymentService extends Context.Tag("PaymentService")<
  PaymentService,
  PaymentServiceInterface
>() {
  static make(stripe, database): PaymentServiceInterface {  // ❌ Avoid
    return PaymentService.of({  // ❌ Don't use .of()
      processPayment: () => /* ... */
    })
  }
}

// ✅ CORRECT - Direct object return in layer
export class PaymentService extends Context.Tag("PaymentService")<
  PaymentService,
  { readonly processPayment: (amount: number) => Effect.Effect<Payment, PaymentError> }
>() {
  static readonly Live = Layer.effect(
    this,
    Effect.gen(function* () {
      const stripe = yield* StripeService
      const database = yield* DatabaseService

      // Direct object return - no factories
      return {
        processPayment: (amount) => /* implementation */
      }
    })
  )
}
```

### ❌ Providing Dependencies in Library Layers

```typescript
// ❌ WRONG - Library provides its own dependencies
export const PaymentServiceLive = Layer.effect(
  PaymentService,
  makePaymentService,
).pipe(
  Layer.provide(StripeServiceLive), // ❌ Don't do this
  Layer.provide(DatabaseServiceLive), // ❌ Let app compose
);

// ✅ CORRECT - Let application compose dependencies
export const PaymentServiceLive = Layer.effect(
  PaymentService,
  makePaymentService,
);
```

### ❌ Type Assertions in Error Handling

```typescript
// ❌ WRONG - Type assertion
catch: (error) => error as PaymentError

// ✅ CORRECT - Proper error mapping
catch: (error) => {
  if (error instanceof Error) {
    return new PaymentError({ message: error.message });
  }
  return new PaymentError({ message: String(error) });
}
```

### ❌ Mixing Promises with Effects

```typescript
// ❌ WRONG - Mixing async/await with Effect
async function processPayment() {
  const result = await Effect.runPromise(paymentEffect);
  return result;
}

// ✅ CORRECT - Pure Effect
const processPayment = () => paymentEffect;
```

### ❌ Nested Effect.gen

```typescript
// ❌ WRONG - Nested generators are unnecessary
const processOrder = Effect.gen(function* () {
  const order = yield* getOrder();

  // ❌ Nested gen is unnecessary
  const payment = yield* Effect.gen(function* () {
    const amount = order.total;
    return yield* processPayment(amount);
  });

  return payment;
});

// ✅ CORRECT - Flat structure
const processOrder = Effect.gen(function* () {
  const order = yield* getOrder();
  const payment = yield* processPayment(order.total);
  return payment;
});
```

### ❌ Creating Runtime in Loops

```typescript
// ❌ WRONG - Creates runtime per iteration
for (const item of items) {
  await Effect.runPromise(processItem(item).pipe(Effect.provide(AppLayer)));
}

// ✅ CORRECT - Single runtime for all iterations
await Effect.runPromise(
  Effect.all(
    items.map((item) => processItem(item)),
    { concurrency: 5 },
  ).pipe(Effect.provide(AppLayer)),
);
```

### ❌ Unnecessary Type Annotations with Effect

```typescript
// ❌ WRONG - Redundant type annotation
const getUser = (
  id: string,
): Effect.Effect<User, DatabaseError, DatabaseService> =>
  Effect.gen(function* () {
    const db = yield* DatabaseService;
    return yield* db.query(/* ... */);
  });

// ✅ CORRECT - Let TypeScript infer
const getUser = (id: string) =>
  Effect.gen(function* () {
    const db = yield* DatabaseService;
    return yield* db.query(/* ... */);
  });
```

## Type Safety & Inference Patterns

### Rule 1: Leverage TypeScript Inference

**Effect inference is powerful - let it work for you:**

```typescript
// ❌ Over-annotated - unnecessary
const processPayment = (
  amount: number,
): Effect.Effect<Payment, PaymentError, PaymentService> =>
  Effect.gen(function* () {
    const service = yield* PaymentService;
    return yield* service.process(amount);
  });

// ✅ Let inference work
const processPayment = (amount: number) =>
  Effect.gen(function* () {
    const service = yield* PaymentService;
    return yield* service.process(amount);
  });
// TypeScript infers: Effect<Payment, PaymentError, PaymentService>
```

### Rule 2: Service Type Inference

**When defining services, let inference capture dependencies:**

```typescript
// Service automatically infers it needs PaymentService
const handler = (amount: number) =>
  Effect.gen(function* () {
    const service = yield* PaymentService;
    const result = yield* service.process(amount);
    return result;
  });
// Effect infers: Effect<Payment, PaymentError, PaymentService>

// Service composition automatically satisfies this:
const layer = Layer.mergeAll(PaymentService.Live, OtherService.Live);

// All dependencies are automatically provided
await Effect.runPromise(handler(100).pipe(Effect.provide(layer)));
```

### Rule 3: Error Type Inference

**Define errors properly, let Type inference create unions:**

```typescript
// Domain error
export class ProductNotFoundError extends Data.TaggedError(
  'ProductNotFoundError',
)<{
  readonly productId: string;
}> {}

// Service error
export class ServiceError extends Data.TaggedError('ServiceError')<{
  readonly message: string;
}> {}

// Effect automatically infers error union
const getProduct = (id: string) =>
  Effect.gen(function* () {
    const product = yield* findProduct(id); // Effect<Product, ProductNotFoundError>
    return yield* enrichProduct(product); // Effect<EnrichedProduct, ServiceError>
  });
// TypeScript infers: Effect<EnrichedProduct, ProductNotFoundError | ServiceError>
```

### Rule 4: Repository Interface Type Safety

**Use interfaces to enforce complete implementations:**

```typescript
// ✅ Repository interface ensures type safety
export interface UserRepositoryInterface {
  readonly findById: (id: string) => Effect.Effect<Option.Option<User>, DatabaseError>
  readonly create: (input: UserInput) => Effect.Effect<User, DatabaseError>
  readonly update: (id: string, input: Partial<UserInput>) => Effect.Effect<User, DatabaseError>
  readonly delete: (id: string) => Effect.Effect<void, DatabaseError>
}

// ✅ Service tag ensures all methods are implemented
export class UserRepository extends Context.Tag("UserRepository")<
  UserRepository,
  UserRepositoryInterface
>() {}

// TypeScript enforces ALL methods are present
export const UserRepositoryLive = Layer.effect(
  UserRepository,
  Effect.gen(function* () {
    const database = yield* DatabaseService

    return {
      findById: (id) => /* ... */,
      create: (input) => /* ... */,
      update: (id, input) => /* ... */,
      delete: (id) => /* ... */
      // ✅ Missing a method? TypeScript will error!
    }
  })
)
```

### Rule 5: Schema Validation Type Safety

**Use schemas for runtime validation AND type safety:**

```typescript
import { Schema } from 'effect';

// ✅ Single source of truth for types
export const UserSchema = Schema.Struct({
  id: Schema.String,
  email: Schema.String,
  name: Schema.String,
  createdAt: Schema.DateTimeUtc,
});

// Type is automatically derived from schema
export type User = Schema.Schema.Type<typeof UserSchema>;

// Validation is type-safe
const parseUser = (data: unknown) =>
  Effect.try({
    try: () => Schema.decodeSync(UserSchema)(data),
    catch: (error) => new ValidationError({ cause: error }),
  });
```

### Rule 6: Generic Service Type Safety

**For generic services, use proper type parameters:**

```typescript
// ✅ Generic service with proper type constraints
export const KyselyService = <DB>() =>
  Context.Tag<KyselyServiceInterface<DB>>('KyselyService');

// Usage maintains type safety
const db = KyselyService<Database>();

const query = (sql: string) =>
  Effect.gen(function* () {
    const service = yield* db;
    return yield* service.execute(sql); // SQL type-checked for Database
  });
```

### Anti-Pattern: Type Assertions

```typescript
// ❌ WRONG - Type assertion hides errors
const user = data as User; // Compiler can't catch missing fields

// ✅ CORRECT - Use schemas or proper typing
const parseUser = (data: unknown): Effect.Effect<User, ValidationError> =>
  Effect.try({
    try: () => Schema.decodeSync(UserSchema)(data),
    catch: (error) => new ValidationError({ cause: error }),
  });
```

### Type Safety Checklist

- ✅ Let TypeScript infer effect types (don't over-annotate)
- ✅ Use interfaces to enforce complete implementations
- ✅ Define errors as Data.TaggedError to create type-safe unions
- ✅ Use schemas for runtime validation AND types
- ✅ Avoid type assertions (as X) - use proper typing
- ✅ Service dependencies automatically inferred by TypeScript
- ✅ Error composition automatically creates correct union types

## Quick Lookup Table

| Pattern             | When to Use                | Syntax                                                              |
| ------------------- | -------------------------- | ------------------------------------------------------------------- |
| Context.Tag         | Non-generic services (90%) | `class Service extends Context.Tag()<Service, Interface>() {}`      |
| Effect.Service      | Services with accessors    | `class Service extends Effect.Service<Service>()("Service", {...})` |
| Context.GenericTag  | Generic services (1%)      | `const Service = <T>() => Context.GenericTag<Interface<T>>()`       |
| Inline Interface    | Services with <10 methods  | `Context.Tag()<Service, { method: () => Effect }>()`                |
| Static Live         | Production layer           | `static readonly Live = Layer.effect(this, ...)`                    |
| Static Test         | Test layer                 | `static readonly Test = Layer.succeed(this, ...)`                   |
| Static Dev          | Development layer          | `static readonly Dev = Layer.effect(this, ...)`                     |
| Static Mock         | Configurable mocks         | `static readonly Mock = (overrides?) => Layer.succeed(...)`         |
| Static Auto         | Environment-based          | `static readonly Auto = Layer.unwrapEffect(...)`                    |
| Layer.sync          | Sync creation              | `Layer.sync(this, () => implementation)`                            |
| Layer.effect        | Needs dependencies         | `Layer.effect(this, Effect.gen(...))`                               |
| Layer.scoped        | Resource cleanup           | `Layer.scoped(this, Effect.acquireRelease(...))`                    |
| Layer.succeed       | Test mocks                 | `Layer.succeed(this, mockImplementation)`                           |
| Data.TaggedError    | Runtime errors             | `class Error extends Data.TaggedError()`                            |
| Schema.TaggedError  | RPC/serializable errors    | `class Error extends Schema.TaggedError()()`                        |
| Effect.gen          | Sequential/complex         | `Effect.gen(function* () {})`                                       |
| Combinators         | Simple/parallel            | `Effect.map`, `Effect.all`, etc.                                    |
| Effect.runtime      | Preserve context           | `const runtime = yield* Effect.runtime()`                           |
| Effect.all          | Parallel execution         | `Effect.all([...], { concurrency: "unbounded" })`                   |
| Effect.runPromise   | Run in async context       | `await Effect.runPromise(program)`                                  |
| NodeRuntime.runMain | CLI apps                   | `NodeRuntime.runMain(program)`                                      |
| **Advanced Patterns** | | |
| Effect.timeout      | Timeout protection         | `effect.pipe(Effect.timeout("5 seconds"))`                          |
| Effect.retry        | Retry with backoff         | `effect.pipe(Effect.retry(Schedule.exponential("100 millis")))`     |
| filterOrFail        | Data validation            | `Effect.filterOrFail(predicate, () => error)`                       |
| parallelErrors      | Collect all errors         | `Effect.all([...]).pipe(Effect.parallelErrors)`                     |
| mapBoth             | Transform both channels    | `effect.pipe(Effect.mapBoth({ onSuccess, onFailure }))`             |
| tapErrorTag         | Observe specific errors    | `effect.pipe(Effect.tapErrorTag("ErrorType", (e) => log(e)))`       |
| Scope.addFinalizer  | Exit-aware cleanup         | `Scope.addFinalizer((exit) => Exit.match(exit, {...}))`             |
| Circuit Breaker     | Prevent cascading failures | `createCircuitBreaker(effect, threshold, resetAfter)`               |
| acquireRelease      | Resource management        | `Effect.acquireRelease(acquire, release)`                           |

**Note**: Both `Effect.Service` and `Context.Tag` are valid in Effect 3.0+. Choose based on your needs.

## Migration Guide

### From Context.GenericTag to Context.Tag

```typescript
// Before
export const MyService =
  Context.GenericTag<MyServiceInterface>('@app/MyService');

// After
export class MyService extends Context.Tag('MyService')<
  MyService,
  MyServiceInterface
>() {}
```

### From Verbose to Modern Patterns

```typescript
// ❌ OLD - Verbose pattern with factory methods
export class PaymentService extends Context.Tag('PaymentService')<
  PaymentService,
  PaymentServiceInterface
>() {
  static make(
    stripe: Stripe,
    database: DatabaseService,
  ): PaymentServiceInterface {
    return PaymentService.of({
      processPayment: () =>
        Effect.gen(function* () {
          // implementation
        }),
    });
  }
}

export const PaymentServiceLive = Layer.effect(
  PaymentService,
  Effect.gen(function* () {
    const stripe = yield* StripeService;
    const database = yield* DatabaseService;
    return PaymentService.make(stripe, database);
  }),
);

// ✅ NEW - Modern pattern with inline interface and static Live
export class PaymentService extends Context.Tag('PaymentService')<
  PaymentService,
  {
    readonly processPayment: (
      amount: number,
    ) => Effect.Effect<Payment, PaymentError>;
  }
>() {
  static readonly Live = Layer.effect(
    this,
    Effect.gen(function* () {
      const stripe = yield* StripeService;
      const database = yield* DatabaseService;

      // Direct object return - no factories
      return {
        processPayment: (amount) =>
          Effect.tryPromise({
            try: () =>
              stripe.paymentIntents.create({ amount, currency: 'usd' }),
            catch: (error) => new PaymentError({ cause: error }),
          }),
      };
    }),
  );
}
```

### Key Takeaways

1. **Prefer inline interfaces** for services with <10 methods
2. **Use static Live property** for layer definitions
3. **Return objects directly** - no .of() or .make()
4. **Both Context.Tag and Effect.Service are valid** - choose based on use case (see Decision Matrix above)
5. **Include test layers** in service definitions for better testing
6. **Effect 4.0 ready** - All patterns in this guide are stable APIs

## Testing with @effect/vitest

> **📘 Comprehensive Guide:** See [TESTING_PATTERNS.md](./TESTING_PATTERNS.md) for complete testing standards, anti-patterns, and migration guides.

The monorepo uses **@effect/vitest** for ALL testing with standardized patterns:

**Standard Pattern (Use Everywhere):**
```typescript
import { describe, expect, it } from '@effect/vitest'; // ✅ All from @effect/vitest
import { Effect, Layer } from 'effect';
import { MyService } from './my-service';

describe('MyService', () => {
  it.scoped('should perform operation', () => // ✅ Always it.scoped
    Effect.gen(function* () {
      const service = yield* MyService;
      const result = yield* service.operation();

      expect(result).toBe(expectedValue);
    }).pipe(Effect.provide(Layer.fresh(MyService.Test))) // ✅ Always Layer.fresh
  );
});
```

**Key Standards:**
- ✅ **ALL** imports from `@effect/vitest` (describe, expect, it)
- ✅ **ALL** tests use `it.scoped()` (not it.effect() or plain it())
- ✅ **ALL** layers wrapped with `Layer.fresh()` for isolation

### Basic Effect Test

### Testing with Dependencies

```typescript
import { describe, expect, it } from '@effect/vitest'; // ✅ All from @effect/vitest
import { Effect, Layer } from 'effect';

describe('ServiceWithDependencies', () => {
  const TestLayer = Layer.mergeAll(
    TestDatabaseService,
    TestCacheService,
    MyServiceLive,
  );

  it.scoped('should use injected dependencies', () => // ✅ Always it.scoped
    Effect.gen(function* () {
      const service = yield* MyService;
      const db = yield* DatabaseService;
      const cache = yield* CacheService;

      const result = yield* service.operationWithDeps();

      expect(result).toBeDefined();
    }).pipe(Effect.provide(Layer.fresh(TestLayer)))); // ✅ Always Layer.fresh
});
```

### Testing with TestClock

@effect/vitest automatically provides a TestClock for simulating time in tests:

```typescript
import { describe, expect, it } from '@effect/vitest'; // ✅ All from @effect/vitest
import { Effect, TestClock } from 'effect';

describe('TimeBasedOperations', () => {
  it.scoped('should handle time-based operations', () => // ✅ Always it.scoped
    Effect.gen(function* () {
      // Start async operation
      const fiber = yield* Effect.fork(delayedOperation());

      // Advance test clock
      yield* TestClock.adjust('1000 millis');

      // Operation completes
      const result = yield* Fiber.join(fiber);

      expect(result).toBe(expectedValue);
    }).pipe(Effect.provide(Layer.fresh(MyServiceLive)))); // ✅ Always Layer.fresh
});
```

### Testing Scoped Resources

Use `it.scoped()` for Effects that require resource management:

```typescript
import { describe, expect, it } from '@effect/vitest'; // ✅ All from @effect/vitest
import { Effect, Scope } from 'effect';

describe('ResourceManagement', () => {
  it.scoped('should manage resources', () =>
    Effect.gen(function* () {
      const resource = yield* acquireResource();
      // Resource is automatically cleaned up
      const result = yield* useResource(resource);

      expect(result).toBeDefined();
    }).pipe(Effect.provide(Layer.fresh(MyServiceLive))), // ✅ Always Layer.fresh
  );
});
```

### Testing with Live Environment

Use `it.live()` to run tests with the real (live) Effect environment without TestClock:

```typescript
import { expect, it } from '@effect/vitest'; // ✅ All from @effect/vitest
import { Effect, Layer } from 'effect';

it.live('should use real environment', () =>
  Effect.gen(function* () {
    // Uses real time, real services, etc.
    const result = yield* realServiceCall();

    expect(result).toBeDefined();
  }).pipe(Effect.provide(Layer.fresh(MyServiceLive))), // ✅ Always Layer.fresh
);
```

### Testing Error Cases

Capture errors using `Effect.exit()` to verify error handling:

```typescript
import { describe, expect, it } from '@effect/vitest'; // ✅ All from @effect/vitest
import { Effect, Exit, Layer } from 'effect';

describe('ErrorHandling', () => {
  it.scoped('should handle errors correctly', () => // ✅ Always it.scoped
    Effect.gen(function* () {
      const exit = yield* Effect.exit(failingOperation());

      expect(Exit.isFailure(exit)).toBe(true);
      if (Exit.isFailure(exit)) {
        expect(exit.cause).toStrictEqual(
          new MyError({ reason: 'ValidationFailed' }),
        );
      }
    }).pipe(Effect.provide(Layer.fresh(MyServiceLive)))); // ✅ Always Layer.fresh
});
```

### Test Control Modifiers

@effect/vitest provides modifiers for test control:

```typescript
import { it } from '@effect/vitest';
import { Effect, Layer } from 'effect';

// Run only this test (skip all others)
it.scoped.only('focused test', () => // ✅ Use it.scoped.only
  Effect.gen(function* () {
    /* ... */
  }).pipe(Effect.provide(Layer.fresh(MyService.Test))),
);

// Skip this test temporarily
it.scoped.skip('skipped test', () => // ✅ Use it.scoped.skip
  Effect.gen(function* () {
    /* ... */
  }).pipe(Effect.provide(Layer.fresh(MyService.Test))),
);

// Mark test as expected to fail
it.scoped.fails('known issue', () => // ✅ Use it.scoped.fails
  Effect.gen(function* () {
    /* ... */
  }).pipe(Effect.provide(Layer.fresh(MyService.Test))),
);
```

### Test Layer Pattern

**✅ PATTERN B (Recommended)**: Define test layers as static properties on service classes:

```typescript
// my-service.ts
import { Effect, Layer, Context } from 'effect';
import { DatabaseService } from '@samuelho-dev/infra-database';

export class MyService extends Context.Tag('MyService')<
  MyService,
  MyServiceInterface
>() {
  static readonly Live = Layer.effect(
    this,
    Effect.gen(function* () {
      const db = yield* DatabaseService;
      return {
        operation: () => db.query(/* ... */),
      };
    }),
  );

  // ✅ Pattern B: Test layer as static property
  static readonly Test = Layer.succeed(this, {
    operation: () => Effect.succeed(mockResult),
  });
}

// my-service.spec.ts - Tests use static Test property
import { describe, expect, it } from '@effect/vitest'; // ✅ All from @effect/vitest
import { Effect, Layer } from 'effect';
import { MyService } from './my-service';
import { DatabaseService } from '@samuelho-dev/infra-database';

// Compose test layers
const TestLayer = Layer.mergeAll(
  DatabaseService.Test, // ✅ Use static Test property
  MyService.Test, // ✅ Use static Test property
);

describe('MyService', () => {
  it.scoped('should work with test layer', () => // ✅ Always it.scoped
    Effect.gen(function* () {
      const service = yield* MyService;
      const result = yield* service.operation();
      expect(result).toBeDefined();
    }).pipe(Effect.provide(Layer.fresh(TestLayer)))); // ✅ Always Layer.fresh
});
```

**Alternative: Separate Test Export (Legacy)**

Only use when test layer must be in separate file:

```typescript
// my-service.test-utils.ts (separate file)
import { Layer } from 'effect';
import { DatabaseService } from '@samuelho-dev/infra-database';

// ⚠️ Less discoverable - only when test must be separate
export const TestDatabaseService = Layer.succeed(DatabaseService, {
  query: () => Effect.succeed(mockData),
  execute: () => Effect.succeed(undefined),
});
```

### Common Testing Patterns

> **📘 More Examples:** See [TESTING_PATTERNS.md](./TESTING_PATTERNS.md) for comprehensive testing patterns and anti-patterns.

**Pattern 1: Verify Service Calls**

```typescript
import { expect, it } from '@effect/vitest'; // ✅ All from @effect/vitest
import { Effect, Layer } from 'effect';

it.scoped('should call dependencies', () => // ✅ Always it.scoped
  Effect.gen(function* () {
    const service = yield* MyService;
    yield* service.operation();

    // Verify via mock/spy if needed
    expect(mockDatabase.query).toHaveBeenCalled();
  }).pipe(Effect.provide(Layer.fresh(TestLayer)))); // ✅ Always Layer.fresh
```

**Pattern 2: Test Error Recovery**

```typescript
it.scoped('should recover from errors', () => // ✅ Always it.scoped
  Effect.gen(function* () {
    const result = yield* riskyOperation().pipe(
      Effect.catchAll(() => Effect.succeed(fallbackValue)),
    );

    expect(result).toBe(fallbackValue);
  }).pipe(Effect.provide(Layer.fresh(TestLayer)))); // ✅ Always Layer.fresh
```

**Pattern 3: Test Concurrent Operations**

```typescript
it.scoped('should handle concurrent operations', () => // ✅ Always it.scoped
  Effect.gen(function* () {
    const results = yield* Effect.all(
      [operation1(), operation2(), operation3()],
      { concurrency: 'unbounded' },
    );

    expect(results).toHaveLength(3);
  }).pipe(Effect.provide(Layer.fresh(TestLayer)))); // ✅ Always Layer.fresh
```

### Configuration

Vitest configuration for Effect projects:

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
});
```

## Effect 4.0 Compatibility & Migration Guide

**Status**: Effect 4.0 is in development. These patterns are designed for Effect 3.0 with forward compatibility.

### Stable APIs (No Breaking Changes Expected)

✅ **Will remain stable in Effect 4.0**:

**Core APIs**:

- `Effect.gen` generator syntax
- `Context.Tag` service definition
- `Effect.Service` streamlined service creation (validated documentId 6206)
- `Layer` composition patterns (`Layer.effect`, `Layer.scoped`, `Layer.sync`, `Layer.succeed`)
- `Effect.runtime()` and runtime preservation pattern
- `Effect.all` for parallel operations

**Error Handling**:

- `Data.TaggedError` for domain/runtime errors (validated documentId 5672)
- `Schema.TaggedError` for RPC boundaries with serialization (validated documentId 9114)
- `Effect.try*` family (`tryPromise`, `tryPromiseInterrupt`)
- `Effect.catchAll`, `Effect.catchTag`, `Effect.catchTags`

**Concurrency**:

- `Fiber`, `FiberSet`, `FiberMap` APIs (validated documentId 6652, 6560)
- `Ref`, `SynchronizedRef` for state management (Effect 3.0+)
- `Effect.fork`, `Fiber.join`, `Fiber.interrupt`

**Observability**:

- Structured logging (`Effect.log*`, `Effect.annotateLogs`)
- Telemetry (`Effect.withSpan`, `Effect.annotateCurrentSpan`)
- OpenTelemetry integration patterns

### Potential Changes in Effect 4.0

⚠️ **Monitor for changes** (verify with official docs when Effect 4.0 releases):

- OpenTelemetry integration implementation details
- RPC implementation specifics (Effect RPC is evolving)
- Stream API improvements and optimizations
- Some internal implementation details

### Migration Strategy

When Effect 4.0 is released:

1. **Check Official Migration Guide**: Effect team will provide comprehensive migration documentation
2. **Run Type Checker**: TypeScript will catch most breaking changes automatically
3. **Test Incrementally**: Update one library type at a time (start with infra, then data-access, then features)
4. **Use Effect 4.0 Compatibility Mode**: If available, enable gradual migration mode
5. **Update Dependencies Together**: Upgrade all Effect packages simultaneously

### Forward Compatibility Best Practices

Follow these patterns to minimize migration effort when Effect 4.0 arrives:

✅ **Recommended Patterns**:

```typescript
// ✅ Use Effect.gen instead of pipe chains (more stable)
const program = Effect.gen(function* () {
  const user = yield* UserService;
  const result = yield* user.findById("123");
  return result;
});

// ❌ Avoid deep pipe chains (harder to migrate)
const program = Effect.succeed("123").pipe(
  Effect.flatMap((id) => UserService.pipe(
    Effect.flatMap((service) => service.findById(id))
  ))
);

// ✅ Use Context.Tag or Effect.Service (both stable)
export class MyService extends Context.Tag("MyService")<...>() {}
// OR
export class MyService extends Effect.Service<MyService>()("MyService", {...}) {}

// ✅ Use tagged errors
export class MyError extends Data.TaggedError("MyError")<{...}> {}

// ✅ Preserve runtime for callbacks
const runtime = yield* Effect.runtime();
callback(() => Runtime.runFork(runtime)(effect));

// ✅ Use Ref for pure state (not external state)
const state = yield* Ref.make(initialValue);
yield* Ref.update(state, (s) => newState);

// ✅ Use structured logging
yield* Effect.logInfo("Operation started").pipe(
  Effect.annotateLogs({ userId, operation: "create" })
);
```

### Resources

- **Effect 4.0 Roadmap**: https://github.com/Effect-TS/effect/discussions
- **Effect Discord**: https://discord.gg/effect-ts (fastest way to get migration help)
- **Effect Documentation**: https://effect.website
- **Effect Changelog**: https://effect.website/docs/changelog (breaking changes announced here)
- **Effect Migration Guides**: https://effect.website/docs/guides/migration (community migration guides)

### Validation Summary

All patterns in this guide have been validated against Effect 3.0+ official documentation via Effect MCP server:

- Effect.Service (documentId 6206) ✅
- Context.Tag (documentId 5628) ✅
- Data.TaggedError (documentId 5672) ✅
- Schema.TaggedError (documentId 9114) ✅
- FiberSet (documentId 6652) ✅
- FiberMap (documentId 6560) ✅
- Ref and SynchronizedRef for state management ✅
- Structured logging (documentId 7333) ✅

---

## Event Sourcing Pattern

Event sourcing captures all changes to application state as a sequence of events. This pattern is ideal for audit trails, temporal queries, and event-driven architectures.

### Event Definition with Schema

Use `Schema.TaggedRequest` for commands and `Schema.Struct` for events:

```typescript
import { Schema } from "@effect/schema";
import { Effect, Data } from "effect";

// Command (request to change state)
export class CreateUserCommand extends Schema.TaggedRequest<CreateUserCommand>()(
  "CreateUserCommand",
  {
    failure: Schema.Never, // Commands don't fail directly
    success: Schema.Struct({
      eventId: Schema.String,
      timestamp: Schema.Number,
    }),
    payload: {
      userId: Schema.String,
      email: Schema.String,
      name: Schema.String,
    },
  }
) {}

// Events (immutable facts)
export class UserCreatedEvent extends Schema.Struct({
  _tag: Schema.Literal("UserCreated"),
  eventId: Schema.String,
  aggregateId: Schema.String, // userId
  timestamp: Schema.Number,
  version: Schema.Number,
  data: Schema.Struct({
    email: Schema.String,
    name: Schema.String,
  }),
}) {}

export class UserEmailChangedEvent extends Schema.Struct({
  _tag: Schema.Literal("UserEmailChanged"),
  eventId: Schema.String,
  aggregateId: Schema.String,
  timestamp: Schema.Number,
  version: Schema.Number,
  data: Schema.Struct({
    oldEmail: Schema.String,
    newEmail: Schema.String,
  }),
}) {}

// Event union for type safety
export type UserEvent =
  | typeof UserCreatedEvent.Type
  | typeof UserEmailChangedEvent.Type;
```

### Event Store Service

```typescript
import { Context, Effect, Layer } from "effect";
import type { UserEvent } from "./events";

export interface EventStoreInterface {
  readonly append: (
    aggregateId: string,
    events: UserEvent[],
    expectedVersion: number
  ) => Effect.Effect<void, EventStoreError>;

  readonly loadEvents: (
    aggregateId: string
  ) => Effect.Effect<UserEvent[], EventStoreError>;

  readonly loadEventsSince: (
    timestamp: number
  ) => Effect.Effect<UserEvent[], EventStoreError>;
}

export class EventStore extends Context.Tag("EventStore")<
  EventStore,
  EventStoreInterface
>() {
  static readonly Live = Layer.effect(
    this,
    Effect.gen(function* () {
      const database = yield* KyselyService;

      return {
        append: (aggregateId, events, expectedVersion) =>
          Effect.gen(function* () {
            yield* database.transaction((trx) =>
              Effect.gen(function* () {
                // Optimistic concurrency check
                const currentVersion = yield* database.query((db) =>
                  db
                    .selectFrom("events")
                    .where("aggregateId", "=", aggregateId)
                    .select((eb) => eb.fn.max("version").as("maxVersion"))
                    .executeTakeFirst()
                );

                if (currentVersion?.maxVersion !== expectedVersion) {
                  return yield* Effect.fail(
                    new ConcurrencyError({
                      aggregateId,
                      expected: expectedVersion,
                      actual: currentVersion?.maxVersion ?? 0,
                    })
                  );
                }

                // Append events
                yield* database.query((db) =>
                  db
                    .insertInto("events")
                    .values(
                      events.map((event, i) => ({
                        eventId: event.eventId,
                        aggregateId,
                        eventType: event._tag,
                        eventData: JSON.stringify(event.data),
                        version: expectedVersion + i + 1,
                        timestamp: event.timestamp,
                      }))
                    )
                    .execute()
                );
              })
            );
          }),

        loadEvents: (aggregateId) =>
          Effect.gen(function* () {
            const rows = yield* database.query((db) =>
              db
                .selectFrom("events")
                .where("aggregateId", "=", aggregateId)
                .orderBy("version", "asc")
                .selectAll()
                .execute()
            );

            return rows.map((row) => ({
              _tag: row.eventType,
              eventId: row.eventId,
              aggregateId: row.aggregateId,
              timestamp: row.timestamp,
              version: row.version,
              data: JSON.parse(row.eventData),
            })) as UserEvent[];
          }),

        loadEventsSince: (timestamp) =>
          Effect.gen(function* () {
            const rows = yield* database.query((db) =>
              db
                .selectFrom("events")
                .where("timestamp", ">=", timestamp)
                .orderBy("timestamp", "asc")
                .selectAll()
                .execute()
            );

            return rows.map((row) => ({
              _tag: row.eventType,
              eventId: row.eventId,
              aggregateId: row.aggregateId,
              timestamp: row.timestamp,
              version: row.version,
              data: JSON.parse(row.eventData),
            })) as UserEvent[];
          }),
      };
    })
  );
}
```

### Event Projection Pattern

Project events into queryable read models:

```typescript
export interface UserProjection {
  readonly userId: string;
  readonly email: string;
  readonly name: string;
  readonly version: number;
  readonly createdAt: number;
  readonly updatedAt: number;
}

export class UserProjectionService extends Context.Tag("UserProjectionService")<
  UserProjectionService,
  {
    readonly project: (events: UserEvent[]) => Effect.Effect<UserProjection>;
    readonly rebuild: (userId: string) => Effect.Effect<void, ProjectionError>;
  }
>() {
  static readonly Live = Layer.effect(
    this,
    Effect.gen(function* () {
      const eventStore = yield* EventStore;
      const database = yield* KyselyService;

      return {
        project: (events) =>
          Effect.succeed(
            events.reduce((state, event) => {
              switch (event._tag) {
                case "UserCreated":
                  return {
                    userId: event.aggregateId,
                    email: event.data.email,
                    name: event.data.name,
                    version: event.version,
                    createdAt: event.timestamp,
                    updatedAt: event.timestamp,
                  };

                case "UserEmailChanged":
                  return {
                    ...state,
                    email: event.data.newEmail,
                    version: event.version,
                    updatedAt: event.timestamp,
                  };

                default:
                  return state;
              }
            }, {} as UserProjection)
          ),

        rebuild: (userId) =>
          Effect.gen(function* () {
            const events = yield* eventStore.loadEvents(userId);
            const projection = yield* this.project(events);

            yield* database.query((db) =>
              db
                .insertInto("user_projections")
                .values(projection)
                .onConflict((oc) =>
                  oc.column("userId").doUpdateSet(projection)
                )
                .execute()
            );
          }),
      };
    })
  );
}
```

### Query Pattern from Projections

```typescript
export class UserQueryService extends Context.Tag("UserQueryService")<
  UserQueryService,
  {
    readonly findById: (
      userId: string
    ) => Effect.Effect<Option.Option<UserProjection>, QueryError>;
    readonly findByEmail: (
      email: string
    ) => Effect.Effect<Option.Option<UserProjection>, QueryError>;
  }
>() {
  static readonly Live = Layer.effect(
    this,
    Effect.gen(function* () {
      const database = yield* KyselyService;

      return {
        findById: (userId) =>
          database.query((db) =>
            db
              .selectFrom("user_projections")
              .where("userId", "=", userId)
              .selectAll()
              .executeTakeFirst()
          ).pipe(Effect.map(Option.fromNullable)),

        findByEmail: (email) =>
          database.query((db) =>
            db
              .selectFrom("user_projections")
              .where("email", "=", email)
              .selectAll()
              .executeTakeFirst()
          ).pipe(Effect.map(Option.fromNullable)),
      };
    })
  );
}
```

### Event Sourcing Best Practices

**Event Design**:
- ✅ Events are immutable facts (past tense: "UserCreated", not "CreateUser")
- ✅ Include all data needed for projections (avoid database lookups)
- ✅ Use semantic versioning for event schema evolution
- ✅ Store metadata: aggregateId, version, timestamp, eventId

**Projection Strategy**:
- ✅ Project events into denormalized read models for queries
- ✅ Rebuild projections from events for data migration
- ✅ Use eventual consistency (projections may lag behind events)
- ✅ Consider CQRS: separate write (commands) and read (queries) models

**Error Handling**:
- ✅ Commands can fail before generating events
- ✅ Events are facts and cannot fail (only projection can fail)
- ✅ Handle optimistic concurrency with version checks
- ✅ Use sagas/process managers for multi-aggregate transactions

**Template References**:
- Contract event templates: `nx g contract:event`
- Event store repository: `nx g data-access:repository --event-sourced`

---

## RPC + Schema Integration

Effect RPC enables type-safe client-server communication with automatic serialization and validation using `@effect/schema` and `@effect/rpc`.

### Request/Response Schema Patterns

Define RPC requests and responses with full type safety:

```typescript
import { Schema } from "@effect/schema";
import { Rpc } from "@effect/rpc";

// Request schema with validation
export class GetUserRequest extends Schema.TaggedRequest<GetUserRequest>()(
  "GetUserRequest",
  {
    failure: Schema.Union(
      Schema.Struct({
        _tag: Schema.Literal("UserNotFound"),
        userId: Schema.String,
      }),
      Schema.Struct({
        _tag: Schema.Literal("ValidationError"),
        errors: Schema.Array(Schema.String),
      })
    ),
    success: Schema.Struct({
      id: Schema.String,
      email: Schema.String.pipe(Schema.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)),
      name: Schema.String.pipe(Schema.minLength(1)),
      createdAt: Schema.DateFromSelf,
    }),
    payload: {
      userId: Schema.String.pipe(Schema.uuid()),
    },
  }
) {}

// Batch request for multiple users
export class GetUsersRequest extends Schema.TaggedRequest<GetUsersRequest>()(
  "GetUsersRequest",
  {
    failure: Schema.Struct({
      _tag: Schema.Literal("ValidationError"),
      errors: Schema.Array(Schema.String),
    }),
    success: Schema.Array(
      Schema.Struct({
        id: Schema.String,
        email: Schema.String,
        name: Schema.String,
        createdAt: Schema.DateFromSelf,
      })
    ),
    payload: {
      userIds: Schema.Array(Schema.String.pipe(Schema.uuid())),
      includeDeleted: Schema.optional(Schema.Boolean).pipe(
        Schema.withDefault(() => false)
      ),
    },
  }
) {}

// Mutation request
export class CreateUserRequest extends Schema.TaggedRequest<CreateUserRequest>()(
  "CreateUserRequest",
  {
    failure: Schema.Union(
      Schema.Struct({
        _tag: Schema.Literal("EmailAlreadyExists"),
        email: Schema.String,
      }),
      Schema.Struct({
        _tag: Schema.Literal("ValidationError"),
        errors: Schema.Array(Schema.String),
      })
    ),
    success: Schema.Struct({
      id: Schema.String,
      email: Schema.String,
      name: Schema.String,
      createdAt: Schema.DateFromSelf,
    }),
    payload: {
      email: Schema.String.pipe(Schema.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)),
      name: Schema.String.pipe(Schema.minLength(1)),
    },
  }
) {}
```

### Error Serialization

Properly serialize errors across RPC boundary:

```typescript
import { Data } from "effect";

// Define serializable errors
export class UserNotFoundError extends Data.TaggedError("UserNotFound")<{
  userId: string;
}> {}

export class EmailAlreadyExistsError extends Data.TaggedError("EmailAlreadyExists")<{
  email: string;
}> {}

export class ValidationError extends Data.TaggedError("ValidationError")<{
  errors: string[];
}> {}

// Map domain errors to RPC schema errors
function toRpcError(error: UserServiceError) {
  switch (error._tag) {
    case "UserNotFound":
      return { _tag: "UserNotFound" as const, userId: error.userId };
    case "EmailAlreadyExists":
      return { _tag: "EmailAlreadyExists" as const, email: error.email };
    case "ValidationError":
      return { _tag: "ValidationError" as const, errors: error.errors };
  }
}
```

### Type-Safe RPC Handlers

Implement request handlers with full type safety:

```typescript
import { Context, Effect, Layer } from "effect";
import { Rpc, RpcRouter } from "@effect/rpc";
import { HttpRpcResolver } from "@effect/rpc-http";

// Define RPC router
export const UserRpcRouter = RpcRouter.make(
  // Handler for GetUserRequest
  Rpc.effect(GetUserRequest, (request) =>
    Effect.gen(function* () {
      const userService = yield* UserService;
      const user = yield* userService.findById(request.userId);

      if (Option.isNone(user)) {
        return yield* Effect.fail({
          _tag: "UserNotFound" as const,
          userId: request.userId,
        });
      }

      return {
        id: user.value.id,
        email: user.value.email,
        name: user.value.name,
        createdAt: user.value.createdAt,
      };
    })
  ),

  // Handler for GetUsersRequest
  Rpc.effect(GetUsersRequest, (request) =>
    Effect.gen(function* () {
      const userService = yield* UserService;
      const users = yield* userService.findByIds(
        request.userIds,
        request.includeDeleted
      );

      return users.map((user) => ({
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
      }));
    })
  ),

  // Handler for CreateUserRequest
  Rpc.effect(CreateUserRequest, (request) =>
    Effect.gen(function* () {
      const userService = yield* UserService;

      // Check if email exists
      const existing = yield* userService.findByEmail(request.email);
      if (Option.isSome(existing)) {
        return yield* Effect.fail({
          _tag: "EmailAlreadyExists" as const,
          email: request.email,
        });
      }

      const user = yield* userService.create({
        email: request.email,
        name: request.name,
      });

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
      };
    })
  )
);

// RPC Server Layer
export const UserRpcServerLive = Layer.effect(
  Rpc.Server,
  Effect.gen(function* () {
    return Rpc.server(UserRpcRouter);
  })
).pipe(
  Layer.provide(UserService.Live),
  Layer.provide(DatabaseService.Live)
);
```

### RPC Client Usage

Use the RPC client with full type safety:

```typescript
import { HttpRpcResolver } from "@effect/rpc-http";

// Client resolver
export const UserRpcClientLive = HttpRpcResolver.make<typeof UserRpcRouter>({
  url: "http://localhost:3000/rpc/users",
}).pipe(Layer.effect(Rpc.Resolver));

// Usage in application
const program = Effect.gen(function* () {
  const resolver = yield* Rpc.Resolver;

  // Type-safe request - compiler ensures correct payload
  const user = yield* resolver.execute(
    new GetUserRequest({ userId: "123e4567-e89b-12d3-a456-426614174000" })
  );

  console.log(user); // { id, email, name, createdAt }

  // Batch request
  const users = yield* resolver.execute(
    new GetUsersRequest({
      userIds: [
        "123e4567-e89b-12d3-a456-426614174000",
        "223e4567-e89b-12d3-a456-426614174001",
      ],
      includeDeleted: false,
    })
  );

  // Handle typed errors
  yield* resolver.execute(
    new GetUserRequest({ userId: "invalid" })
  ).pipe(
    Effect.catchTag("UserNotFound", (error) =>
      Effect.logWarning(`User ${error.userId} not found`)
    ),
    Effect.catchTag("ValidationError", (error) =>
      Effect.logError(`Validation failed: ${error.errors.join(", ")}`)
    )
  );
});
```

### RPC Best Practices

**Schema Design**:
- ✅ Use `Schema.TaggedRequest` for all RPC requests
- ✅ Define explicit success and failure schemas
- ✅ Leverage schema refinements (`.pipe(Schema.uuid())`, `.pipe(Schema.pattern(...))`)
- ✅ Use `Schema.DateFromSelf` for dates (automatic serialization)
- ✅ Provide sensible defaults with `Schema.withDefault()`

**Error Handling**:
- ✅ Use tagged unions for error types (discriminated by `_tag`)
- ✅ Map domain errors to serializable RPC errors
- ✅ Provide context in error payloads (e.g., userId, email)
- ✅ Use `Effect.catchTag` for type-safe error handling on client

**Performance**:
- ✅ Batch requests when fetching multiple resources
- ✅ Use streaming for large datasets (`Stream` instead of arrays)
- ✅ Consider pagination for list operations
- ✅ Cache resolver results when appropriate

**Security**:
- ✅ Validate all inputs with schema refinements
- ✅ Sanitize error messages (don't expose internal details)
- ✅ Use authentication middleware for protected endpoints
- ✅ Rate limit RPC endpoints

**Template References**:
- RPC route generation: `nx g feature:rpc-route`
- See contract templates for request/response schemas

---

## Client/Edge Layer Patterns

Different runtime environments (browser, edge, Node.js) require platform-specific layer implementations and exports.

### Browser-Safe Constraints

Client-side layers cannot access Node.js APIs:

```typescript
// ❌ WRONG - Node.js dependencies break in browser
import { KyselyService } from "@custom-repo/infra-kysely"; // Uses 'fs', 'path'
import { readFileSync } from "fs";

// ✅ CORRECT - Browser-safe implementation
export class ClientStorageService extends Context.Tag("ClientStorageService")<
  ClientStorageService,
  {
    readonly get: (key: string) => Effect.Effect<Option.Option<string>>;
    readonly set: (key: string, value: string) => Effect.Effect<void>;
  }
>() {
  static readonly Live = Layer.succeed(this, {
    get: (key) => Effect.sync(() => Option.fromNullable(localStorage.getItem(key))),
    set: (key, value) => Effect.sync(() => localStorage.setItem(key, value)),
  });
}
```

### Edge Runtime Limitations

Edge runtimes (Cloudflare Workers, Vercel Edge) have additional restrictions:

```typescript
// ❌ WRONG - These don't work in edge runtime
import { createServer } from "http"; // Not available
import { Pool } from "pg"; // TCP not available
import fs from "fs"; // File system not available

// ✅ CORRECT - Edge-compatible patterns
export class EdgeCacheService extends Context.Tag("EdgeCacheService")<
  EdgeCacheService,
  {
    readonly get: (key: string) => Effect.Effect<Option.Option<string>>;
    readonly set: (key: string, value: string, ttl: number) => Effect.Effect<void>;
  }
>() {
  static readonly Live = Layer.effect(
    this,
    Effect.gen(function* () {
      // Use platform-provided KV storage
      const kv = yield* Effect.sync(() => globalThis.KV_NAMESPACE);

      return {
        get: (key) =>
          Effect.tryPromise({
            try: () => kv.get(key),
            catch: () => new CacheError({ key }),
          }).pipe(Effect.map(Option.fromNullable)),

        set: (key, value, ttl) =>
          Effect.tryPromise({
            try: () => kv.put(key, value, { expirationTtl: ttl }),
            catch: () => new CacheError({ key }),
          }),
      };
    })
  );
}
```

### Platform-Specific Exports

Structure exports for different platforms:

```typescript
// src/index.ts (main entry - server only)
export * from "./server";

// src/server.ts (Node.js server)
export { UserService } from "./lib/service";
export { UserServiceLive, UserServiceTest } from "./lib/layers";
export { UserRepository } from "./lib/repository"; // Uses Kysely

// src/client.ts (browser-safe)
export { UserService } from "./lib/service"; // Service tag only
export type * from "./lib/types"; // Types only
export { UserValidationError } from "./lib/errors"; // Serializable errors

// ❌ DON'T export in client.ts:
// - Layers that use Node.js APIs
// - Database repositories
// - File system operations

// src/edge.ts (edge runtime)
export { UserService } from "./lib/service";
export { UserServiceEdge } from "./lib/layers-edge"; // Edge-specific layer
export type * from "./lib/types";
```

### Service Availability by Platform

| Service Type | Server | Client | Edge |
|--------------|--------|--------|------|
| **Contract (types, errors)** | ✅ | ✅ | ✅ |
| **Data-Access (repositories)** | ✅ | ❌ | ❌ |
| **Feature (business logic)** | ✅ | ✅* | ✅* |
| **Infra (Kysely, logging)** | ✅ | ❌ | ❌ |
| **Provider (external SDKs)** | ✅ | ⚠️** | ⚠️** |

\* Feature layers must not depend on server-only infra
\*\* Only if SDK is platform-compatible

### Client Layer Implementation Example

```typescript
// lib/layers-client.ts
export const UserServiceClient = Layer.effect(
  UserService,
  Effect.gen(function* () {
    // Client uses RPC to call server
    const rpcClient = yield* RpcClient;

    return {
      findById: (id) =>
        rpcClient.execute(new GetUserRequest({ userId: id })),

      create: (data) =>
        rpcClient.execute(new CreateUserRequest(data)),
    };
  })
);
```

**Best Practices**:
- ✅ Use conditional exports in package.json for platform targeting
- ✅ Test client/edge builds separately (`vitest --environment jsdom`)
- ✅ Document platform constraints in service headers
- ✅ Use type-only imports (`import type`) in client code when possible

**Template References**:
- Client exports: Generated automatically in `src/client.ts`
- Edge exports: Generated automatically in `src/edge.ts` (when applicable)

---

## Configuration Patterns

Manage environment-specific configuration with Effect's Config system and Context.Tag.

### Config Tag Setup

```typescript
import { Config, Context, Effect, Layer } from "effect";
import { Schema } from "@effect/schema";

// Define config schema
export class AppConfigSchema extends Schema.Struct({
  port: Schema.Number.pipe(Schema.int(), Schema.greaterThan(0)),
  logLevel: Schema.Literal("debug", "info", "warn", "error"),
  databaseUrl: Schema.String.pipe(Schema.minLength(1)),
  apiKey: Schema.String.pipe(Schema.minLength(10)),
  timeout: Schema.Number.pipe(Schema.int(), Schema.greaterThan(0)),
}) {}

export type AppConfig = typeof AppConfigSchema.Type;

// Config service tag
export class AppConfigService extends Context.Tag("AppConfigService")<
  AppConfigService,
  AppConfig
>() {
  // Load from environment variables
  static readonly Live = Layer.effect(
    this,
    Effect.gen(function* () {
      const config = yield* Config.all({
        port: Config.number("PORT").pipe(Config.withDefault(3000)),
        logLevel: Config.literal("debug", "info", "warn", "error")("LOG_LEVEL")
          .pipe(Config.withDefault("info" as const)),
        databaseUrl: Config.string("DATABASE_URL"),
        apiKey: Config.secret("API_KEY").pipe(Config.map((secret) => secret.value)),
        timeout: Config.number("TIMEOUT").pipe(Config.withDefault(30000)),
      });

      // Validate with schema
      return yield* Schema.decode(AppConfigSchema)(config);
    })
  );

  // Test config
  static readonly Test = Layer.succeed(this, {
    port: 3001,
    logLevel: "debug",
    databaseUrl: "postgresql://test:test@localhost:5432/test",
    apiKey: "test-api-key",
    timeout: 5000,
  });
}
```

### Environment-Based Configuration

```typescript
// Development overrides
export const AppConfigDev = Layer.effect(
  AppConfigService,
  Effect.gen(function* () {
    const base = yield* AppConfigService.Live.pipe(
      Layer.build,
      Effect.map((ctx) => Context.get(ctx, AppConfigService))
    );

    return {
      ...base,
      logLevel: "debug" as const,
      timeout: 60000, // Longer timeouts for debugging
    };
  })
);

// Production hardening
export const AppConfigProd = Layer.effect(
  AppConfigService,
  Effect.gen(function* () {
    const base = yield* AppConfigService.Live.pipe(
      Layer.build,
      Effect.map((ctx) => Context.get(ctx, AppConfigService))
    );

    // Validate required production settings
    if (!base.apiKey || base.apiKey === "test-api-key") {
      return yield* Effect.fail(new ConfigError("Production API key required"));
    }

    return base;
  })
);
```

### Configuration Composition

```typescript
// Service-specific config
export class DatabaseConfig extends Schema.Struct({
  url: Schema.String,
  maxConnections: Schema.Number,
  connectionTimeout: Schema.Number,
}) {}

export class DatabaseConfigService extends Context.Tag("DatabaseConfigService")<
  DatabaseConfigService,
  typeof DatabaseConfig.Type
>() {
  // Derive from app config
  static readonly Live = Layer.effect(
    this,
    Effect.gen(function* () {
      const appConfig = yield* AppConfigService;

      return {
        url: appConfig.databaseUrl,
        maxConnections: 10,
        connectionTimeout: appConfig.timeout,
      };
    })
  ).pipe(Layer.provide(AppConfigService.Live));
}
```

**Best Practices**:
- ✅ Use Config.secret for sensitive values (never logged)
- ✅ Provide defaults with Config.withDefault
- ✅ Validate all config with @effect/schema
- ✅ Use Config.all for loading multiple values atomically
- ✅ Derive service configs from app config for consistency

---

## Pagination Patterns

Implement efficient pagination for repository queries.

### Offset/Limit Pagination

```typescript
export interface PaginationParams {
  readonly page: number; // 1-indexed
  readonly limit: number;
}

export interface PaginatedResult<T> {
  readonly data: readonly T[];
  readonly page: number;
  readonly limit: number;
  readonly total: number;
  readonly totalPages: number;
}

// Repository operation
findAll: (params: PaginationParams) =>
  Effect.gen(function* () {
    const database = yield* KyselyService;
    const offset = (params.page - 1) * params.limit;

    const [data, countResult] = yield* Effect.all([
      database.query((db) =>
        db
          .selectFrom("users")
          .selectAll()
          .limit(params.limit)
          .offset(offset)
          .execute()
      ),
      database.query((db) =>
        db
          .selectFrom("users")
          .select((eb) => eb.fn.countAll().as("count"))
          .executeTakeFirst()
      ),
    ]);

    const total = Number(countResult?.count ?? 0);

    return {
      data,
      page: params.page,
      limit: params.limit,
      total,
      totalPages: Math.ceil(total / params.limit),
    };
  })
```

### Cursor-Based Pagination

More efficient for large datasets:

```typescript
export interface CursorParams {
  readonly cursor?: string; // Last seen ID
  readonly limit: number;
}

export interface CursorResult<T> {
  readonly data: readonly T[];
  readonly nextCursor: string | null;
  readonly hasMore: boolean;
}

// Repository operation with cursor
findAllCursor: (params: CursorParams) =>
  Effect.gen(function* () {
    const database = yield* KyselyService;

    const data = yield* database.query((db) => {
      let query = db
        .selectFrom("users")
        .selectAll()
        .orderBy("id", "asc")
        .limit(params.limit + 1); // Fetch one extra to check hasMore

      if (params.cursor) {
        query = query.where("id", ">", params.cursor);
      }

      return query.execute();
    });

    const hasMore = data.length > params.limit;
    const results = hasMore ? data.slice(0, -1) : data;
    const nextCursor = hasMore ? results[results.length - 1].id : null;

    return {
      data: results,
      nextCursor,
      hasMore,
    };
  })
```

**Best Practices**:
- ✅ Use cursor pagination for infinite scroll / real-time feeds
- ✅ Use offset pagination for traditional page navigation
- ✅ Always include total count for offset pagination
- ✅ Index cursor columns for performance
- ✅ Validate page/limit parameters (max limit 100)

---

## Testing Patterns Deep Dive

Advanced Effect testing patterns with Layer.fresh and test composition.

### Layer.fresh for Test Isolation

```typescript
import { it } from "@effect/vitest";
import { Effect, Layer } from "effect";

describe("UserService", () => {
  // ✅ CORRECT - Each test gets fresh layer
  it.effect("creates user", () =>
    Effect.gen(function* () {
      const service = yield* UserService;
      const user = yield* service.create({ email: "test@example.com" });
      expect(user.id).toBeDefined();
    }).pipe(Effect.provide(Layer.fresh(UserService.Test)))
  );

  // ✅ CORRECT - Tests are isolated
  it.effect("finds user by ID", () =>
    Effect.gen(function* () {
      const service = yield* UserService;
      const created = yield* service.create({ email: "test@example.com" });
      const found = yield* service.findById(created.id);
      expect(Option.isSome(found)).toBe(true);
    }).pipe(Effect.provide(Layer.fresh(UserService.Test)))
  );
});
```

### Test Layer Composition

```typescript
// Compose multiple test layers
const TestLayers = Layer.mergeAll(
  Layer.fresh(UserService.Test),
  Layer.fresh(EmailService.Test),
  Layer.fresh(LoggingService.Test)
);

it.effect("registers user and sends email", () =>
  Effect.gen(function* () {
    const userService = yield* UserService;
    const emailService = yield* EmailService;

    const user = yield* userService.create({ email: "test@example.com" });
    yield* emailService.sendWelcome(user.email);

    // Verify email was sent (mock tracks calls)
    const sent = yield* emailService.getSentEmails();
    expect(sent).toHaveLength(1);
  }).pipe(Effect.provide(TestLayers))
);
```

### Integration Testing with Real Database

```typescript
// Integration test layer with test database
const IntegrationLayers = Layer.mergeAll(
  UserRepository.Live, // Real repository
  KyselyService.Test, // Test database connection
  LoggingService.Test
);

describe("UserRepository Integration", () => {
  beforeEach(async () => {
    // Migrate test database
    await Effect.runPromise(
      migrateDatabase.pipe(Effect.provide(KyselyService.Test))
    );
  });

  it.effect("persists user to database", () =>
    Effect.gen(function* () {
      const repo = yield* UserRepository;
      const user = yield* repo.create({ email: "test@example.com" });

      // Verify in database
      const found = yield* repo.findById(user.id);
      expect(Option.isSome(found)).toBe(true);
    }).pipe(Effect.provide(IntegrationLayers))
  );
});
```

**Best Practices**:
- ✅ Always use Layer.fresh in tests for isolation
- ✅ Use Layer.succeed for Test layers (not Layer.effect)
- ✅ Compose test layers with Layer.mergeAll
- ✅ Separate unit tests (mocks) from integration tests (real deps)
- ✅ Use @effect/vitest for Effect-aware assertions

---

## Error Handling by Operation Type

Different operation types require specific error handling strategies.

### CRUD Operation Errors

```typescript
// Create - Handle conflicts
create: (input) =>
  Effect.gen(function* () {
    const database = yield* KyselyService;

    return yield* database.query((db) =>
      db.insertInto("users").values(input).returning("id").executeTakeFirst()
    ).pipe(
      Effect.catchTag("DatabaseError", (error) => {
        if (error.code === "23505") { // Unique violation
          return Effect.fail(new EmailAlreadyExistsError({ email: input.email }));
        }
        return Effect.fail(new DatabaseError({ cause: error }));
      })
    );
  })

// Read - Handle not found
findById: (id) =>
  database.query((db) =>
    db.selectFrom("users").where("id", "=", id).selectAll().executeTakeFirst()
  ).pipe(
    Effect.map(Option.fromNullable),
    Effect.catchAll(() => Effect.succeed(Option.none()))
  )

// Update - Handle not found + conflicts
update: (id, input) =>
  Effect.gen(function* () {
    const existing = yield* findById(id);
    if (Option.isNone(existing)) {
      return yield* Effect.fail(new UserNotFoundError({ id }));
    }

    return yield* database.query((db) =>
      db.updateTable("users").set(input).where("id", "=", id).execute()
    );
  })

// Delete - Idempotent
delete: (id) =>
  database.query((db) =>
    db.deleteFrom("users").where("id", "=", id).execute()
  ).pipe(Effect.asVoid) // Don't fail if already deleted
```

### Schema Validation Errors

```typescript
import { Schema } from "@effect/schema";

const UserSchema = Schema.Struct({
  email: Schema.String.pipe(Schema.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)),
  age: Schema.Number.pipe(Schema.int(), Schema.greaterThanOrEqualTo(18)),
});

create: (input) =>
  Effect.gen(function* () {
    // Validate input
    const validated = yield* Schema.decode(UserSchema)(input).pipe(
      Effect.mapError((error) =>
        new ValidationError({
          errors: error.message.split("\n"),
        })
      )
    );

    return yield* createUser(validated);
  })
```

### External Service Errors

```typescript
// Retry with exponential backoff
callExternalAPI: (url) =>
  Effect.tryPromise({
    try: () => fetch(url),
    catch: (error) => new APIError({ cause: error }),
  }).pipe(
    Effect.retry({
      times: 3,
      schedule: Schedule.exponential("100 millis"),
    }),
    Effect.timeout("5 seconds"),
    Effect.catchAll((error) =>
      Effect.logError(`API call failed: ${error}`).pipe(
        Effect.flatMap(() => Effect.fail(new ExternalServiceError({ url })))
      )
    )
  )
```

### Error Recovery Patterns

```typescript
// Fallback to default
getUserPreferences: (userId) =>
  loadFromDatabase(userId).pipe(
    Effect.orElse(() => Effect.succeed(defaultPreferences))
  )

// Retry with alternative
fetchData: (id) =>
  primaryAPI.fetch(id).pipe(
    Effect.orElse(() => backupAPI.fetch(id)),
    Effect.orElse(() => cache.get(id))
  )

// Collect all errors
validateAll: (inputs) =>
  Effect.forEach(inputs, validate, { mode: "either" }).pipe(
    Effect.flatMap((results) => {
      const errors = results.filter(Either.isLeft);
      if (errors.length > 0) {
        return Effect.fail(new BatchValidationError({ errors }));
      }
      return Effect.succeed(results.map((r) => r.right));
    })
  )
```

**Best Practices**:
- ✅ Use tagged errors for type-safe error handling
- ✅ Map database errors to domain errors
- ✅ Validate early with Schema.decode
- ✅ Use retries for transient failures
- ✅ Provide fallbacks for non-critical failures
- ✅ Log errors before recovery

**Template References**:
- Error definitions: Generated in `lib/errors.ts`
- See repository operation templates for CRUD error patterns

---

## Decision Matrices & Quick Reference

### Master Decision Tree: Choosing the Right Pattern

This section provides comprehensive decision matrices to help you choose the right Effect pattern for your use case.

#### 1. When Working With Single Values

| I Want To... | Use | Why |
|--------------|-----|-----|
| Transform a successful value | `Effect.map` | Non-effectful transformation |
| Transform a successful value with an Effect | `Effect.flatMap` / `Effect.andThen` | Effectful transformation |
| Transform an error | `Effect.mapError` | Change error type |
| Observe success without changing value | `Effect.tap` | Logging, metrics, side effects |
| Observe specific error without handling | `Effect.tapError` / `Effect.tapErrorTag` | Error logging, metrics |
| Handle specific error and recover | `Effect.catchTag` | Selective recovery |
| Handle all errors and recover | `Effect.catchAll` | Universal recovery |
| Provide fallback on error | `Effect.orElse` | Alternative computation |
| Retry on failure | `Effect.retry` | Transient failures |
| Timeout an operation | `Effect.timeout` | Prevent hanging |

#### 2. When Working With Multiple Values

| I Want To... | Use | Why |
|--------------|-----|-----|
| Run effects in parallel | `Effect.all([...], { concurrency: "unbounded" })` | Maximum speed |
| Run with concurrency limit | `Effect.all([...], { concurrency: N })` | Resource control |
| Run sequentially | `Effect.all([...], { concurrency: 1 })` | Order matters |
| Run and collect all results | `Effect.all` with default options | Standard batch operation |
| Run but ignore some failures | `Effect.allSuccesses` | Partial success OK |
| Stop on first success | `Effect.race` | First wins |
| Run in specific order | `Effect.forEach` with `{ concurrency: 1 }` | Sequential iteration |
| Process stream of unknown size | `Stream.fromIterable` + operators | Constant memory |

#### 3. When Working With Conditionals

| I Want To... | Use | Why |
|--------------|-----|-----|
| Branch based on a value | Plain `if/else` | Simple, readable |
| Branch based on an Effect | `Effect.if` / `Effect.gen` with `if` | Unwrap Effect first |
| Execute only if condition is true | `Effect.when` | Conditional execution |
| Execute only if condition is false | `Effect.unless` | Inverted guard |
| Pattern match on tagged union | `Effect.gen` with `switch` | Type-safe branching |

#### 4. When Working With Resources

| I Want To... | Use | Why |
|--------------|-----|-----|
| Acquire and release automatically | `Effect.acquireRelease` | Cleanup guaranteed |
| Acquire with scoped lifetime | `Layer.scoped` + `Effect.acquireRelease` | Layer-managed resources |
| Share resource across operations | `Layer.scoped` | Single instance |
| Different cleanup based on success/failure | `Scope.addFinalizer` with `Exit.match` | Conditional cleanup |

#### 5. When Working With Concurrency

| I Want To... | Use | Why |
|--------------|-----|-----|
| Run effect in background | `Effect.fork` | Fire-and-forget |
| Run with scoped lifetime | `Effect.forkScoped` | Auto-cleanup |
| Wait for background effect | `Fiber.join` | Synchronize |
| Limit concurrent operations | `Effect.makeSemaphore(N)` + `withPermits` | Resource limiting |
| Queue background jobs | `Queue.bounded` + processor fiber | Backpressure control |
| Broadcast events to subscribers | `PubSub` | Event distribution |
| Wait for initialization | `Latch` | One-time gate |
| Pass value between fibers | `Deferred` | Fiber coordination |

#### 6. When Working With Data

| I Want To... | Use | Why |
|--------------|-----|-----|
| Handle nullable values | `Option` | Type-safe nullability |
| Handle errors as values | `Either` | Explicit error handling |
| Validate and parse | `Schema.decode` | Automatic validation |
| Large/infinite datasets | `Stream` | Constant memory |
| Paginated API responses | `Stream.paginateEffect` | Auto-pagination |

---

### Quick Reference: Operator Comparison

#### Transformation Operators

| Operator | Input → Output | When To Use | Example |
|----------|---------------|-------------|---------|
| `Effect.map` | `A → B` | Transform success value | `Effect.map(user => user.name)` |
| `Effect.flatMap` | `A → Effect<B>` | Chain dependent effects | `Effect.flatMap(id => repo.findById(id))` |
| `Effect.andThen` | `A → Effect<B>` / `B` | Chain any computation | `Effect.andThen(() => nextOp())` |
| `Effect.mapError` | `E → E2` | Transform error | `Effect.mapError(err => new CustomError(err))` |

#### Observability Operators

| Operator | Observes | Continues With | Example |
|----------|----------|---------------|---------|
| `Effect.tap` | Success value | Original value | `Effect.tap(v => logger.info("success", v))` |
| `Effect.tapError` | Any error | Original error | `Effect.tapError(e => logger.error("failed", e))` |
| `Effect.tapErrorTag` | Tagged error | Original error | `Effect.tapErrorTag("NotFound", e => log(e))` |

#### Error Handling Operators

| Operator | Catches | Returns | Short-Circuits |
|----------|---------|---------|----------------|
| `Effect.catchAll` | All errors | Recovery effect | No |
| `Effect.catchTag` | Tagged error | Recovery effect | No |
| `Effect.orElse` | All errors | Alternative effect | No |
| `Effect.retry` | All errors | Retried effect | After retries exhausted |

#### Control Flow Operators

| Operator | Use Case | Returns |
|----------|----------|---------|
| `Effect.if` | Binary branching on Effect | Result of true/false branch |
| `Effect.when` | Conditional execution | `void` if false, result if true |
| `Effect.unless` | Inverted guard | `void` if true, result if false |
| `Effect.zip` | Combine two effects | `[A, B]` tuple |
| `Effect.zipWith` | Combine with custom function | `C` from `(A, B) => C` |

#### Batch Operators

| Operator | Behavior | Use Case |
|----------|----------|----------|
| `Effect.all` | Fail on any error | All must succeed |
| `Effect.allSuccesses` | Collect only successes | Partial success OK |
| `Effect.race` | First to complete wins | Fastest wins |
| `Effect.forEach` | Iterate with options | Sequential or parallel iteration |

---

### Pattern Selection Flowchart

```
START: I need to...

├─ Work with a single Effect
│  ├─ Transform the value
│  │  ├─ Transformation is pure → Effect.map
│  │  └─ Transformation needs Effect → Effect.flatMap
│  ├─ Handle errors
│  │  ├─ Transform error type → Effect.mapError
│  │  ├─ Recover from specific error → Effect.catchTag
│  │  ├─ Recover from any error → Effect.catchAll
│  │  └─ Just observe error → Effect.tapError
│  ├─ Add observability
│  │  ├─ Log/metrics on success → Effect.tap
│  │  └─ Log/metrics on error → Effect.tapErrorTag
│  └─ Control timing
│     ├─ Retry on failure → Effect.retry
│     ├─ Add timeout → Effect.timeout
│     └─ Run in background → Effect.fork

├─ Work with multiple Effects
│  ├─ All in parallel
│  │  ├─ Unbounded concurrency → Effect.all (default)
│  │  ├─ Limited concurrency → Effect.all({ concurrency: N })
│  │  └─ Partial failures OK → Effect.allSuccesses
│  ├─ One at a time (sequential)
│  │  └─ Effect.all({ concurrency: 1 })
│  └─ Race to completion
│     └─ Effect.race

├─ Work with large datasets
│  ├─ Known size, fits in memory → Array + Effect.all
│  ├─ Unknown size / large → Stream.fromIterable
│  └─ Paginated API → Stream.paginateEffect

├─ Work with background tasks
│  ├─ Simple fire-and-forget → Effect.fork
│  ├─ Need cleanup → Effect.forkScoped
│  ├─ Queue-based processing → Queue + processor fiber
│  └─ Event broadcasting → PubSub

└─ Work with resources
   ├─ Simple acquire/release → Effect.acquireRelease
   ├─ Share across operations → Layer.scoped
   └─ Conditional cleanup → Scope.addFinalizer

```

---

### Anti-Pattern Recognition Guide

#### ❌ Anti-Pattern: Manual Effect Running in Library Code

```typescript
// ❌ WRONG: Never run effects in library code
export const getUserName = (id: string): string => {
  return Effect.runSync(repo.findById(id).pipe(
    Effect.map(user => user.name)
  ));
};

// ✅ CORRECT: Return Effect, let caller run it
export const getUserName = (id: string): Effect.Effect<string, UserError> =>
  repo.findById(id).pipe(Effect.map(user => user.name));
```

**Why**: Library code should return Effects, not run them. Only application boundaries (main, route handlers) should run effects.

---

#### ❌ Anti-Pattern: Swallowing Errors Without Logging

```typescript
// ❌ WRONG: Silent error suppression
const result = yield* operation().pipe(
  Effect.catchAll(() => Effect.succeed(null))
);

// ✅ CORRECT: Log before recovering
const result = yield* operation().pipe(
  Effect.tapError((error) => logger.error("Operation failed", { error })),
  Effect.catchAll(() => Effect.succeed(null))
);
```

**Why**: Silent failures make debugging impossible. Always observe errors before recovery.

---

#### ❌ Anti-Pattern: Unbounded Concurrency for External APIs

```typescript
// ❌ WRONG: No concurrency limit
yield* Effect.all(
  userIds.map(id => stripe.createCharge({ userId: id }))
);

// ✅ CORRECT: Bounded concurrency
yield* Effect.all(
  userIds.map(id => stripe.createCharge({ userId: id })),
  { concurrency: 5 } // Max 5 concurrent API calls
);
```

**Why**: Unbounded concurrency can overwhelm external services, cause rate limiting (429 errors), or exhaust resources.

---

#### ❌ Anti-Pattern: Using flatMap When map Is Sufficient

```typescript
// ❌ WRONG: Unnecessary Effect wrapping
const names = yield* users.pipe(
  Effect.flatMap((users) => Effect.succeed(users.map(u => u.name)))
);

// ✅ CORRECT: Use map for pure transformations
const names = yield* users.pipe(
  Effect.map((users) => users.map(u => u.name))
);
```

**Why**: `flatMap` is for effectful transformations. Use `map` for pure transformations.

---

#### ❌ Anti-Pattern: Loading Large Datasets Into Memory

```typescript
// ❌ WRONG: Load all 100,000 items into memory
const allUsers = yield* repo.findAll();
yield* Effect.forEach(allUsers, processUser);

// ✅ CORRECT: Stream for constant memory
yield* repo.streamAll({ batchSize: 100 }).pipe(
  Stream.mapEffect(processUser),
  Stream.runDrain
);
```

**Why**: Arrays load everything into memory. Streams process items one-at-a-time with constant memory.

---

#### ❌ Anti-Pattern: Using try/catch Instead of Effect Error Handling

```typescript
// ❌ WRONG: Mixing try/catch with Effects
try {
  const user = yield* repo.findById(id);
  return user;
} catch (error) {
  return null;
}

// ✅ CORRECT: Use Effect operators
const user = yield* repo.findById(id).pipe(
  Effect.catchAll((error) => Effect.succeed(null))
);
```

**Why**: try/catch doesn't work with Effect errors. Use Effect's error handling operators.

---

#### ❌ Anti-Pattern: Not Using Type-Safe Error Handling

```typescript
// ❌ WRONG: Catch all errors the same way
const result = yield* operation().pipe(
  Effect.catchAll((error) => {
    if (error.message.includes("not found")) {
      return handleNotFound();
    }
    return handleOther();
  })
);

// ✅ CORRECT: Use catchTag for type-safe error handling
const result = yield* operation().pipe(
  Effect.catchTag("NotFoundError", () => handleNotFound()),
  Effect.catchTag("ValidationError", () => handleValidation()),
  Effect.catchAll((error) => handleUnexpected(error))
);
```

**Why**: Tagged errors provide type safety and clear intent. String matching is error-prone.

---

#### ❌ Anti-Pattern: Creating Effects Inside map

```typescript
// ❌ WRONG: Effects inside map aren't executed
const results = yield* Effect.succeed([1, 2, 3]).pipe(
  Effect.map((nums) => nums.map(n => repo.findById(n))) // Returns Effect[]
);

// ✅ CORRECT: Use forEach or flatMap
const results = yield* Effect.forEach([1, 2, 3], (n) => repo.findById(n));
```

**Why**: `map` doesn't execute Effects. Use `forEach`, `all`, or `flatMap` for effectful operations.

---

#### ❌ Anti-Pattern: Manual Resource Cleanup

```typescript
// ❌ WRONG: Manual cleanup is error-prone
const conn = yield* createConnection();
try {
  const result = yield* conn.query("...");
  yield* conn.close();
  return result;
} catch (error) {
  yield* conn.close(); // Cleanup in catch too!
  throw error;
}

// ✅ CORRECT: Use Effect.acquireRelease
const result = yield* Effect.acquireRelease(
  createConnection(),
  (conn) => conn.close()
).pipe(
  Effect.flatMap((conn) => conn.query("..."))
);
```

**Why**: acquireRelease guarantees cleanup even on errors/interrupts. Manual cleanup is error-prone.

---

### Decision Matrix: Stream vs Array vs Queue

| Scenario | Use | Reason |
|----------|-----|--------|
| Fixed list of items that fits in memory | `Array` + `Effect.all` | Simple, fast |
| 1000+ items to process | `Stream` | Constant memory |
| Unknown number of items | `Stream` | Handles unbounded data |
| Paginated API responses | `Stream.paginateEffect` | Auto-pagination |
| Background job queue | `Queue` + processor | Backpressure control |
| Real-time event stream | `Stream` or `PubSub` | Continuous data |
| Need to share events with multiple consumers | `PubSub` | Fan-out |

---

### Decision Matrix: Layer Patterns

| Scenario | Pattern | Example |
|----------|---------|---------|
| Service with no resources | `Layer.succeed` | Pure mock/test service |
| Service with initialization | `Layer.effect` | Config loading |
| Service with cleanup | `Layer.scoped` | Database connections |
| Service depends on others | `Layer.effect` + `yield*` deps | Compose dependencies |
| Different implementations per environment | Static layers (Live/Test/Dev) | Environment-based |
| Share single instance | `Layer.scoped` | Connection pools |

---

### Common Use Case → Pattern Mapping

| Use Case | Pattern | Code Snippet |
|----------|---------|--------------|
| Fetch user by ID | `Effect.flatMap` | `Effect.flatMap(id => repo.findById(id))` |
| Load dashboard (parallel) | `Effect.all` | `Effect.all({ user, notifications, activity })` |
| Process batch with limit | `Effect.all + concurrency` | `Effect.all(items, { concurrency: 5 })` |
| Retry failed API call | `Effect.retry` | `Effect.retry(call, { times: 3 })` |
| Timeout slow operation | `Effect.timeout` | `Effect.timeout(op, "5 seconds")` |
| Log successful operation | `Effect.tap` | `Effect.tap(v => logger.info("done", v))` |
| Transform repository error | `Effect.mapError` | `Effect.mapError(e => new ServiceError(e))` |
| Handle not found | `Effect.catchTag` | `Effect.catchTag("NotFound", () => ...)` |
| Stream large dataset | `Stream.paginateEffect` | `repo.streamAll({ batchSize: 100 })` |
| Background job queue | `Queue + forkScoped` | `Queue.bounded(1000) + processor` |
| Database transaction | `Effect.acquireRelease` | `acquireRelease(begin, commit/rollback)` |

---

**Navigation Tips:**
- Start with "Master Decision Tree" for high-level guidance
- Use "Quick Reference" tables for operator comparisons
- Check "Anti-Pattern Recognition" if something feels wrong
- Refer to "Common Use Cases" for real-world examples

---
