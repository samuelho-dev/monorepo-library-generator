import type { Schema } from "effect"
import { Context, Effect, Layer } from "effect"

/**
 * User Command Base
 *
 * Base Command class for user CQRS write operations.

Commands represent intent to change system state.
They are transported via RPC handlers and processed by command handlers.

Pattern: Command → CommandBus → Handler → Repository → Event

Usage:
- Extend Command class for each write operation
- Register handlers with CommandBus
- Dispatch via RPC handlers
 *
 * @module @samuelho-dev/feature-user/server/cqrs/commands
 */

// ============================================================================
// Command Base Class
// ============================================================================

/**
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
 * ```typescript
 * class CreateUserCommand extends Command<
 *   typeof CreateUserInput,
 *   typeof UserResult,
 *   UserValidationError | UserNotFoundError,
 *   DatabaseService | LoggingService
 * > {
 *   readonly _tag = "CreateUserCommand";
 *   readonly input = CreateUserInput;
 *   readonly output = UserResult;
 *
 *   execute(input) {
 *     return Effect.gen(function*() {
 *       const db = yield* DatabaseService;
 *       const created = yield* db.insert(input)
 *       return created;
 *     })
 *   }
 * }
 * ```
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
  abstract readonly _tag: string /**
   * Input schema for validation
   */

  abstract readonly input: TInput /**
   * Output schema for response
   */

  abstract readonly output: TOutput /**
   * Execute the command
   *
   * @param input - Validated command input
   * @returns Effect with result or error
   */

  abstract execute(
    input: Schema.Schema.Type<TInput>
  ): Effect.Effect<Schema.Schema.Type<TOutput>, TError, TDeps>
}

// ============================================================================
// CommandBus Interface
// ============================================================================

/**
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
}

// ============================================================================
// CommandBus Context.Tag
// ============================================================================

/**
 * User CommandBus Context Tag
 *
 * Provides command dispatch capability via Context.
 *
 * @example
 * ```typescript
 * const program = Effect.gen(function*() {
 *   const bus = yield* UserCommandBus;
 *
 *   const result = yield* bus.dispatch(
 *     new CreateUserCommand(),
 *     { name: "example" }
 *   )
 *
 *   return result;
 * })
 * ```
 */
export class UserCommandBus extends Context.Tag("UserCommandBus")<
  UserCommandBus,
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
          Effect.withSpan(`UserCommandBus.dispatch.${command._tag}`)
        ),
      register: () => Effect.void
    }
  )

  /**
   * Test layer - same as Live, suitable for testing
   */
  static readonly Test = this.Live
}
