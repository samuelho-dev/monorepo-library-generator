/**
 * Dual-Mode MCP Handler Tests
 *
 * Tests that MCP handlers correctly use Nx or CLI mode based on workspace type.
 */

import { Effect } from "effect";
import { describe, expect, it, vi } from "vitest";
import type { McpResponse } from "../../infrastructure/output/formatter";
import { handleGenerateContract } from "./contract.handler";
import { handleGenerateDataAccess } from "./data-access.handler";
import { handleGenerateFeature } from "./feature.handler";
import { handleGenerateInfra } from "./infra.handler";
import { handleGenerateProvider } from "./provider.handler";

// Mock workspace detector to control workspace type
vi.mock("../utils/workspace-detector", () => ({
  detectWorkspace: vi.fn((path: string) => {
    // Detect based on path suffix for testing
    if (path.endsWith("/nx-workspace")) {
      return Effect.succeed({
        root: path,
        scope: "@test",
        type: "nx" as const,
        packageManager: "pnpm" as const,
      });
    } else if (path.endsWith("/pnpm-workspace")) {
      return Effect.succeed({
        root: path,
        scope: "@test",
        type: "pnpm" as const,
        packageManager: "pnpm" as const,
      });
    } else if (path.endsWith("/yarn-workspace")) {
      return Effect.succeed({
        root: path,
        scope: "@test",
        type: "yarn" as const,
        packageManager: "yarn" as const,
      });
    } else {
      return Effect.fail(new Error("Workspace not found"));
    }
  }),
  WorkspaceDetectionError: class WorkspaceDetectionError extends Error {
    readonly _tag = "WorkspaceDetectionError";
  },
}));

