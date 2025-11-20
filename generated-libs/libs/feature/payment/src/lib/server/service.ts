import { PaymentError } from "../shared/errors";
import { Context, Effect, Layer, Schedule } from "effect";

/**
 * PaymentService
 *
 * Business logic and orchestration for payment domain.
Uses Context.Tag pattern with Layer-based dependency injection.

DEPENDENCY INJECTION PATTERN:
1. Import service tags from other libraries
2. Yield dependencies in Layer.effect's Effect.gen
3. Use dependencies in returned service methods
4. Compose layers at application level

TODO: Uncomment and customize these imports based on your needs:
 *
 */


// ============================================================================
// Example Dependency Imports (Uncomment what you need)

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
// import { NotificationService } from "@custom-repo/feature-notification/server";
// ============================================================================


export class PaymentService extends Context.Tag("PaymentService")<
  PaymentService,
  {
    readonly exampleOperation: () => Effect.Effect<void, PaymentError>;
  }
>() {

  static readonly Live = Layer.effect(
    this,
    Effect.gen(function* () {
      // ========================================================================
      // Dependency Injection Examples
      // ========================================================================
      //
      // PATTERN: Yield dependencies using `yield*` operator
      // These services will be provided by Layer composition at runtime
      //
      // Example 1: Inject a repository
      // const userRepo = yield* UserRepository;
      //
      // Example 2: Inject infrastructure services
      // const logger = yield* LoggingService;
      // const cache = yield* CacheService;
      //
      // Example 3: Inject external service providers
      // const stripe = yield* StripeService;
      // const email = yield* ResendService;
      //
      // Example 4: Inject other feature services
      // const auth = yield* AuthService;
      // const notifications = yield* NotificationService;
      //
      // ========================================================================

      // TODO: Uncomment and add your actual dependencies here
      // const logger = yield* LoggingService;
      // const repo = yield* UserRepository;

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
            //     new PaymentError({
            //       message: "Failed to save payment",
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
            // Error Transformation Patterns
            // ====================================================================
            //
            // Pattern 1: Transform repository errors to feature errors
            // const user = yield* repo.findById(userId).pipe(
            //   Effect.mapError((repoError) =>
            //     new PaymentError({
            //       message: `Failed to find user ${userId}`,
            //       cause: repoError
            //     })
            //   )
            // );
            //
            // Pattern 2: Transform provider errors to feature errors
            // const payment = yield* stripe.createPayment(data).pipe(
            //   Effect.mapError((stripeError) =>
            //     new PaymentError({
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
            //       new PaymentError({
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
            //   catch: (error) => new PaymentError({
            //     message: "External API call failed",
            //     cause: error
            //   })
            // });
            //
            // Pattern 5: Multiple operations with error transformation
            // const user = yield* repo.findById(userId).pipe(
            //   Effect.mapError(err => new PaymentError({ message: "User lookup failed", cause: err }))
            // );
            // const products = yield* repo.findAllByUser(user.id).pipe(
            //   Effect.mapError(err => new PaymentError({ message: "Product lookup failed", cause: err }))
            // );
            // const notification = yield* notifications.send(user.id, "Data loaded").pipe(
            //   Effect.mapError(err => new PaymentError({ message: "Notification failed", cause: err }))
            // );
            //
            // Pattern 6: Fallback on error
            // const cached = yield* cache.get("key").pipe(
            //   Effect.catchAll(() => Effect.succeed(Option.none()))
            // );
            //
            // ====================================================================

            // TODO: Replace this with your actual business logic
            yield* Effect.logInfo("Example operation called");
          }),
      };
    })
  );

  // ==========================================================================
  // Test Layer
  // ==========================================================================
  //
  // PATTERN: Use Layer.succeed with mock implementation for testing
  // No dependencies needed for test layer - provide simple mocks
  //
  static readonly Test = Layer.succeed(this, {
    exampleOperation: () => Effect.void,
  });
}

// ============================================================================
// Error Transformation Reference
// ============================================================================

//
// COMPREHENSIVE ERROR HANDLING PATTERNS:
//
// 1. Basic Error Transformation with mapError
// ---------------------------------------------
// Transform any lower-layer error into a feature-specific error:
//
// const user = yield* userRepo.findById(userId).pipe(
//   Effect.mapError((repoError) =>
//     new PaymentError({
//       message: `Failed to retrieve user ${userId}`,
//       cause: repoError  // Preserve original error for debugging
//     })
//   )
// );
//
// 2. Catch Specific Error Types with catchTag
// ---------------------------------------------
// Handle specific error types differently:
//
// const item = yield* repo.findById(id).pipe(
//   Effect.catchTag("NotFoundError", (error) =>
//     Effect.fail(new PaymentError({
//       message: `Resource ${id} does not exist`,
//       cause: error
//     }))
//   ),
//   Effect.catchTag("ValidationError", (error) =>
//     Effect.fail(new PaymentError({
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
//     if (!response.ok) throw new Error(`HTTP ${response.status}`);
//     return response.json();
//   },
//   catch: (error) => new PaymentError({
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
//     Effect.mapError(err => new PaymentError({ message: "User lookup failed", cause: err }))
//   );
//
//   const settings = yield* settingsRepo.findByUser(user.id).pipe(
//     Effect.mapError(err => new PaymentError({ message: "Settings lookup failed", cause: err }))
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
//   Effect.mapError((err) => new PaymentError({
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
//   Effect.mapError((err) => new PaymentError({
//     message: "Both primary and backup sources failed",
//     cause: err
//   }))
// );

// ============================================================================
// Layer Composition Examples
// ============================================================================

//
// IMPORTANT: These examples show how to provide dependencies to this service.
// Actual composition should be done at the application level.
//
// Example 1: Compose with single dependency
// export const PaymentServiceWithLogging = PaymentService.Live.pipe(
//   Layer.provide(LoggingServiceLive)
// );
//
// Example 2: Compose with multiple dependencies
// export const PaymentServiceComplete = PaymentService.Live.pipe(
//   Layer.provideMerge(Layer.mergeAll(
//     LoggingServiceLive,
//     UserRepositoryLive,
//     CacheServiceLive
//   ))
// );
//
// Example 3: Use in application
// const program = Effect.gen(function* () {
//   const service = yield* PaymentService;
//   yield* service.exampleOperation();
// });
//
// await Effect.runPromise(
//   program.pipe(
//     Effect.provide(PaymentService.Live),
//     Effect.provide(LoggingServiceLive),
//     Effect.provide(UserRepositoryLive)
//   )
// );
