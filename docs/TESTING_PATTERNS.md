# Testing Patterns with @effect/vitest

## Quick Reference

ALL test files in this codebase follow these standardized patterns for consistency and best practices.

### Standard Imports (Always from @effect/vitest)

```typescript
import { describe, expect, it } from "@effect/vitest"
import { Effect, Layer } from "effect"
```

### Standard Test Pattern (Always use it.scoped)

```typescript
it.scoped("test description", () =>
  Effect.gen(function* () {
    const service = yield* ServiceName;
    const result = yield* service.method();
    expect(result).toBeDefined();
  }).pipe(Effect.provide(Layer.fresh(ServiceName.Test)))
);
```

---

## Why These Patterns?

### Why @effect/vitest for ALL imports?

**Reason 1: Consistent Import Source**
- Reduces mental overhead - one import source for all test utilities
- Prevents confusion about which package provides which function
- Easier to grep/search for test utilities across the codebase

**Reason 2: Enhanced Error Messages**
- `@effect/vitest` provides Effect-aware error formatting
- Stack traces show Effect generators properly
- Failure messages include Effect context information

**Reason 3: Better Effect Runtime Integration**
- Test utilities understand Effect's execution model
- Automatic handling of Scope management
- Proper integration with Layer.fresh

**Reason 4: Type Safety Improvements**
- Better type inference for Effect-based tests
- Catches more errors at compile time
- IntelliSense works better with Effect patterns

---

### Why it.scoped Instead of it.effect or plain it?

**Reason 1: Automatic Scope Management**
```typescript
// ✅ CORRECT: it.scoped handles Scope automatically
it.scoped("test", () =>
  Effect.gen(function* () {
    const service = yield* ServiceName; // Scope provided automatically
    yield* service.operation();
  }).pipe(Effect.provide(Layer.fresh(ServiceName.Test)))
);

// ❌ WRONG: it.effect doesn't provide Scope
it.effect("test", () =>
  Effect.gen(function* () {
    const service = yield* ServiceName; // Error: No Scope available!
    yield* service.operation();
  }).pipe(Effect.provide(Layer.fresh(ServiceName.Test)))
);
```

**Reason 2: Required for Services with Resources**
- Services using `Layer.scoped` REQUIRE Scope in consumers
- Most infrastructure and data-access services use resources
- it.scoped ensures tests work with all service types

**Reason 3: Consistent Pattern Across All Generators**
- Feature services: Use it.scoped
- Provider services: Use it.scoped
- Data-access repositories: Use it.scoped
- Infrastructure services: Use it.scoped
- One pattern to remember, zero exceptions

**Reason 4: Better Cleanup Guarantees**
- Scope ensures finalizers run even if test fails
- Prevents resource leaks in test suite
- More reliable than manual cleanup

---

### Why Layer.fresh Everywhere?

**Reason 1: Prevents State Leakage Between Tests**
```typescript
// ❌ WRONG: Shared layer instance
const SharedLayer = MyService.Test;

it.scoped("test 1", () =>
  Effect.gen(function* () {
    const service = yield* MyService;
    yield* service.setState("test1");
  }).pipe(Effect.provide(SharedLayer))
);

it.scoped("test 2", () =>
  Effect.gen(function* () {
    const service = yield* MyService;
    // BUG: Might see state from test 1!
    yield* service.getState();
  }).pipe(Effect.provide(SharedLayer))
);

// ✅ CORRECT: Fresh layer per test
it.scoped("test 1", () =>
  Effect.gen(function* () {
    const service = yield* MyService;
    yield* service.setState("test1");
  }).pipe(Effect.provide(Layer.fresh(MyService.Test)))
);

it.scoped("test 2", () =>
  Effect.gen(function* () {
    const service = yield* MyService;
    // Guaranteed: Clean state every time
    yield* service.getState();
  }).pipe(Effect.provide(Layer.fresh(MyService.Test)))
);
```

