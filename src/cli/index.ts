/**
 * Monorepo Library Generator CLI
 *
 * Effect-based CLI for generating libraries in Effect-native monorepos.
 * Uses @effect/cli for command-line interface and @effect/platform for file operations.
 *
 * @module monorepo-library-generator/cli
 */

import { Args, Command, Options } from '@effect/cli'
import { NodeContext, NodeRuntime } from '@effect/platform-node'
import { Console, Effect, Option } from 'effect'
import { VERSION } from '../version'
import { init } from './commands/init'
import { generateContract } from './generators/contract'
import { generateDataAccess } from './generators/data-access'
import { generateDomain } from './generators/domain'
import { generateFeature } from './generators/feature'
import { generateInfra } from './generators/infra'
import { generateProvider } from './generators/provider'
import { getCommandHelp } from './help/commands'
import { runInkTUI } from './ink'

/**
 * Common arguments used across all generate commands
 */
const nameArg = Args.text({ name: 'name' }).pipe(
  Args.withDescription('The name of the library to generate')
)

/**
 * Verbosity options for all generate commands
 */
const verboseOption = Options.boolean('verbose').pipe(
  Options.withAlias('v'),
  Options.withDescription('Show detailed output for each file'),
  Options.withDefault(false)
)

const quietOption = Options.boolean('quiet').pipe(
  Options.withAlias('q'),
  Options.withDescription('Minimal output (success/failure only)'),
  Options.withDefault(false)
)

/**
 * Common options for library generation
 */
const descriptionOption = Options.text('description').pipe(
  Options.withDescription('Description of the library'),
  Options.optional
)

const tagsOption = Options.text('tags').pipe(
  Options.withDescription('Comma-separated list of tags'),
  Options.withDefault('')
)

/**
 * Contract Generator Command
 *
 * Generates a contract library with entities, errors, events, and ports.
 */
const includeCQRSOption = Options.boolean('includeCQRS').pipe(
  Options.withDescription('Include CQRS patterns (commands, queries, projections)'),
  Options.withDefault(false)
)

const typesDatabasePackageOption = Options.text('types-database-package').pipe(
  Options.withDescription('Package name for prisma-effect-kysely generated types (e.g., @scope/types-database)'),
  Options.optional
)

const contractCommand = Command.make(
  'contract',
  {
    name: nameArg,
    description: descriptionOption,
    tags: tagsOption,
    includeCQRS: includeCQRSOption,
    typesDatabasePackage: typesDatabasePackageOption,
    verbose: verboseOption,
    quiet: quietOption
  },
  ({ description, includeCQRS, name, tags, typesDatabasePackage }) => {
    const desc = Option.getOrUndefined(description)
    const typesPkg = Option.getOrUndefined(typesDatabasePackage)
    return generateContract({
      name,
      ...(desc && { description: desc }),
      tags,
      includeCQRS,
      ...(typesPkg && { typesDatabasePackage: typesPkg })
    }).pipe(
      Effect.catchAll((error) =>
        Console.error(`Error generating contract: ${error}`).pipe(
          Effect.flatMap(() => Effect.fail(error))
        )
      )
    )
  }
).pipe(Command.withDescription(getCommandHelp('contract')))

/**
 * Data Access Generator Command
 *
 * Generates a data-access library with repositories and database operations.
 */
const dataAccessCommand = Command.make(
  'data-access',
  {
    name: nameArg,
    description: descriptionOption,
    tags: tagsOption,
    verbose: verboseOption,
    quiet: quietOption
  },
  ({ description, name, tags }) => {
    const desc = Option.getOrUndefined(description)
    return generateDataAccess({
      name,
      ...(desc && { description: desc }),
      tags
    }).pipe(
      Effect.catchAll((error) =>
        Console.error(`Error generating data-access: ${error}`).pipe(
          Effect.flatMap(() => Effect.fail(error))
        )
      )
    )
  }
).pipe(Command.withDescription(getCommandHelp('data-access')))

/**
 * Feature Generator Command
 *
 * Generates a feature library with server, client, and edge implementations.
 */
const scopeOption = Options.text('scope').pipe(
  Options.withDescription('Scope tag for the feature'),
  Options.optional
)

const platformOption = Options.choice('platform', ['node', 'browser', 'universal', 'edge']).pipe(
  Options.withDescription('Target platform for the library'),
  Options.optional
)

