/**
 * Data Access Library Generator Schema
 *
 * Defines the options for generating data-access libraries following
 * the Repository-Oriented Architecture pattern.
 *
 * @module @workspace/data-access-generator-schema
 */

/**
 * Data Access Library Generator Options
 */
export interface DataAccessGeneratorSchema {
  /**
   * Domain name for the data-access library (e.g., 'product', 'seller')
   *
   * Should be lowercase, kebab-case format.
   * Generates library as `@custom-repo/data-access-{domain}`
   *
   * @example
   * ```
   * pnpm exec nx g @workspace:data-access product
   * // Creates @custom-repo/data-access-product
   * ```
   */
  readonly name: string

  /**
   * Directory where the library will be created
   *
   * Defaults to 'libs/data-access'
   *
   * @default "libs/data-access"
   */
  readonly directory?: string

  /**
   * Description of the data-access library
   *
   * If not provided, will be auto-generated from the domain name
   *
   * @example
   * "Repository-based data access for product domain"
   */
  readonly description?: string

  // Dotfile generation options (Effect.ts code quality enforcement)
  // Only library-specific dotfiles (eslint.config.mjs, tsconfig.json) are added
  addDotfiles?: boolean // Default: true
  overwriteDotfiles?: boolean // Default: false
}
