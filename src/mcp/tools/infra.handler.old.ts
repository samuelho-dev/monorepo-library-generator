/**
 * Infrastructure Generator MCP Tool Handler
 *
 * Handles infrastructure library generation via MCP protocol.
 * Uses Effect Schema for validation and existing Nx generators.
 */

import { Effect, Option } from "effect"
import { exec } from "node:child_process"
import { promisify } from "node:util"
import { decodeInfraArgs } from "../schemas/infra.schema"
import { buildGeneratorCommand, getExecutionMode } from "../utils/command-builder"
import { formatErrorResult, formatSuccessResult } from "../utils/result-formatter"
import { formatParseError } from "../utils/validation"
import { detectWorkspace } from "../utils/workspace-detector"

const execAsync = promisify(exec)

/**
 * Handle infrastructure generation with Effect Schema validation
 */
export const handleGenerateInfra = (input: unknown) =>
  Effect.gen(function*() {
    // 1. Validate input with Effect Schema
    const validationResult = yield* decodeInfraArgs(input).pipe(
      Effect.either
    )

    if (validationResult._tag === "Left") {
      const errorMessage = formatParseError(validationResult.left)
      return {
        success: false,
        message: `❌ Validation Error:\n\n${errorMessage}\n\n💡 Check your input parameters and try again.`
      }
    }

    const args = validationResult.right

    // 2. Auto-detect workspace
    const workspaceResult = yield* detectWorkspace(args.workspaceRoot).pipe(
      Effect.either
    )

    if (workspaceResult._tag === "Left") {
      return {
        success: false,
        message: formatErrorResult(workspaceResult.left)
      }
    }

    const workspace = workspaceResult.right

    // 3. Handle dry-run mode
    if (args.dryRun) {
      return {
        success: true,
        message: [
          "🔍 DRY RUN MODE",
          "",
          `Would generate infrastructure library: infra-${args.name}`,
          "",
          "📦 Configuration:",
          `  - Name: ${args.name}`,
          `  - Workspace: ${workspace.root}`,
          `  - Scope: ${workspace.scope}`,
          `  - Type: ${workspace.type}`,
          `  - Mode: ${getExecutionMode(workspace)}`,
          `  - Platform: ${args.platform}`,
          `  - Client/Server: ${args.includeClientServer}`,
          `  - Edge: ${args.includeEdge}`,
          "",
          "To actually generate files, set dryRun: false"
        ].join("\n")
      }
    }

    // 4. Build Nx generate command
    const directory = Option.getOrElse(() => "libs/infra")(args.directory)
    const description = Option.getOrUndefined(args.description)
    const tags = Option.getOrUndefined(args.tags)

    const cliArgs: Array<string> = [
      `--name=${args.name}`,
      `--directory=${directory}`,
      `--platform=${args.platform}`,
      ...(description ? [`--description="${description}"`] : []),
      ...(args.includeClientServer ? ["--includeClientServer=true"] : []),
      ...(args.includeEdge ? ["--includeEdge=true"] : []),
      ...(tags ? [`--tags=${tags}`] : []),
      "--no-interactive"
    ]

    const command = buildGeneratorCommand(workspace, "infra", cliArgs)

    // 5. Run generator (Nx or CLI mode based on workspace type)
    const generatorResult = yield* Effect.tryPromise({
      try: async () => {
        const { stderr, stdout } = await execAsync(command, {
          cwd: workspace.root,
          env: { ...process.env, NX_DAEMON: "false" }
        })
        return { stdout, stderr }
      },
      catch: (error) => error
    }).pipe(Effect.either)

    if (generatorResult._tag === "Left") {
      return {
        success: false,
        message: formatErrorResult(generatorResult.left)
      }
    }

    // 6. Format success response
    const libraryName = `infra-${args.name}`
    const projectRoot = `${Option.getOrElse(() => "libs/infra")(args.directory)}/${args.name}`

    return {
      success: true,
      message: formatSuccessResult({
        libraryType: "infra",
        libraryName,
        filesCreated: [
          `${projectRoot}/package.json`,
          `${projectRoot}/tsconfig.json`,
          `${projectRoot}/src/index.ts`,
          `${projectRoot}/src/server.ts`,
          `${projectRoot}/src/lib/service/interface.ts`,
          `${projectRoot}/src/lib/providers/memory.ts`,
          `${projectRoot}/src/lib/layers/server-layers.ts`
        ],
        workspaceType: workspace.type,
        nextSteps: [
          `Run \`${workspace.packageManager} install\` to install dependencies`,
          `Import service: \`import { ${args.name}Service } from '${workspace.scope}/${libraryName}/server'\``
        ]
      }),
      files: []
    }
  })
