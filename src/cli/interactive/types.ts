/**
 * Interactive Wizard Types
 *
 * Type definitions for the interactive TUI wizard
 *
 * @module monorepo-library-generator/cli/interactive/types
 */

/**
 * Library types that can be generated
 */
export type LibraryType =
  | "contract"
  | "data-access"
  | "feature"
  | "infra"
  | "provider"
  | "domain";

/**
 * Library type metadata for display in wizard
 */
export interface LibraryTypeInfo {
  readonly type: LibraryType;
  readonly label: string;
  readonly description: string;
  readonly hasExternalService?: boolean;
}

/**
 * Available library types with descriptions
 */
export const LIBRARY_TYPES: readonly LibraryTypeInfo[] = [
  {
    type: "contract",
    label: "Contract",
    description: "Domain types, schemas, and interfaces",
  },
  {
    type: "data-access",
    label: "Data-Access",
    description: "Repository with database operations",
  },
  {
    type: "feature",
    label: "Feature",
    description: "Business logic with server/client support",
  },
  {
    type: "infra",
    label: "Infra",
    description: "Infrastructure services and implementations",
  },
  {
    type: "provider",
    label: "Provider",
    description: "External service integrations",
    hasExternalService: true,
  },
  {
    type: "domain",
    label: "Domain",
    description: "Complete domain (contract + data-access + feature)",
  },
] as const;

/**
 * Wizard step identifiers
 */
export type WizardStep =
  | "select-type"
  | "enter-name"
  | "enter-external-service"
  | "configure-options"
  | "review-confirm";

/**
 * Wizard state at any point during flow
 */
export interface WizardState {
  readonly currentStep: WizardStep;
  readonly librariesRoot: string;
  readonly workspaceRoot: string;
  readonly libraryType?: LibraryType;
  readonly libraryName?: string;
  readonly externalService?: string;
  readonly options: WizardOptions;
}

/**
 * Configuration options gathered during wizard
 */
export interface WizardOptions {
  readonly description?: string;
  readonly tags?: string;
  readonly scope?: string;
  readonly platform?: "node" | "browser" | "universal" | "edge";
  readonly includeCQRS?: boolean;
  readonly includeRPC?: boolean;
  readonly includeClientServer?: boolean;
  readonly includeEdge?: boolean;
  readonly includeCache?: boolean;
}

/**
 * Files that will be generated (for preview)
 */
export interface FilePreview {
  readonly path: string;
  readonly description: string;
  readonly isOptional?: boolean;
}

/**
 * Completed wizard result ready for generation
 */
export interface WizardResult {
  readonly libraryType: LibraryType;
  readonly libraryName: string;
  readonly externalService?: string;
  readonly targetDirectory: string;
  readonly options: WizardOptions;
  readonly filesToCreate: readonly FilePreview[];
}