**Reason 2: Each Test Gets Isolated Instance**
- Test order doesn't matter
- Tests can run in parallel safely
- Failures don't cascade to other tests

**Reason 3: Minimal Performance Overhead**
- Layer.fresh adds 1-5ms per test typically
- Small price for reliability
- Parallelization gains outweigh overhead

**Reason 4: Critical for Repositories with Internal State**
- Repositories often cache queries
- In-memory test implementations hold data
- Fresh layer = fresh data every test

---

## Anti-Patterns (Don't Use)

### ❌ Mixed Imports from vitest and @effect/vitest

```typescript
// WRONG
import { describe, expect } from "vitest"
import { it } from "@effect/vitest"

// CORRECT
import { describe, expect, it } from "@effect/vitest"
```

**Why it's wrong:**
- Inconsistent import sources confuse developers
- Some utilities won't have Effect-aware behavior
- Harder to maintain and understand

---

### ❌ Manual Effect.runPromise Calls

```typescript
// WRONG
it("test", async () => {
  const program = Effect.gen(function* () {
    const service = yield* ServiceName;
    return yield* service.method();
  });

  const result = await Effect.runPromise(
    program.pipe(Effect.provide(ServiceName.Test))
  );

  expect(result).toBeDefined();
});

// CORRECT
it.scoped("test", () =>
  Effect.gen(function* () {
    const service = yield* ServiceName;
    const result = yield* service.method();
    expect(result).toBeDefined();
  }).pipe(Effect.provide(Layer.fresh(ServiceName.Test)))
);
```

**Why it's wrong:**
- Boilerplate: More code to write
- Error handling: Exceptions aren't caught properly
- No Scope: Can't use services requiring Scope
- Cleanup: Manual cleanup needed

---

### ❌ Plain async/await with Effect Code

```typescript
// WRONG
it("test", async () => {
  const service = getService(); // How do you get it?
  const result = await service.method(); // Doesn't work with Effect!
});

// CORRECT
it.scoped("test", () =>
  Effect.gen(function* () {
    const service = yield* ServiceName;
    const result = yield* service.method();
    expect(result).toBeDefined();
  }).pipe(Effect.provide(Layer.fresh(ServiceName.Test)))
);
```

**Why it's wrong:**
- Can't yield* Effect services
- No dependency injection
- Breaks Effect composition
- Incompatible type signatures

---

### ❌ it.effect() for Service Tests

```typescript
// WRONG: it.effect doesn't provide Scope
it.effect("test", () =>
  Effect.gen(function* () {
    const service = yield* ServiceName; // May fail if service needs Scope
    yield* service.operation();
  }).pipe(Effect.provide(Layer.fresh(ServiceName.Test)))
);

// CORRECT: it.scoped provides Scope automatically
it.scoped("test", () =>
  Effect.gen(function* () {
    const service = yield* ServiceName;
    yield* service.operation();
  }).pipe(Effect.provide(Layer.fresh(ServiceName.Test)))
);
```

**Why it's wrong:**
- it.effect doesn't provide Scope
- Services using Layer.scoped require Scope
- Inconsistent with other tests
- More likely to break with service changes

---

### ❌ Sharing Layer Instances Between Tests

```typescript
// WRONG
const testLayer = MyService.Test;

describe("MyService", () => {
  it.scoped("test 1", () =>
    Effect.gen(function* () {
      // ...
    }).pipe(Effect.provide(testLayer)) // Shared!
  );

  it.scoped("test 2", () =>
    Effect.gen(function* () {
      // ...
    }).pipe(Effect.provide(testLayer)) // Shared!
  );
});

// CORRECT
describe("MyService", () => {
  it.scoped("test 1", () =>
    Effect.gen(function* () {
      // ...
    }).pipe(Effect.provide(Layer.fresh(MyService.Test))) // Fresh!
  );

  it.scoped("test 2", () =>
    Effect.gen(function* () {
      // ...
    }).pipe(Effect.provide(Layer.fresh(MyService.Test))) // Fresh!
  );
});
```

