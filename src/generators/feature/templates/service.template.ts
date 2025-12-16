/**
 * Service Template
 *
 * Generates server/service.ts file for feature libraries.
 *
 * @module monorepo-library-generator/feature/service-template
 */

import { TypeScriptBuilder } from "../../../utils/code-generation/typescript-builder"
import type { FeatureTemplateOptions } from "../../../utils/shared/types"
import { WORKSPACE_CONFIG } from "../../../utils/workspace-config"

/**
 * Generate server/service.ts file for feature library
 *
 * Creates business logic service with Effect Context.Tag pattern.
 */
export function generateServiceFile(options: FeatureTemplateOptions) {
  const builder = new TypeScriptBuilder()
  const { className, fileName, name } = options
  const scope = WORKSPACE_CONFIG.getScope()

  // Add file header with extensive documentation
  builder.addFileHeader({
    title: `${className}Service`,
    description: `Business logic and orchestration for ${name} domain.
Uses Context.Tag pattern with Layer-based dependency injection.

DEPENDENCY INJECTION PATTERN:
1. Import service tags from other libraries
2. Yield dependencies in Layer.effect's Effect.gen
3. Use dependencies in returned service methods
4. Compose layers at application level

TODO: Uncomment and customize these imports based on your needs:`
  })

  // Add imports
  builder.addImports([
    { from: "effect", imports: ["Context", "Effect", "Layer", "Schedule"] },
    { from: "../shared/errors", imports: [`${className}Error`] }
  ])
  builder.addBlankLine()

  // Add baseline integration example imports (commented)
  builder.addComment("BASELINE INTEGRATION EXAMPLE (Uncomment to use)")
  builder.addRaw(`// Import your data-access repository:
// import { ${className}Repository } from "${scope}/data-access-${fileName}";
//
// Import infrastructure services:
// import { LoggingService } from "${scope}/infra-logging";
// import { CacheService } from "${scope}/infra-cache";
// import { MetricsService } from "${scope}/infra-metrics";`)
  builder.addBlankLine()

  // Add example dependency imports section
  builder.addSectionComment(`Example Dependency Imports (Uncomment what you need)

// Data Access Layer (Repositories):
// import { UserRepository } from "@custom-repo/data-access-user/server";
// import { ProductRepository } from "@custom-repo/data-access-product/server";

// Infrastructure Services:
// import { LoggingService } from "@custom-repo/infra-logging/server";
// import { CacheService } from "@custom-repo/infra-cache/server";
// import { DatabaseService } from "@custom-repo/infra-database/server";

// External Service Providers:
// import { StripeService } from "@custom-repo/provider-stripe/server";
// import { ResendService } from "@custom-repo/provider-resend/server";

// Other Feature Services:
// import { AuthService } from "@custom-repo/feature-auth/server";
// import { NotificationService } from "@custom-repo/feature-notification/server";`)
  builder.addBlankLine()

  // Add Context.Tag class definition
  builder.addRaw(`export class ${className}Service extends Context.Tag("${className}Service")<
  ${className}Service,
  {
    readonly exampleOperation: () => Effect.Effect<void, ${className}Error>;
  }
>() {`)
  builder.addBlankLine()

  // Add Live layer
  builder.addRaw(`  static readonly Live = Layer.effect(
    this,
    Effect.gen(function* () {
      // ========================================================================
      // BASELINE INTEGRATION EXAMPLE (Uncomment to use)
      // ========================================================================
      //
      // // 1. Inject your repository
      // const repo = yield* ${className}Repository;
      //
      // // 2. Inject infrastructure services
      // const logger = yield* LoggingService;
      // const cache = yield* CacheService;
      // const metrics = yield* MetricsService;
      //
      // ========================================================================
      // Additional Dependency Injection Examples
      // ========================================================================
      //
      // PATTERN: Yield dependencies using \`yield*\` operator
      // These services will be provided by Layer composition at runtime
      //
      // Example 1: Inject external service providers
      // const stripe = yield* StripeService;
      // const email = yield* ResendService;
      //
      // Example 2: Inject other feature services
      // const auth = yield* AuthService;
      // const notifications = yield* NotificationService;
      //
      // ========================================================================

      return {
        exampleOperation: () =>
          Effect.gen(function* () {
            // ====================================================================
            // Using Injected Dependencies
            // ====================================================================
            //
            // PATTERN: Dependencies are in scope and can be used directly
            //
            // Example: Using repository
            // const user = yield* repo.findById("user-123");
            //
            // Example: Using logger
            // yield* logger.info("Operation started", { userId: user.id });
            //
            // Example: Transforming errors
            // const result = yield* repo.save(data).pipe(
            //   Effect.mapError((repoError) =>
            //     new ${className}Error({
            //       message: "Failed to save ${fileName}",
            //       cause: repoError,
            //     })
            //   )
            // );
            //
            // Example: Using cache
            // const cached = yield* cache.get("key");
            // if (Option.isSome(cached)) {
            //   return cached.value;
            // }
            //
            // Example: Orchestrating multiple services
            // const user = yield* auth.getCurrentUser();
            // const products = yield* repo.findAllByUser(user.id);
            // yield* notifications.send(user.id, "Products loaded");
            //
            // ====================================================================

            // ====================================================================
            // Error Handling Patterns
            // ====================================================================
            //
            // Pattern 1: Error Observability with tapErrorTag (non-invasive logging)
            // yield* repo.findById(userId).pipe(
            //   Effect.tapErrorTag("NotFoundError", (error) =>
            //     logger.warn("User not found", { userId, error })
            //   ),
            //   Effect.tapErrorTag("DatabaseError", (error) =>
            //     metrics.increment("database.error", { operation: "findById" })
            //   ),
            //   Effect.mapError((repoError) =>
            //     new ${className}Error({
            //       message: \`Failed to find user \${userId}\`,
            //       cause: repoError
            //     })
            //   )
            // );
            //
            // Pattern 2: Transform repository errors to feature errors
            // const user = yield* repo.findById(userId).pipe(
            //   Effect.mapError((repoError) =>
            //     new ${className}Error({
            //       message: \`Failed to find user \${userId}\`,
            //       cause: repoError
            //     })
            //   )
            // );
            //
            // Pattern 2: Transform provider errors to feature errors
            // const payment = yield* stripe.createPayment(data).pipe(
            //   Effect.mapError((stripeError) =>
            //     new ${className}Error({
            //       message: "Payment processing failed",
            //       cause: stripeError
            //     })
            //   )
            // );
            //
            // Pattern 3: Catch specific error types
            // const data = yield* repo.save(item).pipe(
            //   Effect.catchTag("NotFoundError", (error) =>
            //     Effect.fail(
            //       new ${className}Error({
            //         message: "Item not found",
            //         cause: error
            //       })
            //     )
            //   )
            // );
            //
            // Pattern 4: Catch all errors and wrap
            // const result = yield* Effect.tryPromise({
            //   try: () => externalAPI.call(),
            //   catch: (error) => new ${className}Error({
            //     message: "External API call failed",
            //     cause: error
            //   })
            // });
            //
            // Pattern 5: Multiple operations with error transformation
            // const user = yield* repo.findById(userId).pipe(
            //   Effect.mapError(err => new ${className}Error({ message: "User lookup failed", cause: err }))
            // );
            // const products = yield* repo.findAllByUser(user.id).pipe(
            //   Effect.mapError(err => new ${className}Error({ message: "Product lookup failed", cause: err }))
            // );
            // const notification = yield* notifications.send(user.id, "Data loaded").pipe(
            //   Effect.mapError(err => new ${className}Error({ message: "Notification failed", cause: err }))
            // );
            //
            // Pattern 6: Fallback on error
            // const cached = yield* cache.get("key").pipe(
            //   Effect.catchAll(() => Effect.succeed(Option.none()))
            // );
            //
            // ====================================================================

            // ====================================================================
            // Success-Path Observability with Effect.tap
            // ====================================================================
            //
            // Pattern 1: Success logging without affecting the result
            // yield* repo.create(newItem).pipe(
            //   Effect.tap((created) =>
            //     logger.info("Item created successfully", { id: created.id })
            //   ),
            //   Effect.tap((created) =>
            //     metrics.increment("items.created", { type: created.type })
            //   )
            // );
            //
            // Pattern 2: Chaining observability with different concerns
            // const result = yield* operation().pipe(
            //   Effect.tap((value) =>
            //     logger.debug("Operation completed", { value })
            //   ),
            //   Effect.tap((value) =>
            //     cache.set("last_result", value)
            //   ),
            //   Effect.tap((value) =>
            //     metrics.gauge("last_operation_size", value.length)
            //   )
            // );
            //
            // Pattern 3: Conditional observability based on result
            // yield* repo.findById(id).pipe(
            //   Effect.tap((optResult) =>
            //     Option.isSome(optResult)
            //       ? logger.info("Found item", { id })
            //       : logger.warn("Item not found", { id })
            //   )
            // );
            //
            // Pattern 4: Side effects for analytics/metrics
            // const users = yield* repo.findByCriteria(criteria).pipe(
            //   Effect.tap((users) =>
            //     analytics.track("users_queried", {
            //       count: users.length,
            //       criteria
            //     })
            //   )
            // );
            //
            // ✅ WHEN TO USE Effect.tap:
            // - Logging (success path)
            // - Metrics/analytics
            // - Cache updates (fire-and-forget)
            // - Notifications
            // - Any side effect that shouldn't affect the main result
            //
            // ❌ DON'T use Effect.tap for:
            // - Transforming the value (use Effect.map)
            // - Handling errors (use Effect.tapError/tapErrorTag)
            // - Chaining dependent operations (use Effect.flatMap)
            //
            // Effect.tap vs Effect.tapError:
            // - Effect.tap: Runs on SUCCESS, value continues
            // - Effect.tapError: Runs on FAILURE, error continues
            // - Both are "observe-only" (don't transform result)
            //
            // ====================================================================

            // Working example with error transformation (replace with your logic)
            yield* Effect.logInfo("Example operation called");

            // Example: Error transformation pattern
            // Uncomment and adapt for your use case:
            //
            // const data = yield* repo.findById("example-id").pipe(
            //   Effect.tapErrorTag("NotFoundError", (error) =>
            //     Effect.logWarn("Resource not found", { id: "example-id", error })
            //   ),
            //   Effect.mapError((repoError) =>
            //     new ${className}Error({
            //       message: "Failed to retrieve ${fileName}",
            //       cause: repoError,
            //     })
            //   )
            // );
            //
            // return { success: true, data };

            // For now, return a simple result
            return { success: true } as ${className}Result;
          }),
      };
    })
  );`)
  builder.addBlankLine()

  // Add Test layer
  builder.addRaw(`  // ==========================================================================
  // Test Layer
  // ==========================================================================
  //
  // PATTERN: Use Layer.succeed with mock implementation for testing
  // No dependencies needed for test layer - provide simple mocks
  //
  static readonly Test = Layer.succeed(this, {
    exampleOperation: () => Effect.void,
  });
}`)
  builder.addBlankLine()

  // Add batch operations pattern
  builder.addSectionComment("Batch Operations with Effect.all")
  builder.addRaw(`//
// BATCH OPERATIONS & PARALLEL EXECUTION:
//
// Pattern: Process multiple independent items in parallel with concurrency control
// -----------------------------------------------------------------------------
//
// Use Effect.all when operations are independent and can run concurrently:
//
// const results = yield* Effect.all(
//   userIds.map(id => userRepo.findById(id)),
//   { concurrency: 10 } // Limit to 10 concurrent operations
// );
//
// Example 1: Load dashboard data in parallel
// const dashboard = yield* Effect.all({
//   user: userRepo.findById(userId),
//   notifications: notificationRepo.findUnread(userId),
//   recentActivity: activityRepo.findRecent(userId, 10)
// }).pipe(
//   Effect.mapError(err => new ${className}Error({
//     message: "Failed to load dashboard",
//     cause: err
//   }))
// );
//
// Example 2: Batch processing with concurrency limit
// const enrichedItems = yield* Effect.all(
//   itemIds.map(id =>
//     Effect.gen(function* () {
//       const item = yield* itemRepo.findById(id);
//       const details = yield* detailsService.getDetails(id);
//       return { ...item, details };
//     })
//   ),
//   { concurrency: 5 } // Process 5 items at a time
// );
//
// Example 3: Collect all results even if some fail (Effect.allSuccesses)
// const results = yield* Effect.allSuccesses(
//   itemIds.map(id => itemRepo.findById(id))
// ).pipe(
//   Effect.map(options => ({
//     successes: options.filter(Option.isSome).map(o => o.value),
//     failures: options.filter(Option.isNone).length
//   }))
// );
//
// WHEN TO USE:
// - Operations are independent (no data dependencies)
// - Number of items is reasonable (< 100)
// - Want to maximize performance
//
// CONCURRENCY GUIDELINES:
// - < 10 items: { concurrency: "unbounded" } (default)
// - 10-100 items: { concurrency: 5-20 }
// - 100+ items: Consider Stream.fromIterable + Stream.mapEffect
//
// DON'T USE Effect.all when:
// - Operations depend on each other (use Effect.gen with yield* instead)
// - Processing thousands of items (use Stream instead)
//
// See docs/EFFECT_PATTERNS.md - "Effect.all - Batch Operations" for complete guide
//
`)
  builder.addBlankLine()

  // Add comprehensive error handling reference
  builder.addSectionComment("Error Transformation Reference")
  builder.addRaw(`//
// COMPREHENSIVE ERROR HANDLING PATTERNS:
//
// 1. Error Observability with tapErrorTag (Recommended)
// ---------------------------------------------
// Log/track specific errors WITHOUT altering error flow:
//
// const user = yield* userRepo.findById(userId).pipe(
//   Effect.tapErrorTag("NotFoundError", (error) =>
//     logger.warn("User lookup failed", { userId, error })
//   ),
//   Effect.tapErrorTag("DatabaseError", (error) =>
//     metrics.increment("database.error")
//   ),
//   Effect.mapError((repoError) =>
//     new ${className}Error({
//       message: \`Failed to retrieve user \${userId}\`,
//       cause: repoError
//     })
//   )
// );
//
// WHY tapErrorTag vs catchTag:
// - tapErrorTag: Observe errors without handling (for logging/metrics)
// - catchTag: Handle/transform specific errors (for recovery)
//
// 2. Basic Error Transformation with mapError
// ---------------------------------------------
// Transform any lower-layer error into a feature-specific error:
//
// const user = yield* userRepo.findById(userId).pipe(
//   Effect.mapError((repoError) =>
//     new ${className}Error({
//       message: \`Failed to retrieve user \${userId}\`,
//       cause: repoError  // Preserve original error for debugging
//     })
//   )
// );
//
// 3. Catch Specific Error Types with catchTag
// ---------------------------------------------
// Handle specific error types differently:
//
// const item = yield* repo.findById(id).pipe(
//   Effect.catchTag("NotFoundError", (error) =>
//     Effect.fail(new ${className}Error({
//       message: \`Resource \${id} does not exist\`,
//       cause: error
//     }))
//   ),
//   Effect.catchTag("ValidationError", (error) =>
//     Effect.fail(new ${className}Error({
//       message: "Invalid resource data",
//       cause: error
//     }))
//   )
// );
//
// 3. Catch All Errors with catchAll
// ---------------------------------------------
// Provide fallback for any error:
//
// const cachedData = yield* cache.get("key").pipe(
//   Effect.catchAll((error) => {
//     // Log error but don't fail
//     yield* logger.warn("Cache miss", { error });
//     return Effect.succeed(Option.none());
//   })
// );
//
// 4. Transform External API Errors with tryPromise
// ---------------------------------------------
// Wrap external API calls with proper error handling:
//
// const apiResult = yield* Effect.tryPromise({
//   try: async () => {
//     const response = await fetch("https://api.example.com/data");
//     if (!response.ok) throw new Error(\`HTTP \${response.status}\`);
//     return response.json();
//   },
//   catch: (error) => new ${className}Error({
//     message: "External API call failed",
//     cause: error
//   })
// });
//
// 5. Chain Multiple Operations with Error Transformation
// ---------------------------------------------
// Each operation can have its own error transformation:
//
// const result = yield* Effect.gen(function* () {
//   const user = yield* userRepo.findById(userId).pipe(
//     Effect.mapError(err => new ${className}Error({ message: "User lookup failed", cause: err }))
//   );
//
//   const settings = yield* settingsRepo.findByUser(user.id).pipe(
//     Effect.mapError(err => new ${className}Error({ message: "Settings lookup failed", cause: err }))
//   );
//
//   const notification = yield* notificationService.send(user.email, "Welcome").pipe(
//     Effect.catchAll(err => {
//       // Don't fail entire operation if notification fails
//       yield* logger.warn("Notification failed", { error: err });
//       return Effect.succeed(null);
//     })
//   );
//
//   return { user, settings, notification };
// });
//
// 6. Retry Failed Operations Before Transforming Error
// ---------------------------------------------
// Add retry logic before error transformation:
//
// const data = yield* externalService.fetchData().pipe(
//   Effect.retry(Schedule.exponential("100 millis").pipe(
//     Schedule.compose(Schedule.recurs(3))
//   )),
//   Effect.mapError((err) => new ${className}Error({
//     message: "Failed after 3 retry attempts",
//     cause: err
//   }))
// );
//
// 7. Error Recovery with orElse
// ---------------------------------------------
// Try alternative approach on failure:
//
// const data = yield* primarySource.fetchData().pipe(
//   Effect.orElse(() => backupSource.fetchData()),
//   Effect.mapError((err) => new ${className}Error({
//     message: "Both primary and backup sources failed",
//     cause: err
//   }))
// );
//
// 8. Data Validation with filterOrFail
// ---------------------------------------------
// Declarative validation with custom errors
//
// // Validate object properties with chaining
// const processedData = yield* Effect.succeed(userData).pipe(
//   Effect.filterOrFail(
//     (user) => user.email.includes("@") && user.name.length > 0,
//     (user) => new ${className}Error({
//       message: "Invalid user data",
//       details: {
//         email: user.email.includes("@") ? null : "Email must contain @",
//         name: user.name.length > 0 ? null : "Name cannot be empty"
//       }
//     })
//   ),
//   Effect.filterOrFail(
//     (user) => VALID_ROLES.includes(user.role),
//     (user) => new ${className}Error({ message: \`Invalid role: \${user.role}\` })
//   ),
//   Effect.flatMap((validUser) => repo.save(validUser))
// );
//
// Variations:
// - Single value: Effect.succeed(age).pipe(filterOrFail(age => age >= 18, ...))
// - Option→Value: Effect.succeed(maybe).pipe(filterOrFail(Option.isSome, ...))
// - Array content: Effect.succeed(items).pipe(filterOrFail(arr => arr.every(...)))
// See EFFECT_PATTERNS.md for detailed examples
//
// 9. Collect All Errors with Effect.parallelErrors
// ---------------------------------------------
// Collect all errors from parallel operations for comprehensive reporting
//
// // Form validation - collect all field errors
// const validateForm = (formData: FormData) =>
//   Effect.all([
//     Effect.succeed(formData.email).pipe(
//       Effect.filterOrFail(
//         (email) => email.includes("@"),
//         () => new ${className}Error({ message: "Invalid email" })
//       )
//     ),
//     Effect.succeed(formData.age).pipe(
//       Effect.filterOrFail(
//         (age) => age >= 18,
//         () => new ${className}Error({ message: "Must be 18 or older" })
//       )
//     )
//   ]).pipe(
//     Effect.parallelErrors,
//     Effect.catchAll((errors) =>
//       Effect.fail(
//         new ${className}Error({
//           message: "Form validation failed",
//           details: errors.map((e) => e.message)
//         })
//       )
//     )
//   );
//
// Error Collection Strategies:
// - Fail on all errors: parallelErrors + catchAll(fail)  // Form validation
// - Partial success: parallelErrors + catchAll(succeed([])) // Optional data
// - Log & fail: parallelErrors + catchAll(log + fail)     // Batch processing
// - Collect & continue: parallelErrors + catchAll(succeed(errors)) // Diagnostics
//
// See EFFECT_PATTERNS.md for batch operations and error handling strategies
//
// 10. Transform Both Channels with mapBoth
// ---------------------------------------------
// Transform both success and error channels simultaneously
//
// // API Normalization
// const normalizedResult = yield* externalAPI.fetchUser(userId).pipe(
//   Effect.mapBoth({
//     onSuccess: (apiUser) => ({
//       id: apiUser.user_id,
//       name: apiUser.full_name,
//       email: apiUser.email_address,
//       createdAt: new Date(apiUser.created_at),
//       source: "external_api",
//       timestamp: Date.now()
//     }),
//     onFailure: (apiError) =>
//       new ${className}Error({
//         message: "Failed to fetch user",
//         cause: apiError,
//         code: apiError.status_code,
//         timestamp: Date.now(),
//         retryable: apiError.status_code >= 500
//       })
//   })
// );
//
// Common Use Cases:
// - API Normalization: External→Domain model (success), SDK→Domain error (failure)
// - API Response Format: { status: 'success', data } / { status: 'error', error }
// - Add Metadata: + timestamp, source (both channels)
// - Correlation Tracking: + correlationId, duration (both channels)
//
// Use mapBoth when: Both channels need transformation
// Use map/mapError when: Only one channel needs transformation
//
// See EFFECT_PATTERNS.md for detailed examples and use cases
//`)
  builder.addBlankLine()

  // Add layer composition examples
  builder.addSectionComment("Layer Composition Examples")
  builder.addRaw(`//
// IMPORTANT: These examples show how to provide dependencies to this service.
// Actual composition should be done at the application level.
//
// Example 1: Compose with single dependency
// export const ${className}ServiceWithLogging = ${className}Service.Live.pipe(
//   Layer.provide(LoggingServiceLive)
// );
//
// Example 2: Compose with multiple dependencies
// export const ${className}ServiceComplete = ${className}Service.Live.pipe(
//   Layer.provide(Layer.mergeAll(
//     LoggingServiceLive,
//     UserRepositoryLive,
//     CacheServiceLive
//   ))
// );
//
// Example 3: Use in application
// const program = Effect.gen(function* () {
//   const service = yield* ${className}Service;
//   yield* service.exampleOperation();
// });
//
// await Effect.runPromise(
//   program.pipe(
//     Effect.provide(${className}Service.Live),
//     Effect.provide(LoggingServiceLive),
//     Effect.provide(UserRepositoryLive)
//   )
// );`)
  builder.addBlankLine()

  return builder.toString()
}