const includeClientServerOption = Options.boolean('includeClientServer').pipe(
  Options.withDescription('Generate client and server exports (overrides platform defaults)'),
  Options.optional
)

const includeCQRSFeatureOption = Options.boolean('includeCQRS').pipe(
  Options.withDescription('Include CQRS patterns (commands, queries, projections)'),
  Options.withDefault(false)
)

const includeSubModulesOption = Options.boolean('includeSubModules').pipe(
  Options.withDescription('Include modular sub-modules within the feature'),
  Options.withDefault(false)
)

const subModulesOption = Options.text('subModules').pipe(
  Options.withDescription(
    "Comma-separated list of sub-module names (e.g., 'cart,checkout,management')"
  ),
  Options.optional
)

const featureCommand = Command.make(
  'feature',
  {
    name: nameArg,
    description: descriptionOption,
    tags: tagsOption,
    scope: scopeOption,
    platform: platformOption,
    includeClientServer: includeClientServerOption,
    includeCQRS: includeCQRSFeatureOption,
    includeSubModules: includeSubModulesOption,
    subModules: subModulesOption,
    verbose: verboseOption,
    quiet: quietOption
  },
  ({
    description,
    includeCQRS,
    includeClientServer,
    includeSubModules,
    name,
    platform,
    scope,
    subModules,
    tags
  }) => {
    const desc = Option.getOrUndefined(description)
    const scopeValue = Option.getOrUndefined(scope)
    const platformValue = Option.getOrUndefined(platform)
    const includeCS = Option.getOrUndefined(includeClientServer)
    const subModulesVal = Option.getOrUndefined(subModules)

    return generateFeature({
      name,
      ...(desc && { description: desc }),
      tags,
      ...(scopeValue && { scope: scopeValue }),
      ...(platformValue && { platform: platformValue }),
      ...(includeCS === true && { includeClientServer: includeCS }),
      ...(includeCQRS && { includeCQRS }),
      ...(includeSubModules && { includeSubModules }),
      ...(subModulesVal && { subModules: subModulesVal })
    }).pipe(
      Effect.catchAll((error) =>
        Console.error(`Error generating feature: ${error}`).pipe(
          Effect.flatMap(() => Effect.fail(error))
        )
      )
    )
  }
).pipe(Command.withDescription(getCommandHelp('feature')))

/**
 * Infrastructure Generator Command
 *
 * Generates an infrastructure library with services and implementations.
 */
const infraCommand = Command.make(
  'infra',
  {
    name: nameArg,
    description: descriptionOption,
    tags: tagsOption,
    platform: platformOption,
    includeClientServer: includeClientServerOption,
    verbose: verboseOption,
    quiet: quietOption
  },
  ({ description, includeClientServer, name, platform, tags }) => {
    const desc = Option.getOrUndefined(description)
    const platformValue = Option.getOrUndefined(platform)
    const includeCS = Option.getOrUndefined(includeClientServer)

    return generateInfra({
      name,
      ...(desc && { description: desc }),
      tags,
      ...(platformValue && { platform: platformValue }),
      // Only include boolean flags if they are explicitly true (flag was provided)
      ...(includeCS === true && { includeClientServer: includeCS })
    }).pipe(
      Effect.catchAll((error) =>
        Console.error(`Error generating infra: ${error}`).pipe(
          Effect.flatMap(() => Effect.fail(error))
        )
      )
    )
  }
).pipe(Command.withDescription(getCommandHelp('infra')))

/**
 * Provider Generator Command
 *
 * Generates a provider library for external service integration.
 */
const externalServiceArg = Args.text({ name: 'externalService' }).pipe(
  Args.withDescription('Name of the external service to integrate')
)

const providerCommand = Command.make(
  'provider',
  {
    name: nameArg,
    externalService: externalServiceArg,
    description: descriptionOption,
    tags: tagsOption,
    platform: platformOption,
    verbose: verboseOption,
    quiet: quietOption
  },
  ({ description, externalService, name, platform, tags }) => {
    const desc = Option.getOrUndefined(description)
    const platformValue = Option.getOrUndefined(platform)

    return generateProvider({
      name,
      externalService,
      ...(desc && { description: desc }),
      tags,
      ...(platformValue && { platform: platformValue })
    }).pipe(
      Effect.catchAll((error) =>
        Console.error(`Error generating provider: ${error}`).pipe(
          Effect.flatMap(() => Effect.fail(error))
        )
      )
    )
  }
).pipe(Command.withDescription(getCommandHelp('provider')))

