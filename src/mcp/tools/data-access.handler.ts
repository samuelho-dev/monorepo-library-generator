/**
 * Data-Access Generator MCP Tool Handler
 *
 * Handles data-access library generation via MCP protocol.
 * Uses Effect Schema for validation and existing Nx generators.
 */

import { Effect, Option } from "effect"
import { exec } from "node:child_process"
import { promisify } from "node:util"
import { decodeDataAccessArgs } from "../schemas/data-access.schema"
import { buildGeneratorCommand, getExecutionMode } from "../utils/command-builder"
import { formatErrorResult, formatSuccessResult } from "../utils/result-formatter"
import { formatParseError } from "../utils/validation"
import { detectWorkspace } from "../utils/workspace-detector"

const execAsync = promisify(exec)

/**
 * Handle data-access generation with Effect Schema validation
 */
export const handleGenerateDataAccess = (input: unknown) =>
  Effect.gen(function*() {
    // 1. Validate input with Effect Schema
    const validationResult = yield* decodeDataAccessArgs(input).pipe(
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
          `Would generate data-access library: data-access-${args.name}`,
          "",
          "📦 Configuration:",
          `  - Name: ${args.name}`,
          `  - Workspace: ${workspace.root}`,
          `  - Scope: ${workspace.scope}`,
          `  - Type: ${workspace.type}`,
          `  - Mode: ${getExecutionMode(workspace)}`,
          `  - Contract Domain: ${Option.getOrElse(() => args.name)(args.contractDomain)}`,
          "",
          "To actually generate files, set dryRun: false"
        ].join("\n")
      }
    }

    // 4. Build Nx generate command
    const directory = Option.getOrElse(() => "libs/data-access")(args.directory)
    const description = Option.getOrUndefined(args.description)
    const contractDomain = Option.getOrUndefined(args.contractDomain)
    const tags = Option.getOrUndefined(args.tags)

    const cliArgs: Array<string> = [
      `--name=${args.name}`,
      `--directory=${directory}`,
      ...(description ? [`--description="${description}"`] : []),
      ...(contractDomain ? [`--contractDomain=${contractDomain}`] : []),
      ...(tags ? [`--tags=${tags}`] : []),
      "--no-interactive"
    ]

    const command = buildGeneratorCommand(workspace, "data-access", cliArgs)

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
    const libraryName = `data-access-${args.name}`
    const projectRoot = `${Option.getOrElse(() => "libs/data-access")(args.directory)}/${args.name}`

    return {
      success: true,
      message: formatSuccessResult({
        libraryType: "data-access",
        libraryName,
        filesCreated: [
          `${projectRoot}/package.json`,
          `${projectRoot}/tsconfig.json`,
          `${projectRoot}/src/index.ts`,
          `${projectRoot}/src/lib/repository.ts`,
          `${projectRoot}/src/lib/queries.ts`,
          `${projectRoot}/src/server/layers.ts`
        ],
        workspaceType: workspace.type,
        nextSteps: [
          `Run \`${workspace.packageManager} install\` to install dependencies`,
          `Import repository: \`import { ${args.name}Repository } from '${workspace.scope}/${libraryName}/server'\``
        ]
      }),
      files: []
    }
  })
