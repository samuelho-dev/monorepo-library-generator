/**
 * Atoms Template
 *
 * Generates client/atoms/{name}-atoms.ts file for feature libraries.
 *
 * Contract-First Architecture:
 * - Parent module atoms centralize ALL state management
 * - RPC integration for data fetching
 * - Sub-modules access state through parent atoms (no sub-module atoms)
 *
 * @module monorepo-library-generator/feature/atoms-template
 */

import { TypeScriptBuilder } from "../../../utils/code-builder"
import type { FeatureTemplateOptions } from "../../../utils/types"
import { WORKSPACE_CONFIG } from "../../../utils/workspace-config"

/**
 * Generate client/atoms/{name}-atoms.ts file for feature library
 *
 * Creates Effect atoms with RPC integration for client-side state management.
 * This is the SINGLE source of truth for all state in the feature domain.
 */
export function generateAtomsFile(options: FeatureTemplateOptions) {
  const builder = new TypeScriptBuilder()
  const { className, fileName, name, propertyName } = options
  const scope = WORKSPACE_CONFIG.getScope()

  // Add file header
  builder.addFileHeader({
    title: `${className} Client State`,
    description: `Centralized state management for ${name} feature using @effect-atom/atom.

Contract-First Architecture:
- This parent module atom is the SINGLE source of truth for ${name} state
- RPC integration via useRpcClient for data fetching
- Sub-modules access state through these atoms (no sub-module atoms)

State Hierarchy:
  ${className}Atom (this file)
  ├── Loading/error state
  ├── Entity data
  ├── Lists and pagination
  └── Sub-module operational state

Usage:
  import { use${className} } from "${scope}/feature-${fileName}/client";
  const { data, isLoading, fetch } = use${className}()`,
    module: `${scope}/feature-${fileName}/client/atoms`
  })

  // Add imports
  builder.addImports([
    { from: "@effect-atom/atom", imports: ["Atom"] },
    {
      from: `${scope}/contract-${fileName}`,
      imports: [{ name: `${className}Select`, alias: className }],
      isTypeOnly: true
    }
  ])

  builder.addSectionComment("State Types")

  // Add state interfaces
  builder.addRaw(`/**
 * Loading state for async operations
 */
export type LoadingState = "idle" | "loading" | "refreshing" | "error"

/**
 * Pagination state for list operations
 */
export interface PaginationState {
  readonly page: number
  readonly pageSize: number
  readonly totalCount: number
  readonly hasMore: boolean
}

/**
 * ${className} entity state (single item)
 */
export interface ${className}EntityState {
  readonly data: ${className} | null
  readonly loadingState: LoadingState
  readonly error: string | null
  readonly lastUpdated: number | null
}

/**
 * ${className} list state (collection)
 */
export interface ${className}ListState {
  readonly items: ReadonlyArray<${className}>
  readonly loadingState: LoadingState
  readonly error: string | null
  readonly pagination: PaginationState
  readonly lastUpdated: number | null
}

/**
 * ${className} operation state (for mutations)
 */
export interface ${className}OperationState {
  readonly isSubmitting: boolean
  readonly error: string | null
  readonly lastOperation: string | null
}

/**
 * Combined ${className} state
 */
export interface ${className}State {
  readonly entity: ${className}EntityState
  readonly list: ${className}ListState
  readonly operation: ${className}OperationState
}`)
  builder.addBlankLine()

  builder.addSectionComment("Initial States")

  builder.addRaw(`const initial${className}EntityState: ${className}EntityState = {
  data: null,
  loadingState: "idle",
  error: null,
  lastUpdated: null
}

const initial${className}ListState: ${className}ListState = {
  items: [],
  loadingState: "idle",
  error: null,
  pagination: {
    page: 1,
    pageSize: 20,
    totalCount: 0,
    hasMore: false
  },
  lastUpdated: null
}

const initial${className}OperationState: ${className}OperationState = {
  isSubmitting: false,
  error: null,
  lastOperation: null
}

const initial${className}State: ${className}State = {
  entity: initial${className}EntityState,
  list: initial${className}ListState,
  operation: initial${className}OperationState
}`)
  builder.addBlankLine()

  builder.addSectionComment("Atoms")

  // Main combined atom
  builder.addRaw(`/**
 * Main ${name} state atom
 *
 * Central state for the entire ${name} feature domain.
 * Sub-modules access this atom for shared state.
 */
export const ${propertyName}Atom = Atom.make<${className}State>(initial${className}State)`)
  builder.addBlankLine()

  // Entity family atom for caching by ID
  builder.addRaw(`/**
 * ${className} entity cache (by ID)
 *
 * Atom.family for caching individual entities by ID.
 * Each unique ID gets its own independent atom instance, preventing cache collisions.
 *
 * The \`id\` parameter is used as the cache key to ensure separate state
 * for each entity. When you call ${propertyName}EntityFamily("user-123"), it returns
 * the same atom instance every time for that ID.
 *
 * Usage Example:
 *   // In a component
 *   const userAtom = ${propertyName}EntityFamily("user-123")
 *   const [state, setState] = useAtom(userAtom)
 *
 *   // Fetch and cache
 *   setState({ data: fetchedUser, loadingState: "idle", error: null, lastUpdated: Date.now() })
 *
 * Benefits:
 * - Multiple entities can be cached simultaneously
 * - Automatic deduplication (same ID = same atom instance)
 * - Independent loading/error states per entity
 */
export const ${propertyName}EntityFamily = Atom.family((id: string) => {
  // The id parameter is used internally by Atom.family as the cache key
  // Each unique id gets a separate atom instance
  return Atom.make<${className}EntityState>(initial${className}EntityState)
})

/**
 * Helper to fetch and cache a single ${className} entity by ID
 *
 * This uses the entity family to create/retrieve the atom for the given ID,
 * then can be extended to trigger RPC calls to fetch the data.
 *
 * @param id - The entity ID to fetch
 * @returns The entity atom for the given ID
 */
export function get${className}Atom(id: string) {
  // Returns the keyed atom instance for this specific ID
  // The entity family ensures the same ID always returns the same atom
  return ${propertyName}EntityFamily(id)
}`)
  builder.addBlankLine()

  builder.addSectionComment("Derived Atoms")

  // Derived atoms for common access patterns
  builder.addRaw(`/**
 * Is any operation loading?
 */
export const ${propertyName}IsLoadingAtom = Atom.map(${propertyName}Atom, (state) =>
  state.entity.loadingState === "loading" ||
  state.list.loadingState === "loading" ||
  state.operation.isSubmitting
)

/**
 * Current error (if any)
 */
export const ${propertyName}ErrorAtom = Atom.map(${propertyName}Atom, (state) =>
  state.entity.error || state.list.error || state.operation.error
)

/**
 * Current entity data
 */
export const ${propertyName}DataAtom = Atom.map(${propertyName}Atom, (state) => state.entity.data)

/**
 * Current list items
 */
export const ${propertyName}ListAtom = Atom.map(${propertyName}Atom, (state) => state.list.items)`)
  builder.addBlankLine()

  builder.addSectionComment("State Updaters")

  // State update functions
  builder.addRaw(`/**
 * Update entity state
 */
export function update${className}Entity(
  update: Partial<${className}EntityState>
): (state: ${className}State) => ${className}State {
  return (state) => ({
    ...state,
    entity: { ...state.entity, ...update }
  })
}

/**
 * Update list state
 */
export function update${className}List(
  update: Partial<${className}ListState>
): (state: ${className}State) => ${className}State {
  return (state) => ({
    ...state,
    list: { ...state.list, ...update }
  })
}

/**
 * Update operation state
 */
export function update${className}Operation(
  update: Partial<${className}OperationState>
): (state: ${className}State) => ${className}State {
  return (state) => ({
    ...state,
    operation: { ...state.operation, ...update }
  })
}

/**
 * Reset all state to initial
 */
export function reset${className}State(): ${className}State {
  return initial${className}State
}`)
  builder.addBlankLine()

  return builder.toString()
}
