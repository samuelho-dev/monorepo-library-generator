# Unified Infrastructure Architecture

**Date:** December 13, 2025
**Status:** ✅ Implemented

## Overview

This document describes the unified infrastructure architecture that ensures all three generator interfaces (MCP, CLI, and Nx) use the same core code paths, eliminating duplication and ensuring consistency.

## Problem Statement

**Before the refactoring:**
- MCP handlers shelled out to CLI/Nx instead of using core generators
- CLI and Nx had duplicate metadata computation logic
- Each interface had its own workspace detection
- Adding features required updating 3 separate codebases
- ~1,500 lines of duplicate code across 15 generators

**After the refactoring:**
- All interfaces use identical execution pipeline
- Single source of truth for metadata, validation, workspace detection
- Adding features requires updating only the core generator
- ~1,500 lines eliminated through unification

## Architecture Layers

### Layer 1: Workspace Infrastructure

**Location:** `src/infrastructure/workspace/`

**Purpose:** Unified workspace context creation and detection

**Key Modules:**
```typescript
// Detect workspace properties
createWorkspaceContext(rootPath, interfaceType)
  → WorkspaceContext {
      root: string
      type: "nx" | "standalone"
      scope: string
      packageManager: "pnpm" | "npm" | "yarn"
      interfaceType: "mcp" | "cli" | "nx"
    }
```

**Benefits:**
- Single workspace detection algorithm
- Works across all interfaces
- Auto-detects: workspace type, scope, package manager

### Layer 2: Adapter Infrastructure

**Location:** `src/infrastructure/adapters/`

**Purpose:** Unified file system abstraction

**Key Modules:**
```typescript
// Create appropriate adapter based on interface
createAdapter(context, nxTree?)
  → FileSystemAdapter

// Three adapter implementations:
- TreeAdapter      (Nx Tree API)
- EffectFsAdapter  (CLI Effect FileSystem)
- MCPFileSystemAdapter (MCP Effect FileSystem)
```

**Benefits:**
- Core generators work with any file system
- Nx, CLI, and MCP all implement same interface
- Easy to add new interfaces (Web UI, VSCode, etc.)

### Layer 3: Metadata Infrastructure

**Location:** `src/infrastructure/metadata/`

**Purpose:** Universal metadata computation

**Key Modules:**
```typescript
// Single metadata computation function
computeMetadata(input, context)
  → LibraryMetadata {
      projectName, projectRoot, sourceRoot,
      packageName, className, fileName,
      tags, description, ...
    }
```

**Replaces:**
- CLI: `computeCliMetadata()`
- Nx: `computeLibraryMetadata()`
- MCP: inline metadata computation

**Benefits:**
- Consistent naming across all interfaces
- Single source of truth for paths
- Automatic name variant generation

### Layer 4: Validation Infrastructure

**Location:** `src/infrastructure/validation/`

**Purpose:** Centralized input validation

**Key Modules:**
```typescript
// Shared validation schemas
ContractInputSchema
DataAccessInputSchema
FeatureInputSchema
ProviderInputSchema
InfraInputSchema
```

**Benefits:**
- All interfaces validate inputs identically
- Type-safe with Effect Schema
- Single place to update validation rules

### Layer 5: Execution Infrastructure

**Location:** `src/infrastructure/execution/`

**Purpose:** Unified generator execution pipeline

**Key Modules:**
```typescript
// Factory that creates executor for any generator
createExecutor(
  libraryType,
  coreGenerator,
  inputToOptions
) → GeneratorExecutor

// Execution pipeline (automatic):
1. Create workspace context
2. Create adapter
3. Compute metadata
4. Generate infrastructure files
5. Generate domain files (core generator)
6. Return result
```

**Benefits:**
- All interfaces execute generators identically
- No code duplication
- Automatic pipeline management

### Layer 6: Output Infrastructure

**Location:** `src/infrastructure/output/`

**Purpose:** Universal result formatting

**Key Modules:**
```typescript
// Format result for specific interface
formatOutput(result, interfaceType)
  → McpResponse | string | NxCallback
```

**Benefits:**
- Each interface gets appropriately formatted output
- Consistent success/error messaging
- Helpful next steps for users

## Usage Examples

### MCP Handler

```typescript
// Before: 137 lines with shell exec
const command = buildGeneratorCommand(workspace, "contract", cliArgs)
const { stdout } = await execAsync(command)
return formatSuccessResult(parseOutput(stdout))

// After: 80 lines with direct core usage
const contractExecutor = createExecutor(
  "contract",
  generateContractCore,
  (input, metadata) => ({ ...metadata, ...input })
)

const result = yield* contractExecutor.execute({
  ...validated,
  __interfaceType: "mcp"
})

return formatOutput(result, "mcp")
```

### CLI Generator

```typescript
// Before: 158 lines with manual setup
const metadata = computeCliMetadata(options.name, "contract")
const adapter = yield* createEffectFsAdapter(workspaceRoot)
yield* generateLibraryInfrastructure(adapter, metadata)
const result = yield* generateContractCore(adapter, metadata)

// After: 55 lines with executor
const contractExecutor = createExecutor(
  "contract",
  generateContractCore,
  (input, metadata) => ({ ...metadata, ...input })
)

const result = yield* contractExecutor.execute({
  ...options,
  __interfaceType: "cli"
})

yield* Console.log(formatOutput(result, "cli"))
```

