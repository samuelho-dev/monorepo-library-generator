# MCP Server Usage Guide

> **Quick start guide for using the Monorepo Library Generator as an MCP server**

## What is MCP?

[Model Context Protocol (MCP)](https://modelcontextprotocol.io/) is an open standard that enables AI assistants to connect with external tools and data sources. This generator now works as an MCP server, allowing Claude and other AI assistants to generate libraries directly in conversation.

## Installation

### Option 1: Use with npx (Recommended)

No installation required! Claude Desktop can run the server directly:

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

### Option 2: Install Globally

```bash
npm install -g @samuelho-dev/monorepo-library-generator

# Then use in Claude Desktop config:
{
  "mcpServers": {
    "monorepo-generator": {
      "command": "mlg-mcp"
    }
  }
}
```

### Option 3: Local Development

```bash
# Clone and build
git clone https://github.com/samuelho-dev/monorepo-library-generator
cd monorepo-library-generator
pnpm install
pnpm build

# Use in Claude Desktop config:
{
  "mcpServers": {
    "monorepo-generator-dev": {
      "command": "node",
      "args": [
        "/absolute/path/to/monorepo-library-generator/build/esm/mcp/server.js"
      ]
    }
  }
}
```

## Claude Desktop Setup

1. **Locate your config file:**
   - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`
   - Linux: `~/.config/Claude/claude_desktop_config.json`

2. **Add the server configuration:**

```json
{
  "mcpServers": {
    "monorepo-generator": {
      "command": "npx",
      "args": [
        "-y",
        "@samuelho-dev/monorepo-library-generator",
        "mcp"
      ],
      "env": {}
    }
  }
}
```

3. **Restart Claude Desktop**

4. **Verify installation:**
   - Look for the 🔌 icon in Claude
   - Click it to see available tools
   - You should see 5 generator tools listed

## Available Tools

### 1. `generate_contract`

Generate Effect-based contract library with domain entities and repository interfaces.

**Parameters:**
- `name` (required): Domain name (e.g., "product", "user")
- `workspaceRoot` (required): Absolute path to your monorepo
- `entities`: Array of entity names for bundle optimization
- `includeCQRS`: Include CQRS patterns (default: false)
- `includeRPC`: Include RPC definitions (default: false)
- `description`: Library description
- `directory`: Custom directory (default: "libs/contract")
- `tags`: Comma-separated tags

**Example usage in Claude:**
```
Generate a contract library for products at /Users/me/my-monorepo
with entities Product, ProductCategory, and ProductReview
```

### 2. `generate_data_access`

Generate data-access library with repository implementation.

**Parameters:**
- `name` (required): Domain name
- `workspaceRoot` (required): Monorepo root path
- `skipTests`: Skip test generation (default: false)
- `description`: Library description
- `directory`: Custom directory (default: "libs/data-access")
- `tags`: Comma-separated tags

**Example usage:**
```
Create a data-access library for products at /Users/me/my-monorepo
```

### 3. `generate_feature`

Generate feature library with business logic and service layer.

**Parameters:**
- `name` (required): Feature name (e.g., "auth", "payment")
- `workspaceRoot` (required): Monorepo root path
- `platform`: Target platform - "node", "browser", "universal", "edge" (default: "universal")
- `scope`: Domain scope (e.g., "payments", "auth")
- `includeClientServer`: Generate client/server exports (default: false)
- `includeRPC`: Include RPC router (default: false)
- `includeCQRS`: Include CQRS structure (default: false)
- `includeEdge`: Include edge runtime support (default: false)
- `description`: Library description
- `directory`: Custom directory (default: "libs/feature")
- `tags`: Comma-separated tags

**Example usage:**
```
Generate a feature library for authentication at /Users/me/my-monorepo
with platform universal and includeRPC true
```

### 4. `generate_infra`

Generate infrastructure library for cross-cutting services.

**Parameters:**
- `name` (required): Service name (e.g., "cache", "storage")
- `workspaceRoot` (required): Monorepo root path
- `includeClientServer`: Generate client/server variants (default: false)
- `includeEdge`: Include edge runtime (default: false)
- `skipTests`: Skip test generation (default: false)
- `description`: Library description
- `directory`: Custom directory (default: "libs/infra")
- `tags`: Comma-separated tags

**Example usage:**
```
Create an infra library for caching at /Users/me/my-monorepo
```

### 5. `generate_provider`

Generate provider library to wrap external services.

**Parameters:**
- `name` (required): Provider name (e.g., "stripe", "redis")
- `workspaceRoot` (required): Monorepo root path
- `externalService` (required): External service name (e.g., "Stripe API")
- `platform`: Target platform (default: "node")
- `providerType`: Type - "sdk", "cli", "http", "graphql" (default: "sdk")
- `includeClientServer`: Generate client/server exports (default: false)
- `cliCommand`: CLI command name (for CLI providers)
- `baseUrl`: Base URL (for HTTP/GraphQL providers)
- `authType`: Auth type - "bearer", "apikey", "oauth", "basic", "none"
- `description`: Library description
- `directory`: Custom directory (default: "libs/provider")
- `tags`: Comma-separated tags

**Example usage:**
```
Generate a provider library for Stripe at /Users/me/my-monorepo
with externalService "Stripe API" and providerType sdk
```

## Usage Examples

### Example 1: Generate Complete Stack

```
I'm working on a product management feature in my monorepo at /Users/me/shop-monorepo.

Can you:
1. Generate a contract library for products with entities Product, ProductCategory
2. Generate a data-access library for products
3. Generate a feature library for product-management with platform universal

Make sure to include CQRS patterns in the contract and RPC endpoints in the feature.
```

Claude will use the MCP tools to generate all three libraries automatically.

### Example 2: Add External Service Integration

```
I need to integrate Stripe into my monorepo at /Users/me/shop-monorepo.

Generate a provider library for stripe with:
- External service: "Stripe API"
- Provider type: sdk
- Platform: node
```

### Example 3: Infrastructure Service

```
Create a caching infrastructure library at /Users/me/shop-monorepo
with both client and server exports
```

## How It Works

1. **You talk to Claude** - Describe what library you need in natural language
2. **Claude calls MCP tools** - Translates your request to tool parameters
3. **MCP server runs** - Executes your generator with Effect
4. **Files are created** - Libraries are generated in your monorepo
5. **Claude confirms** - Shows you what was created and next steps

## Features

✅ **Auto-detection** - Automatically detects:
- Workspace type (Nx, pnpm, Yarn, Turborepo)
- Package manager (npm, pnpm, yarn)
- Package scope from root package.json

✅ **Effect-native** - All generators use Effect patterns:
- Context.Tag for services
- Layer.scoped for resources
- Data.TaggedError for errors
- Effect.gen for workflows

✅ **Type-safe** - Zod validation ensures correct parameters

✅ **Dry-run mode** - Preview files before writing (set `dryRun: true`)

✅ **Error handling** - Clear, formatted error messages

## Troubleshooting

### Server not showing in Claude

1. Check config file location and syntax
2. Restart Claude Desktop completely
3. Check Claude logs: `~/Library/Logs/Claude/` (macOS)

### "Command not found" error

- If using npx: Ensure Node.js 18+ is installed
- If using global install: Run `npm install -g @samuelho-dev/monorepo-library-generator`
- If using local dev: Use absolute path in config

### "Workspace not found" error

- Ensure `workspaceRoot` is an absolute path
- Verify the path contains a `package.json`
- Check you have a workspace root (nx.json, pnpm-workspace.yaml, etc.)

### Permission errors

- Ensure you have write permissions in the target directory
- Try running with `dryRun: true` to preview first

## Manual Testing

You can test the MCP server manually:

```bash
# Build the project
pnpm build

# Test with MCP Inspector (visual debugging)
pnpm mcp:inspector

# Or test with echo
echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | node build/esm/mcp/server.js
```

## Next Steps

- 📖 Read the [Implementation Plan](./MCP_IMPLEMENTATION_PLAN.md) for technical details
- 🔧 See [Effect Patterns](./EFFECT_PATTERNS.md) for generator patterns
- 📝 Check [Examples](./EXAMPLES.md) for usage examples
- 🐛 Report issues at [GitHub Issues](https://github.com/samuelho-dev/monorepo-library-generator/issues)

## Resources

- [Model Context Protocol](https://modelcontextprotocol.io/)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [Claude Desktop](https://claude.ai/download)
- [Effect Documentation](https://effect.website/)
