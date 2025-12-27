/**
 * MCP Server for Monorepo Library Generator
 *
 * 100% Effect-based implementation using Effect Schema for validation.
 * Exposes 5 generator tools via Model Context Protocol.
 *
 * NO ZOD DEPENDENCIES - Pure Effect ecosystem.
 */

/* eslint-disable no-restricted-syntax */
// MCP SDK requires .js extensions for ESM imports
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js'
/* eslint-enable no-restricted-syntax */
import { Console, Effect } from 'effect'
import { VERSION } from '../version'

// Tool definitions (with JSON Schema from Effect)
import { ContractToolDefinition } from './schemas/contract.schema'
import { DataAccessToolDefinition } from './schemas/data-access.schema'
import { FeatureToolDefinition } from './schemas/feature.schema'
import { InfraToolDefinition } from './schemas/infra.schema'
import { ProviderToolDefinition } from './schemas/provider.schema'

// Handlers
import { handleGenerateContract } from './tools/contract.handler'
import { handleGenerateDataAccess } from './tools/data-access.handler'
import { handleGenerateFeature } from './tools/feature.handler'
import { handleGenerateInfra } from './tools/infra.handler'
import { handleGenerateProvider } from './tools/provider.handler'

/**
 * Create MCP server instance (no Zod dependency)
 */
const server = new Server(
  {
    name: 'monorepo-library-generator',
    version: VERSION
  },
  {
    capabilities: {
      tools: {}
    }
  }
)

/**
 * List all tools with Effect Schema-generated JSON Schemas
 */
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    ContractToolDefinition,
    DataAccessToolDefinition,
    FeatureToolDefinition,
    InfraToolDefinition,
    ProviderToolDefinition
  ]
}))

/**
 * Handle tool calls with Effect Schema validation
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { arguments: args, name } = request.params

  try {
    // Route to handler - validation happens inside via Effect Schema
    const result = await (async () => {
      switch (name) {
        case 'generate_contract':
          return await Effect.runPromise(handleGenerateContract(args ?? {}))

        case 'generate_data_access':
          return await Effect.runPromise(handleGenerateDataAccess(args ?? {}))

        case 'generate_feature':
          return await Effect.runPromise(handleGenerateFeature(args ?? {}))

        case 'generate_infra':
          return await Effect.runPromise(handleGenerateInfra(args ?? {}))

        case 'generate_provider':
          return await Effect.runPromise(handleGenerateProvider(args ?? {}))

        default:
          return {
            success: false,
            message: `❌ Unknown tool: ${name}\n\nAvailable tools:\n  - generate_contract\n  - generate_data_access\n  - generate_feature\n  - generate_infra\n  - generate_provider`
          }
      }
    })()

    // Extract message from result based on type
    let message: string
    if (typeof result === 'string') {
      message = result
    } else if (typeof result === 'function') {
      message = '✅ Generation completed successfully'
    } else if (result && typeof result === 'object' && 'message' in result) {
      message = result.message
    } else {
      message = '✅ Operation completed successfully'
    }

    return {
      content: [
        {
          type: 'text',
          text: message
        }
      ]
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)

    return {
      content: [
        {
          type: 'text',
          text: `❌ Unexpected Error: ${message}`
        }
      ],
      isError: true
    }
  }
})

/**
 * Error handler - logs server errors to stderr using Effect logging
 */
server.onerror = (error) => {
  Effect.runSync(
    Console.error(`[MCP Server Error] ${error instanceof Error ? error.message : String(error)}`)
  )
}

/**
 * Main entry point
 */
async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
}

// Start server
main().catch((error) => {
  Effect.runSync(
    Console.error(
      `[MCP Server] Fatal error: ${error instanceof Error ? error.message : String(error)}`
    )
  )
  process.exit(1)
})