describe("Dual-Mode MCP Handlers", () => {
  describe("Contract Generator", () => {
    describe("Nx Mode", () => {
      it("should show 'Nx Generator' mode in dry-run", async () => {
        const input = {
          name: "product",
          workspaceRoot: "/test/nx-workspace",
          dryRun: true,
        };

        const result = await Effect.runPromise(handleGenerateContract(input));

        expect(result.success).toBe(true);
        expect(result.message).toContain("Mode: Nx Generator");
        expect(result.message).toContain("Type: nx");
      });

      it("should include workspace scope in dry-run", async () => {
        const input = {
          name: "product",
          workspaceRoot: "/test/nx-workspace",
          dryRun: true,
        };

        const result = await Effect.runPromise(handleGenerateContract(input));

        expect(result.success).toBe(true);
        expect(result.message).toContain("Scope: @test");
      });
    });

    describe("CLI Mode (pnpm)", () => {
      it("should show 'CLI (Agnostic)' mode in dry-run for pnpm workspace", async () => {
        const input = {
          name: "product",
          workspaceRoot: "/test/pnpm-workspace",
          dryRun: true,
        };

        const result = await Effect.runPromise(handleGenerateContract(input));

        expect(result.success).toBe(true);
        expect(result.message).toContain("Mode: CLI (Agnostic)");
        expect(result.message).toContain("Type: pnpm");
      });
    });

    describe("CLI Mode (yarn)", () => {
      it("should show 'CLI (Agnostic)' mode in dry-run for yarn workspace", async () => {
        const input = {
          name: "product",
          workspaceRoot: "/test/yarn-workspace",
          dryRun: true,
        };

        const result = await Effect.runPromise(handleGenerateContract(input));

        expect(result.success).toBe(true);
        expect(result.message).toContain("Mode: CLI (Agnostic)");
        expect(result.message).toContain("Type: yarn");
      });
    });

    describe("With Options", () => {
      it("should handle entities option in Nx mode", async () => {
        const input = {
          name: "product",
          workspaceRoot: "/test/nx-workspace",
          entities: ["Product", "Category"],
          includeCQRS: true,
          includeRPC: false,
          dryRun: true,
        };

        const result = await Effect.runPromise(handleGenerateContract(input));

        expect(result.success).toBe(true);
        expect(result.message).toContain("Entities: Product, Category");
        expect(result.message).toContain("CQRS: true");
        expect(result.message).toContain("RPC: false");
      });
    });
  });

  describe("Data-Access Generator", () => {
    it("should show correct mode for Nx workspace", async () => {
      const input = {
        name: "product",
        workspaceRoot: "/test/nx-workspace",
        dryRun: true,
      };

      const result = await Effect.runPromise(handleGenerateDataAccess(input));

      expect(result.success).toBe(true);
      expect(result.message).toContain("Mode: Nx Generator");
    });

    it("should show correct mode for pnpm workspace", async () => {
      const input = {
        name: "product",
        workspaceRoot: "/test/pnpm-workspace",
        dryRun: true,
      };

      const result = await Effect.runPromise(handleGenerateDataAccess(input));

      expect(result.success).toBe(true);
      expect(result.message).toContain("Mode: CLI (Agnostic)");
    });

    it("should handle contractDomain option", async () => {
      const input = {
        name: "product",
        workspaceRoot: "/test/nx-workspace",
        contractDomain: "product-v2",
        dryRun: true,
      };

      const result = await Effect.runPromise(handleGenerateDataAccess(input));

      expect(result.success).toBe(true);
      expect(result.message).toContain("Contract Domain: product-v2");
    });
  });

  describe("Feature Generator", () => {
    it("should show correct mode for Nx workspace", async () => {
      const input = {
        name: "auth",
        workspaceRoot: "/test/nx-workspace",
        platform: "node" as const,
        dryRun: true,
      };

      const result = await Effect.runPromise(handleGenerateFeature(input));

      expect(result.success).toBe(true);
      expect(result.message).toContain("Mode: Nx Generator");
    });

    it("should show correct mode for yarn workspace", async () => {
      const input = {
        name: "auth",
        workspaceRoot: "/test/yarn-workspace",
        platform: "node" as const,
        dryRun: true,
      };

      const result = await Effect.runPromise(handleGenerateFeature(input));

      expect(result.success).toBe(true);
      expect(result.message).toContain("Mode: CLI (Agnostic)");
    });

    it("should handle platform and feature options", async () => {
      const input = {
        name: "auth",
        workspaceRoot: "/test/nx-workspace",
        platform: "universal" as const,
        includeClientServer: true,
        includeRPC: true,
        includeCQRS: false,
        includeEdge: true,
        dryRun: true,
      };

      const result = await Effect.runPromise(handleGenerateFeature(input));

      expect(result.success).toBe(true);
      expect(result.message).toContain("Platform: universal");
      expect(result.message).toContain("Client/Server: true");
      expect(result.message).toContain("RPC: true");
      expect(result.message).toContain("CQRS: false");
      expect(result.message).toContain("Edge: true");
    });
  });

  describe("Infra Generator", () => {
    it("should show correct mode for Nx workspace", async () => {
      const input = {
        name: "cache",
        workspaceRoot: "/test/nx-workspace",
        platform: "node" as const,
        dryRun: true,
      };

      const result = await Effect.runPromise(handleGenerateInfra(input));

      expect(result.success).toBe(true);
      expect(result.message).toContain("Mode: Nx Generator");
    });

    it("should show correct mode for pnpm workspace", async () => {
      const input = {
        name: "cache",
        workspaceRoot: "/test/pnpm-workspace",
        platform: "node" as const,
        dryRun: true,
      };

      const result = await Effect.runPromise(handleGenerateInfra(input));

      expect(result.success).toBe(true);
      expect(result.message).toContain("Mode: CLI (Agnostic)");
    });
  });

  describe("Provider Generator", () => {
    it("should show correct mode for Nx workspace", async () => {
      const input = {
        name: "stripe",
        workspaceRoot: "/test/nx-workspace",
        externalService: "Stripe",
        platform: "node" as const,
        dryRun: true,
      };

      const result = await Effect.runPromise(handleGenerateProvider(input));

      expect(result.success).toBe(true);
      expect(result.message).toContain("Mode: Nx Generator");
    });

    it("should show correct mode for yarn workspace", async () => {
      const input = {
        name: "stripe",
        workspaceRoot: "/test/yarn-workspace",
        externalService: "Stripe",
        platform: "node" as const,
        dryRun: true,
      };

      const result = await Effect.runPromise(handleGenerateProvider(input));

      expect(result.success).toBe(true);
      expect(result.message).toContain("Mode: CLI (Agnostic)");
    });

    it("should include external service in output", async () => {
      const input = {
        name: "stripe",
        workspaceRoot: "/test/nx-workspace",
        externalService: "Stripe",
        platform: "node" as const,
        dryRun: true,
      };

      const result = await Effect.runPromise(handleGenerateProvider(input));

      expect(result.success).toBe(true);
      expect(result.message).toContain("External Service: Stripe");
    });
  });

  describe("Error Handling", () => {
    it("should handle workspace detection failure", async () => {
      const input = {
        name: "product",
        workspaceRoot: "/invalid/path",
        dryRun: true,
      };

      const result = await Effect.runPromise(handleGenerateContract(input));

      expect(result.success).toBe(false);
      expect(result.message).toContain("Workspace not found");
    });
  });

  describe("Cross-Generator Consistency", () => {
    const workspaces = [
      { path: "/test/nx-workspace", type: "nx", expectedMode: "Nx Generator" },
      {
        path: "/test/pnpm-workspace",
        type: "pnpm",
        expectedMode: "CLI (Agnostic)",
      },
      {
        path: "/test/yarn-workspace",
        type: "yarn",
        expectedMode: "CLI (Agnostic)",
      },
    ];

    workspaces.forEach(({ expectedMode, path, type }) => {
      describe(`${type} workspace`, () => {
        it("should use same mode across all generators", async () => {
          const contractResult = await Effect.runPromise(
            handleGenerateContract({
              name: "test",
              workspaceRoot: path,
              dryRun: true,
            })
          );

          const dataAccessResult = await Effect.runPromise(
            handleGenerateDataAccess({
              name: "test",
              workspaceRoot: path,
              dryRun: true,
            })
          );

          const featureResult = await Effect.runPromise(
            handleGenerateFeature({
              name: "test",
              workspaceRoot: path,
              platform: "node" as const,
              dryRun: true,
            })
          );

          expect(contractResult.message).toContain(`Mode: ${expectedMode}`);
          expect(dataAccessResult.message).toContain(`Mode: ${expectedMode}`);
          expect(featureResult.message).toContain(`Mode: ${expectedMode}`);
        });
      });
    });
  });
});
