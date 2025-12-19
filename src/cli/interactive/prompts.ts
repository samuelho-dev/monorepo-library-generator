/**
 * Interactive Wizard Prompts
 *
 * @effect/cli Prompt definitions for the interactive wizard
 *
 * @module monorepo-library-generator/cli/interactive/prompts
 */

import { Prompt } from "@effect/cli";
import { colors } from "./ui/colors";
import { formatTargetDirectory } from "./ui/progress";
import { LIBRARY_TYPES, type LibraryType, type WizardOptions } from "./types";

/**
 * Prompt for selecting library type
 */
export function selectLibraryType(
  librariesRoot: string
) {
  return Prompt.select({
    message: `What type of library do you want to generate?\n  ${colors.muted(`Target: ${librariesRoot}/<type>/<name>`)}`,
    choices: LIBRARY_TYPES.map((info) => ({
      title: `${info.label.padEnd(14)} ${colors.muted(`- ${info.description}`)}`,
      value: info.type,
    })),
    maxPerPage: 7,
  });
}

/**
 * Prompt for entering library name
 */
export function enterLibraryName(
  librariesRoot: string,
  libraryType: string
) {
  return Prompt.text({
    message: `Enter library name:\n  ${colors.muted(`Will generate to: ${formatTargetDirectory(librariesRoot, libraryType, undefined)}`)}`,
    validate: (input) => {
      const trimmed = input.trim();
      if (!trimmed) {
        return "Library name is required";
      }
      if (!/^[a-z][a-z0-9-]*$/.test(trimmed)) {
        return "Name must be lowercase, start with letter, contain only letters, numbers, and hyphens";
      }
      return undefined;
    },
  });
}

/**
 * Prompt for entering external service name (provider libraries only)
 */
export function enterExternalService() {
  return Prompt.text({
    message: "Enter external service name (e.g., stripe, twilio, sendgrid):",
    validate: (input) => {
      const trimmed = input.trim();
      if (!trimmed) {
        return "External service name is required";
      }
      return undefined;
    },
  });
}

/**
 * Prompt for confirming CQRS patterns
 */
export function confirmCQRS() {
  return Prompt.confirm({
    message: "Include CQRS patterns? (commands, queries, projections)",
    initial: false,
  });
}

/**
 * Prompt for confirming RPC definitions
 */
export function confirmRPC() {
  return Prompt.confirm({
    message: "Include RPC definitions?",
    initial: false,
  });
}

/**
 * Prompt for confirming client/server exports
 */
export function confirmClientServer() {
  return Prompt.confirm({
    message: "Include client and server exports?",
    initial: false,
  });
}

/**
 * Prompt for confirming edge runtime support
 */
export function confirmEdge() {
  return Prompt.confirm({
    message: "Include edge runtime support?",
    initial: false,
  });
}

/**
 * Prompt for confirming cache integration
 */
export function confirmCache() {
  return Prompt.confirm({
    message: "Include cache integration?",
    initial: false,
  });
}

/**
 * Prompt for selecting platform
 */
export function selectPlatform() {
  return Prompt.select({
    message: "Select target platform:",
    choices: [
      { title: "Universal  - Works everywhere", value: "universal" as const },
      { title: "Node       - Server-side only", value: "node" as const },
      { title: "Browser    - Client-side only", value: "browser" as const },
      { title: "Edge       - Edge runtime optimized", value: "edge" as const },
    ],
  });
}

/**
 * Prompt for entering optional description
 */
export function enterDescription() {
  return Prompt.text({
    message: "Enter description (optional, press Enter to skip):",
    default: "",
  });
}

/**
 * Prompt for entering optional tags
 */
export function enterTags() {
  return Prompt.text({
    message: "Enter comma-separated tags (optional, press Enter to skip):",
    default: "",
  });
}

/**
 * Final confirmation prompt
 */
export function confirmGeneration(
  targetDirectory: string,
  fileCount: number
) {
  return Prompt.confirm({
    message: `Generate ${fileCount} files to ${colors.cyan(targetDirectory)}?`,
    initial: true,
  });
}

/**
 * Get type-specific option prompts
 */
export function getOptionsForType(
  libraryType: LibraryType
) {
  switch (libraryType) {
    case "contract":
      return [
        { key: "includeCQRS", prompt: confirmCQRS() },
        { key: "includeRPC", prompt: confirmRPC() },
      ];
    case "feature":
      return [
        { key: "includeClientServer", prompt: confirmClientServer() },
        { key: "includeCQRS", prompt: confirmCQRS() },
        { key: "includeRPC", prompt: confirmRPC() },
        { key: "includeEdge", prompt: confirmEdge() },
      ];
    case "infra":
      return [
        { key: "includeClientServer", prompt: confirmClientServer() },
        { key: "includeEdge", prompt: confirmEdge() },
      ];
    case "domain":
      return [
        { key: "includeCache", prompt: confirmCache() },
        { key: "includeClientServer", prompt: confirmClientServer() },
        { key: "includeCQRS", prompt: confirmCQRS() },
        { key: "includeRPC", prompt: confirmRPC() },
        { key: "includeEdge", prompt: confirmEdge() },
      ];
    case "data-access":
    case "provider":
    default:
      return [];
  }
}
