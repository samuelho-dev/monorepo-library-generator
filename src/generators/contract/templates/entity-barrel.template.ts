/**
 * Entity Barrel Template
 *
 * Generates the entities/index.ts barrel file that re-exports all entities.
 */

export interface EntityBarrelOptions {
  readonly entities: ReadonlyArray<string>
}

/**
 * Generate barrel file for entities
 *
 * Creates index.ts that re-exports all entity files.
 * Users can import from the barrel or use granular imports for tree-shaking.
 */
export function generateEntityBarrelFile(options: EntityBarrelOptions) {
  const { entities } = options

  const exports = entities
    .map((entityName) => {
      const fileName = entityNameToFileName(entityName)
      return `export * from "./${fileName}";`
    })
    .join("\n")

  return `/**
 * Entity Barrel Exports
 *
 * Re-exports all entities for convenience.
 * For better tree-shaking, use granular imports:
 *   import { Product } from './product'
 */

${exports}
`
}

/**
 * Convert entity name to file name
 */
function entityNameToFileName(entityName: string) {
  return entityName
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .toLowerCase()
}
