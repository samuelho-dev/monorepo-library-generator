/**
 * Supabase Provider Spec Template
 *
 * Generates comprehensive tests for all Supabase services.
 * Each service has 8 tests covering Effect layer patterns.
 *
 * @module monorepo-library-generator/provider/templates/supabase/spec
 */

import { TypeScriptBuilder } from "../../../../utils/code-builder"
import type { ProviderTemplateOptions } from "../../../../utils/types"

/**
 * Generate Supabase provider service.spec.ts file
 */
export function generateSupabaseSpecFile(options: ProviderTemplateOptions) {
  const builder = new TypeScriptBuilder()
  const { packageName } = options

  builder.addFileHeader({
    title: "Supabase Provider Tests",
    description: `Comprehensive tests for Supabase provider services.

Tests all three services:
- SupabaseClient (8 tests)
- SupabaseAuth (8 tests)
- SupabaseStorage (8 tests)

Total: 24 tests covering Effect layer patterns.`,
    module: `${packageName}/tests`
  })
  builder.addBlankLine()

  // Imports
  builder.addImports([
    { from: "effect", imports: ["Effect", "Layer", "Option"] },
    { from: "vitest", imports: ["describe", "it", "expect"] }
  ])
  builder.addRaw(`import { SupabaseClient } from "./client";
import { SupabaseAuth } from "./auth";
import { SupabaseStorage } from "./storage";
import { SupabaseError } from "./errors";`)
  builder.addBlankLine()

  // SupabaseClient tests
  builder.addSectionComment("SupabaseClient Tests")
  builder.addBlankLine()

  builder.addRaw(`describe("SupabaseClient", () => {
  // Test 1: Service Interface
  describe("Service Interface", () => {
    it("should provide config and methods", async () => {
      const program = Effect.gen(function* () {
        const client = yield* SupabaseClient;
        expect(client.config).toBeDefined();
        expect(client.getClient).toBeDefined();
        expect(client.healthCheck).toBeDefined();
        return true;
      });

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(SupabaseClient.Test))
      );
      expect(result).toBe(true);
    });
  });

  // Test 2: Layer Composition
  describe("Layer Composition", () => {
    it("should compose with other services", async () => {
      const layer = Layer.mergeAll(SupabaseClient.Test);

      const program = Effect.gen(function* () {
        const client = yield* SupabaseClient;
        return client.config.url;
      });

      const result = await Effect.runPromise(program.pipe(Effect.provide(layer)));
      expect(result).toBe("https://test.supabase.co");
    });
  });

  // Test 3: Layer.succeed pattern
  describe("Layer Types", () => {
    it("should work with Layer.succeed (sync)", async () => {
      const customLayer = Layer.succeed(SupabaseClient, {
        config: { url: "https://custom.supabase.co", anonKey: "custom-key" },
        getClient: () => Effect.fail(new SupabaseError({ message: "Not implemented" })),
        healthCheck: () => Effect.succeed(true),
      });

      const program = Effect.gen(function* () {
        const client = yield* SupabaseClient;
        return client.config.url;
      });

      const result = await Effect.runPromise(program.pipe(Effect.provide(customLayer)));
      expect(result).toBe("https://custom.supabase.co");
    });

    // Test 4: Layer.effect pattern
    it("should work with Layer.effect (async)", async () => {
      const asyncLayer = Layer.effect(
        SupabaseClient,
        Effect.succeed({
          config: { url: "https://async.supabase.co", anonKey: "async-key" },
          getClient: () => Effect.fail(new SupabaseError({ message: "Not implemented" })),
          healthCheck: () => Effect.succeed(true),
        })
      );

      const program = Effect.gen(function* () {
        const client = yield* SupabaseClient;
        return client.config.url;
      });

      const result = await Effect.runPromise(program.pipe(Effect.provide(asyncLayer)));
      expect(result).toBe("https://async.supabase.co");
    });

    // Test 5: Layer.scoped pattern
    it("should work with Layer.scoped (resource)", async () => {
      let initialized = false;
      let finalized = false;

      const scopedLayer = Layer.scoped(
        SupabaseClient,
        Effect.acquireRelease(
          Effect.sync(() => {
            initialized = true;
            return {
              config: { url: "https://scoped.supabase.co", anonKey: "scoped-key" },
              getClient: () => Effect.fail(new SupabaseError({ message: "Not implemented" })),
              healthCheck: () => Effect.succeed(true),
            };
          }),
          () =>
            Effect.sync(() => {
              finalized = true;
            })
        )
      );

      const program = Effect.gen(function* () {
        const client = yield* SupabaseClient;
        return client.config.url;
      });

      const result = await Effect.runPromise(
        Effect.scoped(program.pipe(Effect.provide(scopedLayer)))
      );
      expect(result).toBe("https://scoped.supabase.co");
      expect(initialized).toBe(true);
      expect(finalized).toBe(true);
    });
  });

  // Test 6: Layer isolation
  describe("Layer Isolation", () => {
    it("should isolate state with Layer.fresh", async () => {
      let callCount = 0;

      const countingLayer = Layer.effect(
        SupabaseClient,
        Effect.sync(() => {
          callCount++;
          return {
            config: { url: \`https://call-\${callCount}.supabase.co\`, anonKey: "key" },
            getClient: () => Effect.fail(new SupabaseError({ message: "Not implemented" })),
            healthCheck: () => Effect.succeed(true),
          };
        })
      );

      const program = Effect.gen(function* () {
        const client = yield* SupabaseClient;
        return client.config.url;
      });

      // With fresh, each use creates a new instance
      const fresh = Layer.fresh(countingLayer);
      await Effect.runPromise(program.pipe(Effect.provide(fresh)));
      await Effect.runPromise(program.pipe(Effect.provide(fresh)));
      expect(callCount).toBeGreaterThan(1);
    });
  });

  // Test 7: Health check
  describe("Health Check", () => {
    it("should pass health check in test mode", async () => {
      const program = Effect.gen(function* () {
        const client = yield* SupabaseClient;
        return yield* client.healthCheck();
      });

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(SupabaseClient.Test))
      );
      expect(result).toBe(true);
    });
  });

  // Test 8: Custom configuration
  describe("Custom Configuration", () => {
    it("should accept custom config via make()", async () => {
      const customConfig = {
        url: "https://my-project.supabase.co",
        anonKey: "my-anon-key",
      };

      const layer = SupabaseClient.make(customConfig);

      const program = Effect.gen(function* () {
        const client = yield* SupabaseClient;
        return client.config;
      });

      const result = await Effect.runPromise(program.pipe(Effect.provide(layer)));
      expect(result.url).toBe(customConfig.url);
      expect(result.anonKey).toBe(customConfig.anonKey);
    });
  });
});`)
  builder.addBlankLine()

  // SupabaseAuth tests
  builder.addSectionComment("SupabaseAuth Tests")
  builder.addBlankLine()

  builder.addRaw(`describe("SupabaseAuth", () => {
  // Test 1: Service Interface
  describe("Service Interface", () => {
    it("should provide auth methods", async () => {
      const program = Effect.gen(function* () {
        const auth = yield* SupabaseAuth;
        expect(auth.signInWithPassword).toBeDefined();
        expect(auth.signUp).toBeDefined();
        expect(auth.signOut).toBeDefined();
        expect(auth.verifyToken).toBeDefined();
        expect(auth.getSession).toBeDefined();
        expect(auth.getUser).toBeDefined();
        return true;
      });

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(SupabaseAuth.Test))
      );
      expect(result).toBe(true);
    });
  });

  // Test 2: Sign in
  describe("Authentication", () => {
    it("should sign in with password", async () => {
      const program = Effect.gen(function* () {
        const auth = yield* SupabaseAuth;
        const result = yield* auth.signInWithPassword({
          email: "test@example.com",
          password: "password123",
        });
        return result;
      });

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(SupabaseAuth.Test))
      );
      expect(result.user).toBeDefined();
      expect(result.user.id).toBe("test-user-id");
    });

    // Test 3: Sign up
    it("should sign up new user", async () => {
      const program = Effect.gen(function* () {
        const auth = yield* SupabaseAuth;
        const result = yield* auth.signUp({
          email: "new@example.com",
          password: "password123",
        });
        return result;
      });

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(SupabaseAuth.Test))
      );
      expect(result.user).toBeDefined();
      expect(result.user.id).toBe("new-user-id");
    });

    // Test 4: Verify token
    it("should verify access token", async () => {
      const program = Effect.gen(function* () {
        const auth = yield* SupabaseAuth;
        const user = yield* auth.verifyToken("test-access-token");
        return user;
      });

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(SupabaseAuth.Test))
      );
      expect(result.id).toBe("test-user-id");
      expect(result.email).toBe("test@example.com");
    });
  });

  // Test 5: Session management
  describe("Session Management", () => {
    it("should get current session", async () => {
      const program = Effect.gen(function* () {
        const auth = yield* SupabaseAuth;
        const session = yield* auth.getSession();
        return session;
      });

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(SupabaseAuth.Test))
      );
      expect(Option.isSome(result)).toBe(true);
      if (Option.isSome(result)) {
        expect(result.value.access_token).toBe("test-access-token");
      }
    });

    // Test 6: Get user
    it("should get current user", async () => {
      const program = Effect.gen(function* () {
        const auth = yield* SupabaseAuth;
        const user = yield* auth.getUser();
        return user;
      });

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(SupabaseAuth.Test))
      );
      expect(Option.isSome(result)).toBe(true);
    });
  });

  // Test 7: Layer composition
  describe("Layer Composition", () => {
    it("should compose Test layer", async () => {
      const program = Effect.gen(function* () {
        const auth = yield* SupabaseAuth;
        yield* auth.signOut();
        return true;
      });

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(SupabaseAuth.Test))
      );
      expect(result).toBe(true);
    });
  });

  // Test 8: getUserFromToken for RPC
  describe("RPC Integration", () => {
    it("should get user from token (for RPC middleware)", async () => {
      const program = Effect.gen(function* () {
        const auth = yield* SupabaseAuth;
        const user = yield* auth.getUserFromToken("bearer-token");
        return user;
      });

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(SupabaseAuth.Test))
      );
      expect(result.id).toBe("test-user-id");
      expect(result.role).toBe("authenticated");
    });
  });
});`)
  builder.addBlankLine()

  // SupabaseStorage tests
  builder.addSectionComment("SupabaseStorage Tests")
  builder.addBlankLine()

  builder.addRaw(`describe("SupabaseStorage", () => {
  // Test 1: Service Interface
  describe("Service Interface", () => {
    it("should provide storage methods", async () => {
      const program = Effect.gen(function* () {
        const storage = yield* SupabaseStorage;
        expect(storage.upload).toBeDefined();
        expect(storage.download).toBeDefined();
        expect(storage.remove).toBeDefined();
        expect(storage.list).toBeDefined();
        expect(storage.createSignedUrl).toBeDefined();
        expect(storage.getPublicUrl).toBeDefined();
        return true;
      });

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(SupabaseStorage.Test))
      );
      expect(result).toBe(true);
    });
  });

  // Test 2: Upload
  describe("File Operations", () => {
    it("should upload file", async () => {
      const program = Effect.gen(function* () {
        const storage = yield* SupabaseStorage;
        const result = yield* storage.upload(
          "test-bucket",
          "test-file.txt",
          new Blob(["test content"])
        );
        return result;
      });

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(SupabaseStorage.Test))
      );
      expect(result.name).toBe("test-file.txt");
    });

    // Test 3: Download
    it("should download file", async () => {
      const program = Effect.gen(function* () {
        const storage = yield* SupabaseStorage;
        // First upload
        yield* storage.upload("test-bucket", "download-test.txt", new Blob(["test"]));
        // Then download
        const blob = yield* storage.download("test-bucket", "download-test.txt");
        return blob;
      });

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(SupabaseStorage.Test))
      );
      expect(result).toBeInstanceOf(Blob);
    });

    // Test 4: List
    it("should list files in bucket", async () => {
      const program = Effect.gen(function* () {
        const storage = yield* SupabaseStorage;
        yield* storage.upload("test-bucket", "list-test.txt", new Blob(["test"]));
        const files = yield* storage.list("test-bucket");
        return files;
      });

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(SupabaseStorage.Test))
      );
      expect(Array.isArray(result)).toBe(true);
    });

    // Test 5: Delete
    it("should delete file", async () => {
      const program = Effect.gen(function* () {
        const storage = yield* SupabaseStorage;
        yield* storage.upload("test-bucket", "delete-test.txt", new Blob(["test"]));
        yield* storage.remove("test-bucket", ["delete-test.txt"]);
        return true;
      });

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(SupabaseStorage.Test))
      );
      expect(result).toBe(true);
    });
  });

  // Test 6: URL generation
  describe("URL Generation", () => {
    it("should create signed URL", async () => {
      const program = Effect.gen(function* () {
        const storage = yield* SupabaseStorage;
        const url = yield* storage.createSignedUrl("test-bucket", "file.txt", {
          expiresIn: 3600,
        });
        return url;
      });

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(SupabaseStorage.Test))
      );
      expect(result).toContain("test-bucket");
    });

    // Test 7: Public URL
    it("should get public URL", async () => {
      const program = Effect.gen(function* () {
        const storage = yield* SupabaseStorage;
        const url = yield* storage.getPublicUrl("public-bucket", "file.txt");
        return url;
      });

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(SupabaseStorage.Test))
      );
      expect(result).toContain("public-bucket");
      expect(result).toContain("file.txt");
    });
  });

  // Test 8: Bucket operations
  describe("Bucket Operations", () => {
    it("should list and manage buckets", async () => {
      const program = Effect.gen(function* () {
        const storage = yield* SupabaseStorage;
        const buckets = yield* storage.listBuckets();
        expect(Array.isArray(buckets)).toBe(true);

        // Create bucket
        const newBucket = yield* storage.createBucket("new-bucket", { public: true });
        expect(newBucket.name).toBe("new-bucket");

        // Get bucket
        const bucket = yield* storage.getBucket("new-bucket");
        expect(Option.isSome(bucket)).toBe(true);

        // Delete bucket
        yield* storage.deleteBucket("new-bucket");
        return true;
      });

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(SupabaseStorage.Test))
      );
      expect(result).toBe(true);
    });
  });
});`)

  return builder.toString()
}
