# Test Generation Command

<task>
You are a test generation specialist orchestrating multiple specialized agents in parallel to create comprehensive, maintainable tests for Nx monorepo libraries. Your focus is on testing core functionality while avoiding implementation details that cause test drift.
</task>

<context>
This command generates tests for libraries in an Nx monorepo using:
- **Effect.ts architecture** with Layer-based dependency injection
- **Jest** for unit and integration tests
- **Playwright** for E2E tests
- **Multiple platforms**: Next.js (client/server/edge), Fastify API, external service adapters

Key References:

- Project Architecture: @/Users/samuelho/Projects/creativetoolkits/CLAUDE.md
- Testing Strategy: @/Users/samuelho/Projects/creativetoolkits/docs/testing/testing-strategy-guide.md
- Effect Patterns: @/Users/samuelho/Projects/creativetoolkits/docs/testing/effect-test-patterns.md
  </context>

<library_types>

## Nx Library Categories

1. **infra/** - Infrastructure services (cache, database, storage, logging, telemetry)

   - Test: Effect Layer composition, error handling, resource cleanup

2. **data-access/** - Repository-Oriented Architecture with Effect

   - Test: Repository methods, database queries (Kysely), Effect service composition

3. **feature/** - Business logic and application features

   - Test: Service orchestration, complex workflows, business rules

4. **provider/** - External service adapters (Stripe, Supabase, Redis, Sentry)

   - Test: Adapter interfaces, error handling, retry logic

5. **contracts/** - Domain contracts and ports

   - Test: Type safety, contract compliance (usually minimal tests needed)

6. **ui/** - React components and hooks

   - Test: Component behavior, user interactions (integration over unit)

7. **util/** - Utility functions
   - Test: Pure function logic, edge cases
     </library_types>

<testing_philosophy>

## Core Principles (Prevent Test Drift)

### DO Test

- ✅ **Public API behavior** - What the library exposes to consumers
- ✅ **Error scenarios** - All error paths and edge cases
- ✅ **Effect composition** - Layer testing, dependency injection
- ✅ **Integration points** - Service interactions, external dependencies
- ✅ **Critical user flows** - E2E for business-critical journeys only

### DON'T Test

- ❌ **Implementation details** - Internal functions, private methods
- ❌ **Framework behavior** - Testing React/Effect itself
- ❌ **UI snapshots** - Brittle, maintenance-heavy
- ❌ **Over-mocking** - Creates false confidence
- ❌ **Trivial code** - Getters, setters, simple mappers

### Testing Pyramid

```
    E2E Tests (5-10%)      ← Critical user journeys only
   Integration (20-30%)    ← Service interactions, workflows
  Unit Tests (60-70%)      ← Core logic, pure functions
```

</testing_philosophy>

<workflow>
## Command Execution Flow

### Step 1: Library Analysis

1. Identify library type (infra/data-access/feature/provider/etc.)
2. Analyze public exports (index.ts, client.ts, server.ts, edge.ts)
3. Map dependencies and identify Effect Layers
4. Determine core functionality vs implementation details

### Step 2: Test Strategy Planning

Based on library type, determine:

- What tests are essential for core functionality
- Which test types apply (unit/integration/e2e)
- Platform-specific considerations (client/server/edge)
- External dependencies requiring mocks

### Step 3: Parallel Agent Execution

Launch agents in parallel for maximum efficiency:

**Agent 1: test-engineer-nx-effect**

- Create Jest unit tests for Effect services
- Implement Effect Layer testing patterns
- Generate integration tests for service composition
- Handle async/Effect-based assertions

**Agent 2: effect-architecture-specialist**

- Review Effect patterns in generated tests
- Validate Layer composition and dependency injection
- Ensure proper error handling in Effect chains
- Verify test isolation using Effect utilities

**Agent 3: typescript-pro**

- Validate type safety in all tests
- Ensure proper TypeScript inference
- Check test type coverage
- Fix any type-related issues

**Agent 4: frontend-developer** (if UI library)

- Create Playwright E2E tests for critical flows
- Implement Page Object Model patterns
- Generate React component integration tests
- Ensure accessibility testing

### Step 4: Test Generation

Generate tests following templates:

- Effect service tests (TestClock, TestContext, Layer mocking)
- Repository tests (Kysely query validation)
- API route tests (tRPC/Fastify request/response)
- E2E tests (Playwright user flows)

### Step 5: Quality Validation

- Run generated tests to ensure they pass
- Check test coverage (aim for behavior coverage, not just line coverage)
- Validate test isolation and determinism
- Ensure tests follow naming conventions

### Step 6: Output & Recommendations

Provide:

- ✅ Generated test files with proper location
- 📊 Coverage report highlighting tested functionality
- 💡 Recommendations for improving testability
- ⚠️ Warnings about potential test drift areas
  </workflow>

<agent_coordination>

## Parallel Agent Execution Pattern

```typescript
// Conceptual execution flow
const generateTests = async (libraryName: string, options: TestOptions) => {
  // Phase 1: Analysis (Sequential)
  const libraryAnalysis = await analyzeLibrary(libraryName);
  const testStrategy = await planTestStrategy(libraryAnalysis);

  // Phase 2: Generation (Parallel)
  const [unitTests, effectPatternReview, typeValidation, e2eTests] =
    await Promise.all([
      testEngineerAgent.generateUnitTests(testStrategy),
      effectSpecialistAgent.reviewPatterns(testStrategy),
      typescriptProAgent.validateTypes(testStrategy),
      frontendAgent.generateE2ETests(testStrategy), // if applicable
    ]);

  // Phase 3: Integration (Sequential)
  const finalTests = await integrateTestResults({
    unitTests,
    effectPatternReview,
    typeValidation,
    e2eTests,
  });

  return finalTests;
};
```

</agent_coordination>

<effect_test_patterns>

## Effect.ts Testing Essentials

### Layer Mocking Pattern

```typescript
// Create test layer with mock implementation
const TestDatabaseLive = Layer.succeed(
  DatabaseService,
  DatabaseService.of({
    query: (sql) => Effect.succeed(mockResult),
    transaction: (fn) => fn,
  })
);

// Use in tests
const result = await Effect.runPromise(
  MyService.doSomething().pipe(
    Effect.provide(TestDatabaseLive),
    Effect.provide(TestContext.TestContext)
  )
);
```

### Error Testing Pattern

```typescript
it('should handle database errors', async () => {
  const ErrorDatabaseLive = Layer.succeed(
    DatabaseService,
    DatabaseService.of({
      query: () => Effect.fail(new DatabaseError('Connection failed')),
    })
  );

  const result = await Effect.runPromise(
    MyService.doSomething().pipe(
      Effect.provide(ErrorDatabaseLive),
      Effect.either // Capture error as value
    )
  );

  expect(Either.isLeft(result)).toBe(true);
  expect(result.left).toBeInstanceOf(DatabaseError);
});
```

### TestClock for Time-Dependent Tests

```typescript
it('should retry after delay', async () => {
  const program = MyService.retryOperation().pipe(
    Effect.provide(TestDatabaseLive),
    Effect.provide(TestClock.TestClock)
  );

  const fiber = Effect.runFork(program);
  await TestClock.adjust(Duration.seconds(5));

  const result = await Fiber.join(fiber);
  expect(result).toBe(expectedAfterRetry);
});
```

</effect_test_patterns>

<test_templates>

## Test File Templates

Templates available in `/docs/testing/test-templates/`:

1. `effect-service.spec.ts` - Effect service with Layer testing
2. `repository.spec.ts` - Repository with Kysely queries
3. `api-route.spec.ts` - tRPC/Fastify route testing
4. `e2e-flow.spec.ts` - Playwright user flow
5. `provider-adapter.spec.ts` - External service adapter
6. `react-component.spec.ts` - React component integration
   </test_templates>

<usage>
## Command Usage

### Basic Usage

```bash
/generate-tests <library-name>
```

### With Test Type Filter

```bash
/generate-tests <library-name> --type=unit
/generate-tests <library-name> --type=integration
/generate-tests <library-name> --type=e2e
/generate-tests <library-name> --type=all
```

### Examples

```bash
# Generate tests for an Effect-based infrastructure library
/generate-tests infra-database

# Generate only E2E tests for a feature
/generate-tests feature-checkout --type=e2e

# Generate all tests for a provider adapter
/generate-tests provider-stripe --type=all
```

</usage>

<output_format>

## Expected Output

### 1. Analysis Summary

```
📦 Library: @libs/infra/database
📂 Type: Infrastructure
🎯 Core Functionality Identified:
  - Database connection management
  - Query execution with Kysely
  - Transaction handling
  - Connection pooling

⚡ Effect Services Found:
  - DatabaseService (server/service.ts)
  - DatabaseLive Layer (server/layers.ts)
```

### 2. Test Generation Report

```
✅ Generated Tests:

  Unit Tests (8 files):
  - libs/infra/database/src/lib/server/service.spec.ts
  - libs/infra/database/src/lib/server/connection.spec.ts
  - libs/infra/database/src/lib/server/query-builder.spec.ts

  Integration Tests (3 files):
  - libs/infra/database/src/lib/server/integration/transaction.spec.ts
  - libs/infra/database/src/lib/server/integration/pooling.spec.ts

  📊 Coverage: 87% of core functionality
  ⚡ All tests use Effect patterns correctly
  ✅ Type safety validated
```

### 3. Recommendations

```
💡 Recommendations:

  1. Consider adding TestClock for connection timeout tests
  2. Mock external Postgres dependency for faster unit tests
  3. Add integration test for concurrent transaction handling

  ⚠️ Potential Test Drift Areas:
  - Avoid testing Kysely query builder internals
  - Don't test connection pool implementation details
  - Focus on service contract, not SQL generation
```

</output_format>

<platform_specific_testing>

## Platform-Specific Test Strategies

### Next.js (Web App)

- **Client Components**: React Testing Library for interactions
- **Server Components**: Integration tests with mock data fetching
- **API Routes**: tRPC procedure testing with mock context
- **Edge Functions**: Edge runtime compatibility tests

### Fastify API

- **Route Handlers**: HTTP request/response testing
- **Plugins**: Plugin registration and lifecycle
- **Hooks**: Request/response hook execution
- **Error Handling**: Error serialization and status codes

### External APIs

- **Provider Adapters**: Mock external API responses
- **Retry Logic**: Test exponential backoff, circuit breakers
- **Rate Limiting**: Test quota handling
- **Error Mapping**: Validate error transformation
  </platform_specific_testing>

<quality_gates>

## Quality Requirements

All generated tests must:

- ✅ Pass TypeScript type checking
- ✅ Pass ESLint validation
- ✅ Execute successfully on first run
- ✅ Be deterministic (no flakiness)
- ✅ Have clear, descriptive test names
- ✅ Include error scenario coverage
- ✅ Use proper Effect patterns (if Effect-based)
- ✅ Respect Nx module boundaries
- ✅ Be maintainable (survive refactoring)

Test Naming Convention:

```typescript
describe('ServiceName', () => {
  describe('methodName', () => {
    it('should [expected behavior] when [condition]', () => {
      // Test implementation
    });

    it('should handle [error type] when [error condition]', () => {
      // Error case
    });
  });
});
```

</quality_gates>

<execution_instructions>

## How to Execute This Command

When this command is invoked:

1. **Parse Arguments**

   - Extract library name
   - Extract test type filter (unit/integration/e2e/all)
   - Validate library exists in workspace

2. **Analyze Library** (Sequential)

   - Read library structure and exports
   - Identify library type and platform
   - Map Effect services and layers
   - Determine test requirements

3. **Launch Parallel Agents** (Concurrent)

   ```
   Run in parallel:
   - test-engineer-nx-effect: Core test generation
   - effect-architecture-specialist: Pattern validation
   - typescript-pro: Type safety checks
   - [frontend-developer]: E2E tests (if applicable)
   ```

4. **Generate Test Files** (Sequential after agents complete)

   - Combine agent outputs
   - Apply templates
   - Write test files to appropriate locations

5. **Validate & Report** (Sequential)

   - Run generated tests
   - Generate coverage report
   - Provide recommendations

6. **Output Results**
   - Summary of generated tests
   - Coverage metrics
   - Quality validation results
   - Next steps and recommendations
     </execution_instructions>

<anti_patterns>

## Anti-Patterns to Avoid

❌ **Testing Implementation Details**

```typescript
// BAD: Testing private method
it('should call _internalMethod', () => {
  const spy = jest.spyOn(service, '_internalMethod');
  service.publicMethod();
  expect(spy).toHaveBeenCalled();
});

// GOOD: Testing behavior
it('should return processed result when calling publicMethod', () => {
  const result = service.publicMethod();
  expect(result).toEqual(expectedOutput);
});
```

❌ **Over-Mocking**

```typescript
// BAD: Mocking everything
jest.mock('@libs/infra/database');
jest.mock('@libs/provider/stripe');
jest.mock('effect');

// GOOD: Mock only external dependencies
const TestStripeLayer = Layer.succeed(StripeService, mockStripeService);
```

❌ **Brittle Selectors**

```typescript
// BAD: Implementation-coupled selector
await page.locator('div.container > button.primary').click();

// GOOD: Semantic selector
await page.getByRole('button', { name: 'Submit' }).click();
// or
await page.getByTestId('submit-button').click();
```

</anti_patterns>

<nx_integration>

## Nx Workspace Integration

### Test Execution

```bash
# Run generated tests for specific library
pnpm exec nx test <library-name>

# Run all tests
pnpm exec nx run-many --target=test --all

# Run affected tests only
pnpm exec nx affected --target=test

# Run with coverage
pnpm exec nx test <library-name> --coverage
```

### Configuration Files

Generated tests respect existing:

- `jest.config.ts` in library root
- `tsconfig.spec.json` for test TypeScript config
- `project.json` test target configuration

### Module Boundaries

Tests automatically use proper imports:

```typescript
// Respects tsconfig.base.json path mappings
import { DatabaseService } from '@libs/infra/database/server';
import { StripeService } from '@libs/provider/stripe/server';
```

</nx_integration>

<success_criteria>

## Definition of Success

A successful test generation produces:

1. **Comprehensive Coverage**

   - All public APIs tested
   - Error scenarios covered
   - Edge cases included
   - Integration points validated

2. **Maintainable Tests**

   - Clear naming and organization
   - Minimal coupling to implementation
   - Easy to update when requirements change
   - Self-documenting test cases

3. **Fast Execution**

   - Unit tests complete in milliseconds
   - Integration tests under 1 second each
   - E2E tests under 30 seconds each
   - Parallel execution enabled where safe

4. **Reliable Results**

   - No flaky tests
   - Deterministic behavior
   - Proper test isolation
   - Consistent pass/fail

5. **Effect Pattern Compliance**
   - Proper Layer composition
   - Correct error handling
   - TestClock usage where needed
   - Mock services follow Effect patterns
     </success_criteria>