### Nx Generator

```typescript
// Before: 140 lines with computeLibraryMetadata
const metadata = computeLibraryMetadata(tree, schema, "contract", tags)
const adapter = createTreeAdapter(tree)
await Effect.runPromise(generateLibraryInfrastructure(adapter, metadata))
const result = await Effect.runPromise(generateContractCore(adapter, metadata))

// After: 50 lines with executor
const contractExecutor = createExecutor(
  "contract",
  generateContractCore,
  (input, metadata) => ({ ...metadata, ...input })
)

const result = await Effect.runPromise(
  contractExecutor.execute({
    ...schema,
    __interfaceType: "nx",
    __nxTree: tree
  })
)

return formatOutput(result, "nx")
```

## Adding a New Generator

**Before unified infrastructure:**
1. Write MCP handler with shell exec (~150 lines)
2. Write CLI generator with manual setup (~150 lines)
3. Write Nx generator with manual setup (~150 lines)
4. Write core generator (~200 lines)
**Total:** ~650 lines across 4 files

**After unified infrastructure:**
1. Write core generator (~200 lines)
2. Create executor for each interface (~30 lines × 3 = 90 lines)
**Total:** ~290 lines across 4 files (**55% reduction**)

Example:
```typescript
// 1. Write core generator
export function generateMyLibraryCore(adapter, options) {
  // ... domain file generation
}

// 2. MCP handler (~30 lines)
const myLibraryExecutor = createExecutor(
  "my-library",
  generateMyLibraryCore,
  (input, metadata) => ({ ...metadata, ...input })
)

export const handleGenerateMyLibrary = (input) =>
  Effect.gen(function*() {
    const validated = yield* decodeMyLibraryInput(input)
    const result = yield* myLibraryExecutor.execute({
      ...validated,
      __interfaceType: "mcp"
    })
    return formatOutput(result, "mcp")
  })

// 3. CLI generator (~30 lines) - same pattern
// 4. Nx generator (~30 lines) - same pattern
```

## Adding a New Interface

To add a new interface (e.g., Web UI, VSCode extension):

1. **Create adapter** (`src/infrastructure/adapters/web-adapter.ts`)
2. **Update adapter factory** (add "web" case)
3. **Add output formatter** (add "web" case)
4. **Write interface handlers** (use `createExecutor`)

**Estimated effort:** 2-3 days (vs. 2-3 weeks before unification)

## Testing Strategy

**Unit Tests:**
- Test each infrastructure module independently
- Mock dependencies where appropriate
- Focus on edge cases and error handling

**Integration Tests:**
- Verify all three interfaces produce identical files
- Test with real file system operations
- Compare byte-by-byte output across interfaces

**Example:**
```typescript
describe("Unified Generator Output", () => {
  it("MCP, CLI, and Nx should generate identical files", async () => {
    // Generate via MCP
    const mcpResult = await runMcpGenerator("product")

    // Generate via CLI
    const cliResult = await runCliGenerator("product")

    // Generate via Nx
    const nxResult = await runNxGenerator("product")

    // Verify identical output
    expect(mcpResult.filesCreated).toEqual(cliResult.filesCreated)
    expect(cliResult.filesCreated).toEqual(nxResult.filesCreated)
  })
})
```

## Benefits Summary

### For Developers

- **Less code to write:** 55% reduction when adding new generators
- **Single source of truth:** Update once, all interfaces benefit
- **Type safety:** TypeScript ensures consistency
- **Better testing:** Unit test infrastructure modules independently

### For Users

- **Consistency:** All interfaces behave identically
- **Reliability:** Less code = fewer bugs
- **Performance:** No shell exec overhead in MCP
- **Better errors:** Structured errors vs text parsing

### For Maintainers

- **Easier to understand:** Clear separation of concerns
- **Easier to extend:** Add interfaces without touching core
- **Easier to debug:** Centralized execution pipeline
- **Future-proof:** Designed for extensibility

## Migration Summary

**Files Created:** 40+ infrastructure files
**Files Modified:** 15 generators (MCP, CLI, Nx)
**Code Eliminated:** ~1,500 lines
**Time Investment:** ~4 days
**Impact:** ✅ All interfaces unified

## Future Enhancements

1. **Web UI Interface:** Add browser-based generator
2. **VSCode Extension:** Add IDE integration
3. **GitHub Actions:** Add CI/CD integration
4. **Dry-run mode:** Better preview support
5. **Rollback support:** Undo generator operations

## References

- Original Plan: `/Users/samuelho/.claude-work/plans/snoopy-spinning-lemon.md`
- Core Generators: `src/generators/core/*.ts`
- Infrastructure: `src/infrastructure/`
- MCP Handlers: `src/mcp/tools/*.handler.ts`
- CLI Generators: `src/cli/generators/*.ts`
- Nx Generators: `src/generators/*/
*.ts`
