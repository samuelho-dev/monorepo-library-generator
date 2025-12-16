/**
 * Environment Generator Schema
 *
 * Options for updating the environment library with type-safe
 * environment variable handling.
 */

export interface EnvGeneratorSchema {
  /**
   * Project root directory for the env library
   * @default "libs/env"
   */
  projectRoot?: string
}