**Why it's wrong:**
- State leakage between tests
- Test order matters
- Can't run tests in parallel
- Flaky tests

---

## Common Patterns

### Testing Service Operations

```typescript
it.scoped("should execute operation successfully", () =>
  Effect.gen(function* () {
    const service = yield* MyService;
    const result = yield* service.operation();
    expect(result).toBeDefined();
  }).pipe(Effect.provide(Layer.fresh(MyService.Test)))
);
```

---

### Testing with Mocked Dependencies

```typescript
it.scoped("should use mocked dependency", () =>
  Effect.gen(function* () {
    // Create inline mock layer
    const MockDependency = Layer.succeed(DependencyService, {
      method: () => Effect.succeed("mocked"),
    });

    // Compose service layer with mock
    const testLayer = MyService.Live.pipe(
      Layer.provide(MockDependency)
    );

    const service = yield* MyService;
    const result = yield* service.operation();
    expect(result).toBe("mocked");
  }).pipe(Effect.provide(Layer.fresh(testLayer)))
);
```

---

### Testing Error Handling

```typescript
it.scoped("should handle errors correctly", () =>
  Effect.gen(function* () {
    const service = yield* MyService;

    const result = yield* service.failingOperation().pipe(
      Effect.catchAll((error) => {
        expect(error._tag).toBe("MyServiceError");
        return Effect.succeed(null);
      })
    );

    expect(result).toBeNull();
  }).pipe(Effect.provide(Layer.fresh(MyService.Test)))
);
```

---

### Testing with Multiple Services

```typescript
it.scoped("should compose multiple services", () =>
  Effect.gen(function* () {
    const service1 = yield* Service1;
    const service2 = yield* Service2;

    const result1 = yield* service1.operation();
    const result2 = yield* service2.operation(result1);

    expect(result2).toBeDefined();
  }).pipe(
    Effect.provide(
      Layer.fresh(
        Layer.mergeAll(Service1.Test, Service2.Test)
      )
    )
  )
);
```

---

### Testing with Custom Assertions

```typescript
it.scoped("should match custom assertion", () =>
  Effect.gen(function* () {
    const service = yield* MyService;
    const result = yield* service.operation();

    // Custom assertions
    expect(result).toHaveProperty("id");
    expect(result).toHaveProperty("createdAt");
    expect(result.status).toBe("active");
  }).pipe(Effect.provide(Layer.fresh(MyService.Test)))
);
```

---

## Testing with TestClock

### What is TestClock?

**TestClock** is Effect's time control system for tests. It allows you to:
- Control time advancement without waiting
- Test time-based operations instantly
- Verify timeouts, delays, and scheduled operations
- Test retry logic with exponential backoff

**Key Benefits:**
- ⚡ **Fast:** Tests complete in milliseconds, not seconds
- 🎯 **Deterministic:** Time advances exactly when you specify
- 🔍 **Testable:** Time-based operations become easily verifiable
- 🚀 **Scalable:** Test complex timing scenarios without flakiness

**When to Use TestClock:**
- Testing operations with `Effect.delay()` or `Effect.sleep()`
- Testing timeouts with `Effect.timeout()`
- Testing retry logic with `Schedule`
- Testing cache expiration (TTL)
- Testing scheduled operations
- Testing token refresh, session expiration, etc.

---

### How TestClock Works

```typescript
import { TestClock } from "effect"

it.scoped("advances time without waiting", () =>
  Effect.gen(function* () {
    // Fork operation with 1-second delay
    const fiber = yield* Effect.fork(
      Effect.gen(function* () {
        yield* Effect.sleep("1 second");
        return "completed";
      })
    );

    // Advance test clock by 1 second (instant!)
    yield* TestClock.adjust("1 second");

    // Operation completes immediately in test
    const result = yield* Fiber.join(fiber);
    expect(result).toBe("completed");
  })
);
```

