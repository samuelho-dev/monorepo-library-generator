/**
 * Interactive Wizard Mode
 *
 * Entry point for the interactive TUI wizard
 *
 * @module monorepo-library-generator/cli/interactive
 */

import { Console, Effect } from "effect";
import { Terminal } from "@effect/platform";
import { createWorkspaceContext } from "../../infrastructure/workspace/context";
import { runWizard } from "./wizard";
import { colors, status } from "./ui/colors";
import type { WizardResult } from "./types";

// Re-export types
export type { LibraryType, WizardOptions, WizardResult, WizardState } from "./types";

/**
 * Execute library generation based on wizard result
 */
function executeGeneration(result: WizardResult) {
  return Effect.gen(function* () {
    // Import generators dynamically to avoid circular dependencies
    const { generateContract } = yield* Effect.promise(
      () => import("../generators/contract")
    );
    const { generateDataAccess } = yield* Effect.promise(
      () => import("../generators/data-access")
    );
    const { generateFeature } = yield* Effect.promise(
      () => import("../generators/feature")
    );
    const { generateInfra } = yield* Effect.promise(
      () => import("../generators/infra")
    );
    const { generateProvider } = yield* Effect.promise(
      () => import("../generators/provider")
    );
    const { generateDomain } = yield* Effect.promise(
      () => import("../generators/domain")
    );

    yield* Console.log("");
    yield* Console.log(`${colors.info("Generating...")} ${result.libraryType} library: ${colors.cyan(result.libraryName)}`);

    const baseArgs = {
      name: result.libraryName,
      description: result.options.description,
      tags: result.options.tags ?? "",
    };

    switch (result.libraryType) {
      case "contract":
        yield* generateContract({
          ...baseArgs,
          includeCQRS: result.options.includeCQRS ?? false,
          includeRPC: result.options.includeRPC ?? false,
        });
        break;

      case "data-access":
        yield* generateDataAccess(baseArgs);
        break;

      case "feature":
        yield* generateFeature({
          ...baseArgs,
          scope: result.options.scope,
          platform: result.options.platform,
          includeClientServer: result.options.includeClientServer,
          includeCQRS: result.options.includeCQRS,
          includeRPC: result.options.includeRPC,
          includeEdge: result.options.includeEdge,
        });
        break;

      case "infra":
        yield* generateInfra({
          ...baseArgs,
          platform: result.options.platform,
          includeClientServer: result.options.includeClientServer,
          includeEdge: result.options.includeEdge,
        });
        break;

      case "provider":
        yield* generateProvider({
          ...baseArgs,
          externalService: result.externalService ?? result.libraryName,
          platform: result.options.platform,
        });
        break;

      case "domain":
        yield* generateDomain({
          ...baseArgs,
          scope: result.options.scope,
          includeCache: result.options.includeCache,
          includeClientServer: result.options.includeClientServer,
          includeCQRS: result.options.includeCQRS,
          includeRPC: result.options.includeRPC,
          includeEdge: result.options.includeEdge,
        });
        break;
    }

    yield* Console.log("");
    yield* Console.log(`${status.completed} ${colors.success("Library generated successfully!")}`);
    yield* Console.log(`  ${colors.muted("Location:")} ${result.targetDirectory}`);
  });
}

/**
 * Run the interactive wizard mode
 *
 * This is the main entry point for `mlg -tui`
 */
export function runInteractiveMode() {
  return Effect.gen(function* () {
    // Detect workspace context
    const context = yield* createWorkspaceContext(undefined, "cli");

    // Run the wizard
    const result = yield* runWizard(context.root, context.librariesRoot);

    // If user confirmed, execute generation
    if (result) {
      yield* executeGeneration(result);
    }
  }).pipe(
    Effect.catchAll((error) =>
      Console.error(`${status.error} ${colors.error("Error:")} ${error}`)
    )
  );
}
