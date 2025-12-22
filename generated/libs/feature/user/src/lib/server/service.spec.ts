import { describe, expect, it } from "@effect/vitest";
import { Effect, Layer, Option } from "effect";
import { UserService } from "./service";

/**
 * UserService Tests
 *
 * Uses @effect/vitest for Effect-based testing.

Uses UserService.TestLayer which composes:
- UserService.Live
- UserRepository.Live
- DatabaseService.Test (in-memory)
 *
 */

describe("UserService", () => {
  it.scoped("should create and retrieve user", () =>
    Effect.gen(function* () {
      const service = yield* UserService;

      const created = yield* service.create({ name: "Test User" });
      expect(created).toBeDefined();

      const result = yield* service.get((created as { id: string }).id);
      expect(Option.isSome(result)).toBe(true);
    }).pipe(Effect.provide(Layer.fresh(UserService.TestLayer))),
  );

  it.scoped("should list users with pagination", () =>
    Effect.gen(function* () {
      const service = yield* UserService;

      yield* service.create({ name: "First User" });
      yield* service.create({ name: "Second User" });

      const items = yield* service.findByCriteria({}, 0, 10);
      expect(items.length).toBeGreaterThan(0);

      const count = yield* service.count({});
      expect(count).toBeGreaterThan(0);
    }).pipe(Effect.provide(Layer.fresh(UserService.TestLayer))),
  );

  it.scoped("should update user", () =>
    Effect.gen(function* () {
      const service = yield* UserService;

      const created = yield* service.create({ name: "Original" });
      const id = (created as { id: string }).id;

      const updated = yield* service.update(id, { name: "Updated" });
      expect(Option.isSome(updated)).toBe(true);
    }).pipe(Effect.provide(Layer.fresh(UserService.TestLayer))),
  );

  it.scoped("should delete user", () =>
    Effect.gen(function* () {
      const service = yield* UserService;

      const created = yield* service.create({ name: "ToDelete" });
      const id = (created as { id: string }).id;

      yield* service.delete(id);

      const exists = yield* service.exists(id);
      expect(exists).toBe(false);
    }).pipe(Effect.provide(Layer.fresh(UserService.TestLayer))),
  );

  it.scoped("service methods should be defined", () =>
    Effect.gen(function* () {
      const service = yield* UserService;

      expect(service.get).toBeDefined();
      expect(service.findByCriteria).toBeDefined();
      expect(service.count).toBeDefined();
      expect(service.create).toBeDefined();
      expect(service.update).toBeDefined();
      expect(service.delete).toBeDefined();
      expect(service.exists).toBeDefined();
    }).pipe(Effect.provide(Layer.fresh(UserService.TestLayer))),
  );
});