**@effect/vitest provides TestClock automatically** with `it.scoped()` - no manual setup needed!

---

### Basic TestClock Patterns

#### Pattern 1: Testing Delayed Operations

```typescript
it.scoped("completes operation after delay", () =>
  Effect.gen(function* () {
    const service = yield* MyService;

    // Fork operation with delay
    const fiber = yield* Effect.fork(
      service.delayedOperation().pipe(Effect.delay("500 millis"))
    );

    // Advance clock to trigger completion
    yield* TestClock.adjust("600 millis");

    const result = yield* Fiber.join(fiber);
    expect(result).toBeDefined();
  }).pipe(Effect.provide(Layer.fresh(MyService.Test)))
);
```

**Why fork?** Operations with delays need to run in background while we advance the clock.

---

#### Pattern 2: Testing Timeouts

```typescript
it.scoped("times out for slow operations", () =>
  Effect.gen(function* () {
    const service = yield* MyService;

    const result = yield* service.slowOperation().pipe(
      Effect.timeout("5 seconds"),
      Effect.exit // Capture timeout as Exit
    );

    expect(Exit.isFailure(result)).toBe(true);
  }).pipe(Effect.provide(Layer.fresh(MyService.Test)))
);
```

**No TestClock.adjust needed** - timeout failures are immediate in tests.

---

#### Pattern 3: Testing Cache Expiration (TTL)

```typescript
it.scoped("expires cache after TTL", () =>
  Effect.gen(function* () {
    let queryCount = 0;

    const cachingService = Layer.succeed(MyService, {
      getData: () =>
        Effect.gen(function* () {
          queryCount++;
          return { count: queryCount };
        }).pipe(Effect.cachedWithTTL("10 minutes"))
    });

    const service = yield* MyService;

    // First query - cache miss
    const result1 = yield* service.getData();
    expect(queryCount).toBe(1);

    // Second query - cache hit
    const result2 = yield* service.getData();
    expect(queryCount).toBe(1); // Still 1

    // Advance past TTL
    yield* TestClock.adjust("11 minutes");

    // Third query - cache expired
    const result3 = yield* service.getData();
    expect(queryCount).toBe(2); // Incremented
  }).pipe(Effect.provide(Layer.fresh(cachingService)))
);
```

---

### Advanced TestClock Patterns

#### Pattern 4: Testing Retry with Exponential Backoff

```typescript
it.scoped("retries with exponential backoff", () =>
  Effect.gen(function* () {
    let attempts = 0;

    const unreliableService = Layer.succeed(MyService, {
      operation: () =>
        Effect.gen(function* () {
          attempts++;
          if (attempts < 3) {
            return yield* Effect.fail(new Error("Temporary failure"));
          }
          return "success";
        })
    });

    const service = yield* MyService;

    const fiber = yield* Effect.fork(
      service.operation().pipe(
        Effect.retry({
          schedule: Schedule.exponential("100 millis").pipe(
            Schedule.compose(Schedule.recurs(3))
          )
        })
      )
    );

    // Advance clock to trigger retries
    yield* TestClock.adjust("100 millis");  // 1st retry
    yield* TestClock.adjust("200 millis");  // 2nd retry (doubled)
    yield* TestClock.adjust("400 millis");  // 3rd retry (doubled again)

    const result = yield* Fiber.join(fiber);
    expect(result).toBe("success");
    expect(attempts).toBe(3);
  }).pipe(Effect.provide(Layer.fresh(unreliableService)))
);
```

**Key Insight:** Each `TestClock.adjust` corresponds to one retry interval in the exponential backoff sequence.

---

#### Pattern 5: Testing Scheduled Operations

