/**
 * Command Builder Tests
 *
 * Tests dual-mode command generation for Nx and CLI modes.
 */

import { describe, expect, it } from "vitest"
import { buildGeneratorCommand, getExecutionMode } from "./command-builder"
import type { WorkspaceContext } from "./workspace-detector"

describe("Command Builder", () => {
  describe("buildGeneratorCommand", () => {
    describe("Nx Mode", () => {
      const nxWorkspace: WorkspaceContext = {
        root: "/workspace",
        scope: "@myorg",
        type: "nx",
        packageManager: "pnpm"
      }

      it("should build Nx command for contract generator", () => {
        const command = buildGeneratorCommand(nxWorkspace, "contract", [
          "--name=product",
          "--directory=libs/contract"
        ])

        expect(command).toBe(
          "npx nx g @samuelho-dev/monorepo-library-generator:contract --name=product --directory=libs/contract"
        )
      })

      it("should build Nx command for data-access generator", () => {
        const command = buildGeneratorCommand(nxWorkspace, "data-access", [
          "--name=product",
          "--directory=libs/data-access"
        ])

        expect(command).toBe(
          "npx nx g @samuelho-dev/monorepo-library-generator:data-access --name=product --directory=libs/data-access"
        )
      })

      it("should build Nx command for feature generator", () => {
        const command = buildGeneratorCommand(nxWorkspace, "feature", [
          "--name=auth",
          "--platform=node"
        ])

        expect(command).toBe(
          "npx nx g @samuelho-dev/monorepo-library-generator:feature --name=auth --platform=node"
        )
      })

      it("should build Nx command for infra generator", () => {
        const command = buildGeneratorCommand(nxWorkspace, "infra", [
          "--name=cache",
          "--platform=node"
        ])

        expect(command).toBe(
          "npx nx g @samuelho-dev/monorepo-library-generator:infra --name=cache --platform=node"
        )
      })

      it("should build Nx command for provider generator", () => {
        const command = buildGeneratorCommand(nxWorkspace, "provider", [
          "--name=stripe",
          "--externalService=Stripe"
        ])

        expect(command).toBe(
          "npx nx g @samuelho-dev/monorepo-library-generator:provider --name=stripe --externalService=Stripe"
        )
      })

      it("should handle complex arguments with quotes and multiple flags", () => {
        const command = buildGeneratorCommand(nxWorkspace, "contract", [
          "--name=product",
          "--directory=libs/contract",
          "--description=\"Product domain\"",
          "--entities=Product,Category",
          "--includeCQRS=true",
          "--no-interactive"
        ])

        expect(command).toBe(
          "npx nx g @samuelho-dev/monorepo-library-generator:contract --name=product --directory=libs/contract --description=\"Product domain\" --entities=Product,Category --includeCQRS=true --no-interactive"
        )
      })
    })

    describe("CLI Mode (pnpm workspace)", () => {
      const pnpmWorkspace: WorkspaceContext = {
        root: "/workspace",
        scope: "@myorg",
        type: "pnpm",
        packageManager: "pnpm"
      }

      it("should build CLI command for contract generator", () => {
        const command = buildGeneratorCommand(pnpmWorkspace, "contract", [
          "--name=product",
          "--directory=libs/contract"
        ])

        expect(command).toBe(
          "npx mlg generate contract --name=product --directory=libs/contract"
        )
      })

      it("should build CLI command for data-access generator", () => {
        const command = buildGeneratorCommand(pnpmWorkspace, "data-access", [
          "--name=product"
        ])

        expect(command).toBe(
          "npx mlg generate data-access --name=product"
        )
      })

      it("should build CLI command for feature generator", () => {
        const command = buildGeneratorCommand(pnpmWorkspace, "feature", [
          "--name=auth",
          "--platform=node"
        ])

        expect(command).toBe(
          "npx mlg generate feature --name=auth --platform=node"
        )
      })

      it("should build CLI command for infra generator", () => {
        const command = buildGeneratorCommand(pnpmWorkspace, "infra", [
          "--name=cache"
        ])

        expect(command).toBe(
          "npx mlg generate infra --name=cache"
        )
      })

      it("should build CLI command for provider generator", () => {
        const command = buildGeneratorCommand(pnpmWorkspace, "provider", [
          "--name=stripe",
          "--externalService=Stripe"
        ])

        expect(command).toBe(
          "npx mlg generate provider --name=stripe --externalService=Stripe"
        )
      })
    })

    describe("CLI Mode (yarn workspace)", () => {
      const yarnWorkspace: WorkspaceContext = {
        root: "/workspace",
        scope: "@myorg",
        type: "yarn",
        packageManager: "yarn"
      }

      it("should build CLI command for yarn workspace", () => {
        const command = buildGeneratorCommand(yarnWorkspace, "contract", [
          "--name=product"
        ])

        expect(command).toBe(
          "npx mlg generate contract --name=product"
        )
      })
    })

    describe("CLI Mode (turborepo)", () => {
      const turboWorkspace: WorkspaceContext = {
        root: "/workspace",
        scope: "@myorg",
        type: "turborepo",
        packageManager: "npm"
      }

      it("should build CLI command for turborepo", () => {
        const command = buildGeneratorCommand(turboWorkspace, "contract", [
          "--name=product"
        ])

        expect(command).toBe(
          "npx mlg generate contract --name=product"
        )
      })
    })

    describe("CLI Mode (unknown workspace)", () => {
      const unknownWorkspace: WorkspaceContext = {
        root: "/workspace",
        scope: "@myorg",
        type: "unknown",
        packageManager: "npm"
      }

      it("should build CLI command for unknown workspace type", () => {
        const command = buildGeneratorCommand(unknownWorkspace, "contract", [
          "--name=product"
        ])

        expect(command).toBe(
          "npx mlg generate contract --name=product"
        )
      })
    })

    describe("Edge Cases", () => {
      it("should handle empty arguments array", () => {
        const nxWorkspace: WorkspaceContext = {
          root: "/workspace",
          scope: "@myorg",
          type: "nx",
          packageManager: "pnpm"
        }

        const command = buildGeneratorCommand(nxWorkspace, "contract", [])

        expect(command).toBe(
          "npx nx g @samuelho-dev/monorepo-library-generator:contract "
        )
      })

      it("should handle arguments with special characters", () => {
        const nxWorkspace: WorkspaceContext = {
          root: "/workspace",
          scope: "@myorg",
          type: "nx",
          packageManager: "pnpm"
        }

        const command = buildGeneratorCommand(nxWorkspace, "contract", [
          "--name=test-product",
          "--description=\"Product with 'quotes' and $pecial chars\"",
          "--tags=type:contract,scope:domain"
        ])

        expect(command).toContain("--name=test-product")
        expect(command).toContain("--description=\"Product with 'quotes' and $pecial chars\"")
        expect(command).toContain("--tags=type:contract,scope:domain")
      })
    })
  })

  describe("getExecutionMode", () => {
    it("should return 'Nx Generator' for Nx workspace", () => {
      const workspace: WorkspaceContext = {
        root: "/workspace",
        scope: "@myorg",
        type: "nx",
        packageManager: "pnpm"
      }

      expect(getExecutionMode(workspace)).toBe("Nx Generator")
    })

    it("should return 'CLI (Agnostic)' for pnpm workspace", () => {
      const workspace: WorkspaceContext = {
        root: "/workspace",
        scope: "@myorg",
        type: "pnpm",
        packageManager: "pnpm"
      }

      expect(getExecutionMode(workspace)).toBe("CLI (Agnostic)")
    })

    it("should return 'CLI (Agnostic)' for yarn workspace", () => {
      const workspace: WorkspaceContext = {
        root: "/workspace",
        scope: "@myorg",
        type: "yarn",
        packageManager: "yarn"
      }

      expect(getExecutionMode(workspace)).toBe("CLI (Agnostic)")
    })

    it("should return 'CLI (Agnostic)' for turborepo", () => {
      const workspace: WorkspaceContext = {
        root: "/workspace",
        scope: "@myorg",
        type: "turborepo",
        packageManager: "npm"
      }

      expect(getExecutionMode(workspace)).toBe("CLI (Agnostic)")
    })

    it("should return 'CLI (Agnostic)' for unknown workspace", () => {
      const workspace: WorkspaceContext = {
        root: "/workspace",
        scope: "@myorg",
        type: "unknown",
        packageManager: "npm"
      }

      expect(getExecutionMode(workspace)).toBe("CLI (Agnostic)")
    })
  })

  describe("Workspace Type Detection Matrix", () => {
    const testCases: Array<{
      type: WorkspaceContext["type"]
      expectedMode: string
      expectedCommandPrefix: string
    }> = [
      {
        type: "nx",
        expectedMode: "Nx Generator",
        expectedCommandPrefix: "npx nx g @samuelho-dev/monorepo-library-generator:"
      },
      {
        type: "pnpm",
        expectedMode: "CLI (Agnostic)",
        expectedCommandPrefix: "npx mlg generate "
      },
      {
        type: "yarn",
        expectedMode: "CLI (Agnostic)",
        expectedCommandPrefix: "npx mlg generate "
      },
      {
        type: "turborepo",
        expectedMode: "CLI (Agnostic)",
        expectedCommandPrefix: "npx mlg generate "
      },
      {
        type: "unknown",
        expectedMode: "CLI (Agnostic)",
        expectedCommandPrefix: "npx mlg generate "
      }
    ]

    testCases.forEach(({ expectedCommandPrefix, expectedMode, type }) => {
      it(`should use ${expectedMode} for ${type} workspace`, () => {
        const workspace: WorkspaceContext = {
          root: "/workspace",
          scope: "@myorg",
          type,
          packageManager: "pnpm"
        }

        const mode = getExecutionMode(workspace)
        const command = buildGeneratorCommand(workspace, "contract", ["--name=test"])

        expect(mode).toBe(expectedMode)
        expect(command).toContain(expectedCommandPrefix)
      })
    })
  })
})
