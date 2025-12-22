/**
 * Complete Integration Example
 *
 * This example demonstrates all 5 layers of the architecture working together:
 *
 * 1. CONTRACT: Domain types and schemas (generated from Prisma)
 * 2. PROVIDER: External service adapters (Kysely for database)
 * 3. INFRASTRUCTURE: Service orchestration (Database service)
 * 4. DATA-ACCESS: Repository pattern (UserRepository)
 * 5. FEATURE: Business logic (UserService)
 *
 * The key is understanding Layer composition:
 * - Each layer depends on layers below it
 * - Layer.provide chains dependencies together
 * - Effect.gen accesses services via yield*
 */

import { Console, Context, Effect, Layer, Ref } from "effect";

// ============================================================================
// LAYER 1: CONTRACT (Domain Types)
// ============================================================================
//
// After creating prisma/schemas/user.prisma and running:
// pnpm prisma:generate
//
// You would have: @myorg/contract-user
// With: User type, CreateUserInput, etc.
//
// For this example, we define types inline:

/**
 * User domain type (would be generated from Prisma schema)
 */
interface User {
  readonly id: string;
  readonly email: string;
  readonly name: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

// ============================================================================
// LAYER 2: PROVIDER (External Service Adapter)
// ============================================================================
//
// Already generated: @myorg/provider-kysely
// Wraps Kysely SDK with Effect interface
//
// For this example, we use an in-memory store to demonstrate
// the architecture without requiring a real database.

/**
 * In-memory user store for demonstration
 * In production, this would be replaced by the actual Kysely provider
 */
interface UserStore {
  readonly users: Map<string, User>;
}

class UserStoreService extends Context.Tag("UserStoreService")<
  UserStoreService,
  Ref.Ref<UserStore>
>() {}

const UserStoreLive = Layer.effect(UserStoreService, Ref.make<UserStore>({ users: new Map() }));

// ============================================================================
// LAYER 3: INFRASTRUCTURE (Repository Pattern)
// ============================================================================
//
// After running: mlg generate data-access user
// You would have: @myorg/data-access-user
//
// In production this would use DatabaseService from @myorg/infra-database
// which provides typed Kysely queries. For this example, we use
// the in-memory store.

/**
 * User repository interface
 */
interface UserRepositoryInterface {
  readonly create: (email: string, name: string | null) => Effect.Effect<User>;
  readonly findByEmail: (email: string) => Effect.Effect<User | null>;
  readonly findById: (id: string) => Effect.Effect<User | null>;
}

class UserRepository extends Context.Tag("UserRepository")<
  UserRepository,
  UserRepositoryInterface
>() {}

const UserRepositoryLive = Layer.effect(
  UserRepository,
  Effect.gen(function* () {
    const storeRef = yield* UserStoreService;

    return {
      create: (email: string, name: string | null) =>
        Effect.gen(function* () {
          const store = yield* Ref.get(storeRef);
          const now = new Date();
          const user: User = {
            id: crypto.randomUUID(),
            email,
            name,
            createdAt: now,
            updatedAt: now,
          };
          store.users.set(user.id, user);
          yield* Ref.set(storeRef, store);
          return user;
        }),

      findByEmail: (email: string) =>
        Effect.gen(function* () {
          const store = yield* Ref.get(storeRef);
          for (const user of store.users.values()) {
            if (user.email === email) {
              return user;
            }
          }
          return null;
        }),

      findById: (id: string) =>
        Effect.gen(function* () {
          const store = yield* Ref.get(storeRef);
          return store.users.get(id) ?? null;
        }),
    };
  }),
);

// ============================================================================
// LAYER 4: FEATURE (Business Logic)
// ============================================================================
//
// After running: mlg generate feature user-management
// You would have: @myorg/feature-user-management

/**
 * User service interface - business logic operations
 */
interface UserServiceInterface {
  readonly createUser: (email: string, name?: string) => Effect.Effect<User>;
  readonly getUserByEmail: (email: string) => Effect.Effect<User | null>;
}

class UserService extends Context.Tag("UserService")<UserService, UserServiceInterface>() {}

const UserServiceLive = Layer.effect(
  UserService,
  Effect.gen(function* () {
    const repo = yield* UserRepository;

    return {
      createUser: (email: string, name?: string) =>
        Effect.gen(function* () {
          yield* Console.log(`📝 Creating user: ${email}`);
          const user = yield* repo.create(email, name ?? null);
          yield* Console.log(`✅ User created: ${user.id}`);
          return user;
        }),

      getUserByEmail: (email: string) =>
        Effect.gen(function* () {
          yield* Console.log(`🔍 Finding user: ${email}`);
          const user = yield* repo.findByEmail(email);
          if (user) {
            yield* Console.log(`✅ User found: ${user.id}`);
          } else {
            yield* Console.log(`❌ User not found: ${email}`);
          }
          return user;
        }),
    };
  }),
);

// ============================================================================
// COMPLETE LAYER COMPOSITION
// ============================================================================

/**
 * Complete application layer
 *
 * This shows how all layers compose together:
 *
 * UserService (Feature)
 *   ↓ depends on
 * UserRepository (Data Access)
 *   ↓ depends on
 * UserStoreService (Provider)
 *
 * Layer.provide chains them: Feature → Data Access → Provider
 *
 * In production, UserStoreService would be replaced with DatabaseService
 * which uses Kysely for typed database queries.
 */
const AppLayer = UserServiceLive.pipe(
  Layer.provide(UserRepositoryLive),
  Layer.provide(UserStoreLive),
);

// ============================================================================
// EXAMPLE APPLICATION
// ============================================================================

const program = Effect.gen(function* () {
  const userService = yield* UserService;

  yield* Console.log("\n🚀 Starting User Management Example\n");
  yield* Console.log(`${"=".repeat(51)}\n`);

  // Create a user
  yield* Console.log("📋 Step 1: Create User");
  const newUser = yield* userService.createUser("alice@example.com", "Alice Smith");
  yield* Console.log(`   User ID: ${newUser.id}\n`);

  // Find the user
  yield* Console.log("📋 Step 2: Find User by Email");
  const foundUser = yield* userService.getUserByEmail("alice@example.com");
  if (foundUser) {
    yield* Console.log(`   Found: ${foundUser.name} (${foundUser.email})\n`);
  }

  // Try to find non-existent user
  yield* Console.log("📋 Step 3: Find Non-Existent User");
  const notFound = yield* userService.getUserByEmail("bob@example.com");
  yield* Console.log(`   Result: ${notFound ? "Found" : "Not found"}\n`);

  yield* Console.log("=".repeat(51));
  yield* Console.log("\n✅ Example completed successfully!\n");

  return "Success";
});

// ============================================================================
// RUN THE APPLICATION
// ============================================================================

/**
 * Run this example:
 *
 * 1. Install dependencies:
 *    pnpm install
 *
 * 2. Build all libraries:
 *    pnpm build
 *
 * 3. Run the example:
 *    tsx examples/app.ts
 *
 * Expected output:
 * - User creation with auto-generated ID
 * - User lookup by email (success)
 * - User lookup by email (not found)
 */

// Uncomment to run:
// program.pipe(
//   Effect.provide(AppLayer),
//   Effect.runPromise
// ).then(
//   (result) => console.log("Result:", result),
//   (error) => console.error("Error:", error)
// )

/**
 * Key Takeaways:
 *
 * 1. **Layer Composition**: Use Layer.provide to chain dependencies
 * 2. **Dependency Injection**: Use yield* to access services
 * 3. **Type Safety**: All services are fully typed
 * 4. **Effect Patterns**: Use Effect.gen for sequential operations
 * 5. **Clean Architecture**: Each layer has a single responsibility
 *
 * Next Steps:
 *
 * 1. Create actual Prisma schema: prisma/schemas/user.prisma
 * 2. Generate contract: pnpm prisma:generate
 * 3. Generate data-access: mlg generate data-access user
 * 4. Generate feature: mlg generate feature user-management
 * 5. Replace simulated layers with actual generated libraries
 */

export { program, AppLayer };