```typescript
it.scoped("runs scheduled cleanup operations", () =>
  Effect.gen(function* () {
    let cleanupCount = 0;

    const scheduledService = Layer.scoped(
      MyService,
      Effect.gen(function* () {
        // Schedule cleanup every 5 minutes
        yield* Effect.forkScoped(
          Effect.repeat(
            Effect.sync(() => { cleanupCount++; }),
            Schedule.spaced("5 minutes")
          )
        );

        return { /* service implementation */ };
      })
    );

    yield* Effect.gen(function* () {
      const service = yield* MyService;
      expect(service).toBeDefined();

      // Advance clock to trigger cleanups
      yield* TestClock.adjust("5 minutes");   // 1st cleanup
      yield* TestClock.adjust("5 minutes");   // 2nd cleanup
      yield* TestClock.adjust("5 minutes");   // 3rd cleanup

      expect(cleanupCount).toBe(3);
    }).pipe(Effect.provide(Layer.fresh(scheduledService)));
  })
);
```

---

#### Pattern 6: Testing Token Refresh

```typescript
it.scoped("refreshes authentication token on schedule", () =>
  Effect.gen(function* () {
    let refreshCount = 0;
    let currentToken = "initial-token";

    const tokenService = Layer.scoped(
      AuthService,
      Effect.gen(function* () {
        // Schedule token refresh every 30 minutes
        yield* Effect.forkScoped(
          Effect.repeat(
            Effect.sync(() => {
              refreshCount++;
              currentToken = `token-${refreshCount}`;
            }),
            Schedule.spaced("30 minutes")
          )
        );

        return {
          getToken: () => Effect.succeed(currentToken),
          makeRequest: () => Effect.succeed({ token: currentToken })
        };
      })
    );

    yield* Effect.gen(function* () {
      const service = yield* AuthService;

      // Initial token
      const initial = yield* service.getToken();
      expect(initial).toBe("initial-token");

      // Advance 30 minutes - 1st refresh
      yield* TestClock.adjust("30 minutes");
      const first = yield* service.getToken();
      expect(first).toBe("token-1");

      // Advance 30 minutes - 2nd refresh
      yield* TestClock.adjust("30 minutes");
      const second = yield* service.getToken();
      expect(second).toBe("token-2");

      expect(refreshCount).toBe(2);
    }).pipe(Effect.provide(Layer.fresh(tokenService)));
  })
);
```

---

### TestClock with Different Service Types

#### Feature Services: Delayed Operations

```typescript
it.scoped("processes batch after delay", () =>
  Effect.gen(function* () {
    const service = yield* OrderService;

    const fiber = yield* Effect.fork(
      service.processBatch().pipe(Effect.delay("2 seconds"))
    );

    yield* TestClock.adjust("3 seconds");

    const result = yield* Fiber.join(fiber);
    expect(result.processed).toBe(true);
  }).pipe(Effect.provide(Layer.fresh(OrderService.Test)))
);
```

---

#### Data-Access Repositories: Cache Expiration

```typescript
it.scoped("refreshes repository cache after TTL", () =>
  Effect.gen(function* () {
    let queryCount = 0;

    const cachingRepo = Layer.succeed(UserRepository, {
      findById: (id: string) =>
        Effect.gen(function* () {
          queryCount++;
          return Option.some({ id, name: `User ${queryCount}` });
        }).pipe(Effect.cachedWithTTL("10 minutes"))
    });

    const repo = yield* UserRepository;

    // First query
    const result1 = yield* repo.findById("user-123");
    expect(queryCount).toBe(1);

    // Cache hit
    const result2 = yield* repo.findById("user-123");
    expect(queryCount).toBe(1);

    // Expire cache
    yield* TestClock.adjust("11 minutes");

    // Cache miss
    const result3 = yield* repo.findById("user-123");
    expect(queryCount).toBe(2);
  }).pipe(Effect.provide(Layer.fresh(cachingRepo)))
);
```

---

#### Provider Services: API Rate Limiting

