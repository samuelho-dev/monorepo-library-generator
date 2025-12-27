/**
 * Feature Atoms Template Definition
 *
 * Declarative template for generating client/atoms/{fileName}-atoms.ts in feature libraries.
 * Creates centralized state management using @effect-atom/atom.
 *
 * @module monorepo-library-generator/templates/definitions/feature/atoms
 */

import type { TemplateDefinition } from "../../core/types"

/**
 * Feature Atoms Template Definition
 *
 * Generates an atoms file with:
 * - State type definitions
 * - Entity and list atoms
 * - Derived atoms (loading, error, data)
 * - State updater functions
 */
export const featureAtomsTemplate: TemplateDefinition = {
  id: "feature/atoms",
  meta: {
    title: "{className} Atoms",
    description: `Centralized state management for {propertyName} using @effect-atom/atom.

Features:
- Entity caching via atom.family
- Loading/error state tracking
- Derived atoms for common selectors
- Type-safe state updaters`,
    module: "{scope}/feature-{fileName}/client/atoms"
  },
  imports: [
    { from: "@effect-atom/atom", items: ["Atom", "atom"] },
    {
      from: "{scope}/contract-{fileName}",
      items: ["{className}", "{className}Id"],
      isTypeOnly: true
    }
  ],
  sections: [
    // State Types
    {
      title: "State Types",
      content: {
        type: "raw",
        value: `/**
 * Loading state for async operations
 */
export interface LoadingState {
  readonly loading: boolean
  readonly error: string | null
}

/**
 * Pagination state
 */
export interface PaginationState {
  readonly offset: number
  readonly limit: number
  readonly total: number
  readonly hasMore: boolean
}`
      }
    },
    {
      content: {
        type: "raw",
        value: `/**
 * Entity state for single {propertyName}
 */
export interface {className}EntityState extends LoadingState {
  readonly data: {className} | null
}

/**
 * List state for {propertyName} collection
 */
export interface {className}ListState extends LoadingState {
  readonly items: readonly {className}[]
  readonly pagination: PaginationState
}

/**
 * Operation state for mutations
 */
export interface {className}OperationState extends LoadingState {
  readonly lastOperation: "create" | "update" | "delete" | null
}`
      }
    },
    {
      content: {
        type: "raw",
        value: `/**
 * Combined {className} state
 */
export interface {className}State {
  readonly entity: {className}EntityState
  readonly list: {className}ListState
  readonly operation: {className}OperationState
  readonly cache: ReadonlyMap<{className}Id, {className}>
}`
      }
    },
    // Initial State
    {
      title: "Initial State",
      content: {
        type: "raw",
        value: `const INITIAL_ENTITY_STATE: {className}EntityState = {
  loading: false,
  error: null,
  data: null
}

const INITIAL_LIST_STATE: {className}ListState = {
  loading: false,
  error: null,
  items: [],
  pagination: {
    offset: 0,
    limit: 50,
    total: 0,
    hasMore: false
  }
}

const INITIAL_OPERATION_STATE: {className}OperationState = {
  loading: false,
  error: null,
  lastOperation: null
}

const INITIAL_STATE: {className}State = {
  entity: INITIAL_ENTITY_STATE,
  list: INITIAL_LIST_STATE,
  operation: INITIAL_OPERATION_STATE,
  cache: new Map()
}`
      }
    },
    // Main Atom
    {
      title: "Atoms",
      content: {
        type: "raw",
        value: `/**
 * Main {className} state atom
 */
export const {propertyName}Atom = atom<{className}State>(INITIAL_STATE)

/**
 * Entity family for caching by ID
 *
 * @example
 * \`\`\`tsx
 * const entityAtom = {propertyName}EntityFamily("{className}Id")
 * const entity = useAtomValue(entityAtom)
 * \`\`\`
 */
export const {propertyName}EntityFamily = Atom.family(
  (id: {className}Id) =>
    Atom.map({propertyName}Atom, (state) => state.cache.get(id) ?? null)
)

/**
 * Get atom for a specific {className} by ID
 */
export const get{className}Atom = (id: {className}Id) => {propertyName}EntityFamily(id)`
      }
    },
    // Derived Atoms
    {
      title: "Derived Atoms",
      content: {
        type: "raw",
        value: `/**
 * Loading state derived atom
 */
export const {propertyName}IsLoadingAtom = Atom.map(
  {propertyName}Atom,
  (state) => state.entity.loading || state.list.loading || state.operation.loading
)

/**
 * Error state derived atom
 */
export const {propertyName}ErrorAtom = Atom.map(
  {propertyName}Atom,
  (state) => state.entity.error ?? state.list.error ?? state.operation.error
)

/**
 * Current entity data derived atom
 */
export const {propertyName}DataAtom = Atom.map(
  {propertyName}Atom,
  (state) => state.entity.data
)

/**
 * List items derived atom
 */
export const {propertyName}ListAtom = Atom.map(
  {propertyName}Atom,
  (state) => state.list.items
)`
      }
    },
    // State Updaters
    {
      title: "State Updaters",
      content: {
        type: "raw",
        value: `/**
 * Update entity in state and cache
 */
export function update{className}Entity(
  setState: (updater: (prev: {className}State) => {className}State) => void,
  id: {className}Id,
  entity: {className} | null
): void {
  setState((prev) => {
    const newCache = new Map(prev.cache)
    if (entity) {
      newCache.set(id, entity)
    } else {
      newCache.delete(id)
    }

    return {
      ...prev,
      entity: {
        ...prev.entity,
        data: entity
      },
      cache: newCache
    }
  })
}

/**
 * Update list in state
 */
export function update{className}List(
  setState: (updater: (prev: {className}State) => {className}State) => void,
  items: readonly {className}[]
): void {
  setState((prev) => {
    // Also update cache with list items
    const newCache = new Map(prev.cache)
    for (const item of items) {
      newCache.set(item.id as {className}Id, item)
    }

    return {
      ...prev,
      list: {
        ...prev.list,
        items
      },
      cache: newCache
    }
  })
}

/**
 * Update operation state
 */
export function update{className}Operation(
  setState: (updater: (prev: {className}State) => {className}State) => void,
  update: Partial<{className}OperationState>
): void {
  setState((prev) => ({
    ...prev,
    operation: {
      ...prev.operation,
      ...update
    }
  }))
}

/**
 * Reset all {className} state
 */
export function reset{className}State(
  setState: (updater: (prev: {className}State) => {className}State) => void
): void {
  setState(() => INITIAL_STATE)
}`
      }
    }
  ]
}

export default featureAtomsTemplate
