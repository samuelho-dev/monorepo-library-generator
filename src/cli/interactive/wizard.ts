/**
 * Interactive Wizard Flow
 *
 * Orchestrates the step-by-step wizard for library generation
 *
 * @module monorepo-library-generator/cli/interactive/wizard
 */

import { Console, Effect } from "effect"
import { countFiles, formatFilePreview, getFilePreview } from "./file-preview"
import {
  confirmGeneration,
  enterDescription,
  enterExternalService,
  enterLibraryName,
  enterTags,
  getOptionsForType,
  selectLibraryType
} from "./prompts"
import { LIBRARY_TYPES, type LibraryType, type WizardOptions } from "./types"
import { colors, status } from "./ui/colors"
import { createWizardHeader, formatStepProgress, formatTargetDirectory } from "./ui/progress"

/**
 * Check if library type requires external service name
 */
function requiresExternalService(type: LibraryType) {
  const info = LIBRARY_TYPES.find((t) => t.type === type)
  return info?.hasExternalService ?? false
}

/**
 * Run the interactive wizard flow
 *
 * Returns WizardResult on success, or undefined if user cancels
 */
export function runWizard(
  librariesRoot: string
) {
  return Effect.gen(function*() {
    // Display wizard header
    yield* Console.log(createWizardHeader(librariesRoot))

    // Step 1: Select library type
    yield* Console.log(formatStepProgress("select-type"))
    yield* Console.log("")
    const libraryType = yield* selectLibraryType(librariesRoot)
    yield* Console.log("")

    const needsExternalService = requiresExternalService(libraryType)

    // Step 2: Enter library name
    yield* Console.log(formatStepProgress("enter-name", needsExternalService))
    yield* Console.log("")
    const libraryName = yield* enterLibraryName(librariesRoot, libraryType)
    yield* Console.log("")

    // Display current target
    yield* Console.log(
      `${status.arrow} Will generate to: ${formatTargetDirectory(librariesRoot, libraryType, libraryName)}`
    )
    yield* Console.log("")

    // Step 2.5: Enter external service (if provider)
    let externalService: string | undefined
    if (needsExternalService) {
      yield* Console.log(formatStepProgress("enter-external-service", true))
      yield* Console.log("")
      externalService = yield* enterExternalService()
      yield* Console.log("")
    }

    // Step 3: Configure options
    yield* Console.log(
      formatStepProgress("configure-options", needsExternalService)
    )
    yield* Console.log("")

    const options: WizardOptions = {}
    const typeOptions = getOptionsForType(libraryType)

    if (typeOptions.length > 0) {
      for (const opt of typeOptions) {
        const value = yield* opt.prompt
        options[opt.key] = value
      }
      yield* Console.log("")
    } else {
      yield* Console.log(colors.muted("  No additional options for this type"))
      yield* Console.log("")
    }

    // Optional: description and tags
    const description = yield* enterDescription()
    if (description.trim()) {
      options.description = description.trim()
    }

    const tags = yield* enterTags()
    if (tags.trim()) {
      options.tags = tags.trim()
    }
    yield* Console.log("")

    // Step 4: Review and confirm
    yield* Console.log(
      formatStepProgress("review-confirm", needsExternalService)
    )
    yield* Console.log("")

    // Show summary
    const targetDirectory = `${librariesRoot}/${libraryType}/${libraryName}`
    const files = getFilePreview(libraryType, libraryName, options)
    const fileCounts = countFiles(files)

    yield* Console.log(colors.bold("Target directory:"))
    yield* Console.log(
      `  ${formatTargetDirectory(librariesRoot, libraryType, libraryName)}`
    )
    yield* Console.log("")

    if (externalService) {
      yield* Console.log(colors.bold("External service:"))
      yield* Console.log(`  ${colors.cyan(externalService)}`)
      yield* Console.log("")
    }

    if (Object.keys(options).length > 0) {
      yield* Console.log(colors.bold("Options:"))
      for (const [key, value] of Object.entries(options)) {
        if (typeof value === "boolean" && value) {
          yield* Console.log(`  ${status.completed} ${key}`)
        } else if (typeof value === "string" && value) {
          yield* Console.log(`  ${status.arrow} ${key}: ${value}`)
        }
      }
      yield* Console.log("")
    }

    yield* Console.log(colors.bold("Files to be created:"))
    yield* Console.log(formatFilePreview(files))
    yield* Console.log("")
    yield* Console.log(
      colors.muted(
        `  Total: ${fileCounts.total} files (${fileCounts.required} required, ${fileCounts.optional} optional)`
      )
    )
    yield* Console.log("")

    // Final confirmation
    const confirmed = yield* confirmGeneration(
      targetDirectory,
      fileCounts.total
    )

    if (!confirmed) {
      yield* Console.log("")
      yield* Console.log(colors.warning("Generation cancelled."))
      return undefined
    }

    // Return result for generation
    return {
      libraryType,
      libraryName,
      ...(externalService !== undefined && { externalService }),
      targetDirectory,
      options,
      filesToCreate: files
    }
  })
}