```typescript
it.scoped("retries after API rate limit", () =>
  Effect.gen(function* () {
    let attempts = 0;

    const rateLimitedProvider = Layer.succeed(StripeService, {
      createCharge: () =>
        Effect.gen(function* () {
          attempts++;
          if (attempts < 3) {
            return yield* Effect.fail(new StripeError({ message: "Rate limited" }));
          }
          return { id: "charge-123", success: true };
        })
    });

    const service = yield* StripeService;

    const fiber = yield* Effect.fork(
      service.createCharge().pipe(
        Effect.retry({
          schedule: Schedule.exponential("1 second").pipe(
            Schedule.compose(Schedule.recurs(3))
          )
        })
      )
    );

    // Trigger retries
    yield* TestClock.adjust("1 second");
    yield* TestClock.adjust("2 seconds");
    yield* TestClock.adjust("4 seconds");

    const result = yield* Fiber.join(fiber);
    expect(result.success).toBe(true);
    expect(attempts).toBe(3);
  }).pipe(Effect.provide(Layer.fresh(rateLimitedProvider)))
);
```

---

#### Infrastructure Services: Session Expiration

```typescript
it.scoped("handles session expiration", () =>
  Effect.gen(function* () {
    let sessionValid = true;

    const sessionService = Layer.scoped(
      SessionService,
      Effect.gen(function* () {
        // Expire session after 1 hour
        yield* Effect.forkScoped(
          Effect.gen(function* () {
            yield* Effect.sleep("1 hour");
            sessionValid = false;
          })
        );

        return {
          checkSession: () =>
            sessionValid
              ? Effect.succeed({ valid: true })
              : Effect.fail(new SessionExpiredError())
        };
      })
    );

    yield* Effect.gen(function* () {
      const service = yield* SessionService;

      // Session valid
      const before = yield* service.checkSession();
      expect(before.valid).toBe(true);

      // Advance past expiration
      yield* TestClock.adjust("61 minutes");

      // Session expired
      const after = yield* service.checkSession().pipe(Effect.flip);
      expect(after._tag).toBe("SessionExpiredError");
    }).pipe(Effect.provide(Layer.fresh(sessionService)));
  })
);
```

---

### Common TestClock Pitfalls

#### ❌ Pitfall 1: Not Forking Delayed Operations

```typescript
// WRONG: Operation blocks forever
it.scoped("test delayed operation", () =>
  Effect.gen(function* () {
    yield* Effect.sleep("1 second"); // Blocks!
    yield* TestClock.adjust("1 second"); // Never reached
  })
);

// CORRECT: Fork the delayed operation
it.scoped("test delayed operation", () =>
  Effect.gen(function* () {
    const fiber = yield* Effect.fork(
      Effect.sleep("1 second")
    );
    yield* TestClock.adjust("1 second");
    yield* Fiber.join(fiber); // Completes
  })
);
```

---

#### ❌ Pitfall 2: Wrong Retry Interval Timing

```typescript
// WRONG: Not matching exponential backoff schedule
it.scoped("test retry", () =>
  Effect.gen(function* () {
    const fiber = yield* Effect.fork(
      operation.pipe(
        Effect.retry(Schedule.exponential("100 millis"))
      )
    );

    yield* TestClock.adjust("100 millis");
    yield* TestClock.adjust("100 millis"); // WRONG: Should be 200ms
    yield* TestClock.adjust("100 millis"); // WRONG: Should be 400ms
  })
);

// CORRECT: Match exponential backoff sequence
it.scoped("test retry", () =>
  Effect.gen(function* () {
    const fiber = yield* Effect.fork(
      operation.pipe(
        Effect.retry(Schedule.exponential("100 millis"))
      )
    );

    yield* TestClock.adjust("100 millis");  // 1st retry
    yield* TestClock.adjust("200 millis");  // 2nd retry (doubled)
    yield* TestClock.adjust("400 millis");  // 3rd retry (doubled)
  })
);
```

---

#### ❌ Pitfall 3: Using Real Time Instead of TestClock

