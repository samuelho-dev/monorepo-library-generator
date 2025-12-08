---
"@samuelho-dev/monorepo-library-generator": minor
---

feat: Add MCP server implementation and fix test suite

**MCP Server Integration:**

Adds complete MCP server implementation that exposes all 5 generators as tools for AI assistants like Claude Desktop.

- 🔧 MCP server with stdio transport (`mlg-mcp` binary)
- 🛠️ 5 MCP tools exposing all generators:
  - `generate_contract` - Contract libraries with entities and ports
  - `generate_data_access` - Repository implementations
  - `generate_feature` - Business logic and services
  - `generate_infra` - Infrastructure services
  - `generate_provider` - External service wrappers
- ✅ Auto-detection of workspace context (type, scope, package manager)
- 🔍 Dry-run mode support for all generators
- 📝 Effect Schema validation for MCP tool schemas (100% Effect-based)
- 🎯 Effect-based tool handlers with proper error handling
- 📖 Complete MCP usage documentation

**Test Suite Fixes:**

- 🔧 Fixed TreeAdapter to support real filesystem fallback for dotfile templates
- 🐛 Fixed JSON comment stripping regex that was corrupting glob patterns (`src/**/*`)
- ✅ Updated data-access tests to match new stub-based Test layer implementation
- 📦 Fixed package.json bin path (`cli.js` → `cli.mjs`)
- ✅ All 159 tests passing (was 19 passing, 140 failing)

**Technical Details:**

- Uses `@modelcontextprotocol/sdk` for MCP protocol
- Effect Schema for MCP tool validation and JSON Schema generation
- MCP FileSystem adapter for direct disk writes
- Workspace-agnostic (works with Nx, pnpm, Yarn, Turborepo)
- Full Effect integration with proper error types
- Zero Zod dependencies - pure Effect ecosystem

**Usage:**

```json
{
  "mcpServers": {
    "monorepo-generator": {
      "command": "npx",
      "args": ["-y", "@samuelho-dev/monorepo-library-generator", "mcp"]
    }
  }
}
```

**Documentation:**

- [MCP Usage Guide](./docs/MCP_USAGE_GUIDE.md)
- [MCP Implementation Plan](./docs/MCP_IMPLEMENTATION_PLAN.md)

This enables AI-assisted library generation directly in conversation with Claude and other MCP-compatible tools.
