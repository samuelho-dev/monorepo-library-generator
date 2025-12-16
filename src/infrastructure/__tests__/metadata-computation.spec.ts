/**
 * Metadata Computation Tests
 *
 * Tests for unified metadata computation
 */

import { describe, it, expect } from "vitest"
import { computeMetadata, computeSimpleMetadata } from "../metadata/computation"
import type { WorkspaceContext } from "../workspace/types"

describe("Metadata Computation", () => {
  const mockContext: WorkspaceContext = {
    root: "/test/workspace",
    type: "nx",
    scope: "@test-scope",
    packageManager: "pnpm",
    interfaceType: "cli"
  }

  describe("computeMetadata", () => {
    it("should compute basic metadata for contract library", () => {
      const metadata = computeMetadata(
        {
          name: "user",
          libraryType: "contract"
        },
        mockContext
      )

      expect(metadata.name).toBe("user")
      expect(metadata.libraryType).toBe("contract")
      expect(metadata.projectName).toBe("contract-user")
      expect(metadata.projectRoot).toBe("libs/contract/user")
      expect(metadata.sourceRoot).toBe("libs/contract/user/src")
      expect(metadata.packageName).toBe("@test-scope/contract-user")
      expect(metadata.fileName).toBe("user")
      expect(metadata.className).toBe("User")
    })

    it("should compute metadata for kebab-case names", () => {
      const metadata = computeMetadata(
        {
          name: "user-profile",
          libraryType: "data-access"
        },
        mockContext
      )

      expect(metadata.fileName).toBe("user-profile")
      expect(metadata.className).toBe("UserProfile")
      expect(metadata.propertyName).toBe("userProfile")
      expect(metadata.constantName).toBe("USER_PROFILE")
      expect(metadata.projectName).toBe("data-access-user-profile")
    })

    it("should use custom directory when provided", () => {
      const metadata = computeMetadata(
        {
          name: "user",
          libraryType: "contract",
          directory: "custom/path"
        },
        mockContext
      )

      expect(metadata.projectRoot).toBe("custom/path/user")
      expect(metadata.sourceRoot).toBe("custom/path/user/src")
    })

    it("should use description when provided", () => {
      const metadata = computeMetadata(
        {
          name: "user",
          libraryType: "contract",
          description: "Custom user description"
        },
        mockContext
      )

      expect(metadata.description).toBe("Custom user description")
    })

    it("should generate domain name from fileName when no description", () => {
      const metadata = computeMetadata(
        {
          name: "user-profile",
          libraryType: "contract"
        },
        mockContext
      )

      expect(metadata.description).toBe("User Profile")
      expect(metadata.domainName).toBe("User Profile")
    })

    it("should include additional tags", () => {
      const metadata = computeMetadata(
        {
          name: "user",
          libraryType: "contract",
          additionalTags: ["platform:universal", "scope:shared"]
        },
        mockContext
      )

      expect(metadata.tags).toContain("type:contract")
      expect(metadata.tags).toContain("scope:user")
      expect(metadata.tags).toContain("platform:universal")
      expect(metadata.tags).toContain("scope:shared")
    })

    it("should compute correct paths for all library types", () => {
      const types = ["contract", "data-access", "feature", "provider", "infra"] as const

      for (const libraryType of types) {
        const metadata = computeMetadata(
          {
            name: "test",
            libraryType
          },
          mockContext
        )

        expect(metadata.projectRoot).toBe(`libs/${libraryType}/test`)
        expect(metadata.sourceRoot).toBe(`libs/${libraryType}/test/src`)
        expect(metadata.projectName).toBe(`${libraryType}-test`)
      }
    })
  })

  describe("computeSimpleMetadata", () => {
    it("should be a convenience wrapper for computeMetadata", () => {
      const simple = computeSimpleMetadata(
        "user",
        "contract",
        mockContext,
        "User domain"
      )

      const full = computeMetadata(
        {
          name: "user",
          libraryType: "contract",
          description: "User domain"
        },
        mockContext
      )

      expect(simple).toEqual(full)
    })
  })
})