```typescript
// WRONG: Real delay in tests
it.scoped("test with real delay", async () => {
  await new Promise(resolve => setTimeout(resolve, 1000)); // Slow!
  // ... test continues
});

// CORRECT: Use TestClock
it.scoped("test with TestClock", () =>
  Effect.gen(function* () {
    const fiber = yield* Effect.fork(
      Effect.sleep("1 second")
    );
    yield* TestClock.adjust("1 second"); // Instant!
    yield* Fiber.join(fiber);
  })
);
```

---

### TestClock Best Practices

1. ✅ **Always fork delayed operations** before advancing the clock
2. ✅ **Match retry intervals** to your Schedule configuration
3. ✅ **Use TestClock.adjust** instead of real delays
4. ✅ **Import TestClock from "effect"** not from @effect/vitest
5. ✅ **Test clock is automatic** with it.scoped - no setup needed

---

### Required Imports for TestClock

```typescript
import { describe, expect, it } from "@effect/vitest"
import { Effect, Fiber, TestClock, Exit, Schedule, Layer } from "effect"
```

**Note:** Import `TestClock` from `"effect"`, not from `"@effect/vitest"`.

---

### TestClock Summary

**TestClock enables:**
- ⚡ Testing time-based operations instantly
- 🎯 Deterministic time control in tests
- 🔍 Verification of timeouts, retries, and schedules
- 🚀 Fast, reliable tests for complex timing scenarios

**Common Use Cases:**
- Cache expiration (Effect.cachedWithTL)
- Retry logic (Schedule.exponential)
- API rate limiting
- Token refresh schedules
- Session expiration
- Delayed operations
- Timeout handling

**See also:**
- Test template examples in generated test files
- https://effect.website/docs/guides/testing/vitest#testclock
- EFFECT_PATTERNS.md for Effect patterns and best practices

---

## Migration Guide

### For Existing Code Using Jest

If you have existing code using Jest:

1. **Update imports:**
   ```typescript
   // Before
   import { describe, expect, it } from "@jest/globals"

   // After
   import { describe, expect, it } from "@effect/vitest"
   ```

2. **Replace async/await with it.scoped:**
   ```typescript
   // Before
   it("test", async () => {
     const result = await Effect.runPromise(program);
     expect(result).toBeDefined();
   });

   // After
   it.scoped("test", () =>
     Effect.gen(function* () {
       const result = yield* operation();
       expect(result).toBeDefined();
     }).pipe(Effect.provide(Layer.fresh(ServiceName.Test)))
   );
   ```

3. **Add Layer.fresh to all tests:**
   ```typescript
   // Before
   .pipe(Effect.provide(ServiceName.Test))

   // After
   .pipe(Effect.provide(Layer.fresh(ServiceName.Test)))
   ```

---

### For Existing Code Using Plain Vitest

If you have existing code using plain vitest:

1. **Change import source:**
   ```typescript
   // Before
   import { describe, expect, it } from "vitest"

   // After
   import { describe, expect, it } from "@effect/vitest"
   ```

2. **Replace it() with it.scoped():**
   ```typescript
   // Before
   it("test", () => {
     expect(true).toBe(true);
   });

   // After
   it.scoped("test", () =>
     Effect.gen(function* () {
       expect(true).toBe(true);
     })
   );
   ```

---

## References

- **@effect/vitest Documentation:** https://effect.website/docs/guides/testing/vitest
- **Layer.fresh Guide:** https://effect.website/docs/guides/testing/vitest#layer-fresh
- **Effect Testing Overview:** https://effect.website/docs/guides/testing
- **Project EFFECT_PATTERNS.md:** Comprehensive Effect pattern guide

---

## Summary

**The Golden Rules:**

1. ✅ **Always** import from `@effect/vitest` for describe, expect, it
2. ✅ **Always** use `it.scoped()` for Effect-based tests
3. ✅ **Always** use `Layer.fresh()` to wrap test layers
4. ❌ **Never** use manual `Effect.runPromise()` in tests
5. ❌ **Never** share layer instances between tests
6. ❌ **Never** mix vitest and @effect/vitest imports