/**
 * Domain Generator Command
 *
 * Generates a complete domain with pre-wired dependencies:
 * - Contract library (types/schemas)
 * - Data-Access library (repository)
 * - Feature library (business logic)
 */
const domainCommand = Command.make(
  'domain',
  {
    name: nameArg,
    description: descriptionOption,
    tags: tagsOption,
    scope: scopeOption,
    includeClientServer: includeClientServerOption,
    includeCQRS: includeCQRSFeatureOption,
    verbose: verboseOption,
    quiet: quietOption
  },
  ({ description, includeCQRS, includeClientServer, name, scope, tags }) => {
    const desc = Option.getOrUndefined(description)
    const scopeValue = Option.getOrUndefined(scope)
    const includeCS = Option.getOrUndefined(includeClientServer)

    return generateDomain({
      name,
      ...(desc && { description: desc }),
      tags,
      ...(scopeValue && { scope: scopeValue }),
      ...(includeCS === true && { includeClientServer: includeCS }),
      ...(includeCQRS && { includeCQRS })
    }).pipe(
      Effect.catchAll((error) =>
        Console.error(`Error generating domain: ${error}`).pipe(
          Effect.flatMap(() => Effect.fail(error))
        )
      )
    )
  }
).pipe(Command.withDescription(getCommandHelp('domain')))

/**
 * Generate Command (parent command with subcommands)
 */
const generateCommand = Command.make('generate').pipe(
  Command.withDescription('Generate a new library'),
  Command.withSubcommands([
    contractCommand,
    dataAccessCommand,
    domainCommand,
    featureCommand,
    infraCommand,
    providerCommand
  ])
)

/**
 * Init Command
 *
 * Initializes libs/ directory architecture with built-in libraries
 */
const skipProvidersOption = Options.boolean('skip-providers').pipe(
  Options.withDescription('Skip generating built-in provider libraries'),
  Options.withDefault(false)
)

const skipInfraOption = Options.boolean('skip-infra').pipe(
  Options.withDescription('Skip generating built-in infrastructure libraries'),
  Options.withDefault(false)
)

const skipPrismaOption = Options.boolean('skip-prisma').pipe(
  Options.withDescription('Skip running prisma generate'),
  Options.withDefault(false)
)

const initCommand = Command.make(
  'init',
  {
    skipProviders: skipProvidersOption,
    skipInfra: skipInfraOption,
    skipPrisma: skipPrismaOption
  },
  ({ skipInfra, skipPrisma, skipProviders }) =>
    init({
      includeProviders: !skipProviders,
      includeInfra: !skipInfra,
      skipPrisma
    }).pipe(
      Effect.catchAll((error) =>
        Console.error(`Error initializing libs/: ${error}`).pipe(
          Effect.flatMap(() => Effect.fail(error))
        )
      )
    )
).pipe(Command.withDescription(getCommandHelp('init')))

/**
 * TUI (Text User Interface) Option
 *
 * Launches the interactive wizard mode for guided library generation
 */
const tuiOption = Options.boolean('tui').pipe(
  Options.withAlias('i'),
  Options.withDescription('Launch interactive wizard mode (React Ink TUI)'),
  Options.withDefault(false)
)

/**
 * Main CLI Application
 */
const mainCommand = Command.make('mlg', { tui: tuiOption }, ({ tui }) => {
  if (tui) {
    return runInkTUI()
  }
  // If no --tui flag and no subcommand, show help
  return Console.log(
    `Use 'mlg --help' for usage information, or 'mlg --tui' (or 'mlg -i') for interactive mode.`
  )
}).pipe(Command.withSubcommands([generateCommand, initCommand]))

const cli = Command.run(mainCommand, {
  name: 'Monorepo Library Generator',
  version: `v${VERSION}`
})

/**
 * CLI Entry Point
 *
 * Processes command-line arguments and executes the CLI application
 * with the necessary Effect platform context.
 */
export function main(args: ReadonlyArray<string>) {
  return cli(args)
}

/**
 * Run CLI - always execute when this module is the entry point
 *
 * Note: We unconditionally run the CLI here because:
 * 1. This file is only used as a bin entry point (via package.json "bin" field)
 * 2. The import.meta.url check fails with npm/npx symlinks
 * 3. When bundled, this becomes the sole purpose of the file
 */
const program = main(process.argv).pipe(Effect.provide(NodeContext.layer))
NodeRuntime.runMain(program)
