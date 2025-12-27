/**
 * CQRS Commands Base Template
 *
 * Generates server/cqrs/commands/base.ts with abstract Command class and CommandBus.
 *
 * @module monorepo-library-generator/feature/cqrs/commands-base-template
 */

import { TypeScriptBuilder } from "../../../../utils/code-builder"
import type { FeatureTemplateOptions } from "../../../../utils/types"

/**
 * Generate server/cqrs/commands/base.ts file
 *
 * Creates base Command class for CQRS write operations:
 * - Abstract Command class with Effect patterns
 * - CommandBus Context.Tag for dispatching
 * - Type-safe input/output via Schema
 */
export function generateCommandsBaseFile(options: FeatureTemplateOptions) {
  const builder = new TypeScriptBuilder()
  const { className, name } = options

  builder.addFileHeader({
    title: `${className} Command Base`,
    description: `Base Command class for ${name} CQRS write operations.

Commands represent intent to change system state.
They are transported via RPC handlers and processed by command handlers.

Pattern: Command → CommandBus → Handler → Repository → Event

Usage:
- Extend Command class for each write operation
- Register handlers with CommandBus
- Dispatch via RPC handlers`,
    module: `${options.packageName}/server/cqrs/commands`
  })
  builder.addBlankLine()

  builder.addImports([{ from: "effect", imports: ["Context", "Effect", "Layer", "Schema"] }])
  builder.addBlankLine()

  builder.addSectionComment("Command Base Class")
  builder.addBlankLine()

  builder.addRaw(`/**
 * Base Command for CQRS write operations
 *
 * Commands represent intent to change system state.
 * They are transported via RPC and processed by command handlers.
 *
 * @typeParam TInput - Schema for command input
 * @typeParam TOutput - Schema for command output (result)
 * @typeParam TError - Union type of possible errors
 * @typeParam TDeps - Context dependencies required by handler
 *
 * @example
 * \`\`\`typescript
 * class Create${className}Command extends Command<
 *   typeof Create${className}Input,
 *   typeof ${className}Result,
 *   ${className}ValidationError | ${className}NotFoundError,
 *   DatabaseService | LoggingService
 * > {
 *   readonly _tag = "Create${className}Command";
 *   readonly input = Create${className}Input;
 *   readonly output = ${className}Result;
 *
 *   execute(input) {
 *     return Effect.gen(function*() {
 *       const db = yield* DatabaseService;
 *       const created = yield* db.insert(input)
 *       return created;
 *     })
 *   }
 * }
 * \`\`\`
 */
export abstract class Command<
  TInput extends Schema.Schema.AnyNoContext,
  TOutput extends Schema.Schema.AnyNoContext,
  TError,
  TDeps = never
> {
  /**
   * Unique command tag for routing
   */
  abstract readonly _tag: string  /**
   * Input schema for validation
   */
  abstract readonly input: TInput  /**
   * Output schema for response
   */
  abstract readonly output: TOutput  /**
   * Execute the command
   *
   * @param input - Validated command input
   * @returns Effect with result or error
   */
  abstract execute(
    input: Schema.Schema.Type<TInput>
  ): Effect.Effect<Schema.Schema.Type<TOutput>, TError, TDeps>
}`)
  builder.addBlankLine()

  builder.addSectionComment("CommandBus Interface")
  builder.addBlankLine()

  builder.addRaw(`/**
 * CommandBus Interface
 *
 * Dispatches commands to their handlers.
 */
export interface CommandBusInterface {
  /**
   * Dispatch a command to its handler
   *
   * @param command - The command instance to dispatch
   * @param input - The validated input for the command
   */
  readonly dispatch: <
    TInput extends Schema.Schema.AnyNoContext,
    TOutput extends Schema.Schema.AnyNoContext,
    TError,
    TDeps
  >(
    command: Command<TInput, TOutput, TError, TDeps>,
    input: Schema.Schema.Type<TInput>
  ) => Effect.Effect<Schema.Schema.Type<TOutput>, TError, TDeps>

  /**
   * Register a command handler
   */
  readonly register: <
    TInput extends Schema.Schema.AnyNoContext,
    TOutput extends Schema.Schema.AnyNoContext,
    TError,
    TDeps
  >(
    command: Command<TInput, TOutput, TError, TDeps>
  ) => Effect.Effect<void>
}`)
  builder.addBlankLine()

  builder.addSectionComment("CommandBus Context.Tag")
  builder.addBlankLine()

  builder.addRaw(`/**
 * ${className} CommandBus Context Tag
 *
 * Provides command dispatch capability via Context.
 *
 * @example
 * \`\`\`typescript
 * const program = Effect.gen(function*() {
 *   const bus = yield* ${className}CommandBus;
 *
 *   const result = yield* bus.dispatch(
 *     new Create${className}Command(),
 *     { name: "example" }
 *   )
 *
 *   return result;
 * })
 * \`\`\`
 */
export class ${className}CommandBus extends Context.Tag("${className}CommandBus")<
  ${className}CommandBus,
  CommandBusInterface
>() {
  /**
   * Live layer - dispatches commands directly to their execute method
   */
  static readonly Live = Layer.succeed(
    this,
    {
      dispatch: (command, input) =>
        command.execute(input).pipe(
          Effect.withSpan(\`${className}CommandBus.dispatch.\${command._tag}\`)
        ),
      register: () => Effect.void,
    }
  )

  /**
   * Test layer - same as Live, suitable for testing
   */
  static readonly Test = this.Live;
}`)

  return builder.toString()
}

/**
 * Generate server/cqrs/commands/index.ts file
 */
export function generateCommandsIndexFile(options: FeatureTemplateOptions) {
  const builder = new TypeScriptBuilder()
  const { className } = options

  builder.addFileHeader({
    title: `${className} CQRS Commands Index`,
    description: "Barrel export for CQRS commands.",
    module: `${options.packageName}/server/cqrs/commands`
  })
  builder.addBlankLine()

  builder.addRaw(`export { Command, ${className}CommandBus } from "./base"
export type { CommandBusInterface } from "./base"`)

  return builder.toString()
}