Following these rules ensures:
- Consistent testing patterns across all generators
- Reliable test isolation
- Better error messages
- Future-proof test code
- Easier maintenance

---

## Test Layer Implementation Pattern

### Zero-Assertion Philosophy

Generated test layers follow a **zero type assertion** approach that demonstrates TypeScript's type inference capabilities:

```typescript
// ✅ CORRECT: Placeholder pattern (no type assertions)
static readonly Test = Layer.succeed(this, {
  processPayment: () =>
    Effect.dieMessage(
      "Test layer not implemented. Provide your own test mock via Layer.succeed(PaymentService, {...})"
    ),
  refundPayment: () =>
    Effect.dieMessage("Test layer not implemented"),
  // Simple defaults for non-entity operations
  count: () => Effect.succeed(0),
  exists: () => Effect.succeed(false),
});

// ❌ WRONG: Creating mock entities with type assertions
static readonly Test = Layer.succeed(this, {
  processPayment: () =>
    Effect.succeed({
      paymentId: "test-id",
      status: "pending" as const,  // ❌ Type narrowing
    } as PaymentResult),  // ❌ Type assertion
});
```

### Why Placeholder Implementations?

**Problem**: Branded types (like `ProductId`, `UserId`) cannot be created from raw strings without:
- Brand constructors (don't exist in template generation)
- Type assertions (`as any`, `as Type`)
- Schema decoders (chicken-and-egg problem)

**Solution**: Test layers don't need to create mock entities. Instead:

1. **Honest Communication**: Clearly tells developers the test layer is a placeholder
2. **Zero Assertions**: No `as any`, `as const`, or type casts needed
3. **Type-Safe**: Preserves branded type security
4. **User-Friendly**: Error messages guide developers to provide their own mocks

### Providing Your Own Test Mocks

When you need test mocks, provide them explicitly:

```typescript
// In your test file
const MockPaymentService = Layer.succeed(PaymentService, {
  processPayment: (params) =>
    Effect.succeed({
      paymentId: "test-payment-id",
      clientSecret: "test-secret",
      status: "pending",  // TypeScript infers literal type from return type
    }),
  refundPayment: () => Effect.succeed({
    refundId: "test-refund",
    status: "refunded",
    amount: 1000,
  }),
  // ... other operations
});

// Use in tests
it.scoped("processes payment correctly", () =>
  Effect.gen(function* () {
    const service = yield* PaymentService;
    const result = yield* service.processPayment(testParams);
    expect(result.status).toBe("pending");
  }).pipe(Effect.provide(Layer.fresh(MockPaymentService)))
);
```

### TypeScript Type Inference Best Practices

1. **No `as const` needed**: Define proper return types in interfaces
   ```typescript
   // Interface defines literal type
   interface PaymentResult {
     status: "pending" | "completed";  // Literal union type
   }

   // TypeScript infers "pending" as literal from interface
   function processPayment(): PaymentResult {
     return { status: "pending" };  // ✅ No `as const` needed
   }
   ```

2. **No `!` assertions**: Use nullish coalescing or proper error handling
   ```typescript
   // ❌ WRONG:
   const value = config.retryDelay || 1000;
   Schedule.exponential(Duration.millis(value!));

   // ✅ CORRECT:
   const value = config.retryDelay ?? 1000;  // Never undefined
   Schedule.exponential(Duration.millis(value));
   ```

3. **No type casts**: Use `Effect.dieMessage` for unimplemented placeholders
   ```typescript
   // ❌ WRONG:
   query: <T>(_fn) => Effect.fail(error) as Effect.Effect<T, never, never>

   // ✅ CORRECT:
   query: <T>(_fn) => Effect.dieMessage("Database not configured...")
   ```

---

**Last Updated:** 2025-12-09
**Version:** 1.5.2
