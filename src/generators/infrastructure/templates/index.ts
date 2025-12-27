/**
 * Infrastructure Templates
 *
 * Templates for generating library infrastructure files:
 * - package.json
 * - tsconfig.json, tsconfig.lib.json, tsconfig.spec.json
 * - project.json
 * - vitest.config.ts
 * - README.md
 *
 * @module monorepo-library-generator/infrastructure/templates
 */

export { generatePackageJson, type PackageJsonOptions } from './package-json.template'
export { generateProjectJson, getDefaultTags, type ProjectJsonOptions } from './project-json.template'
export { generateReadme, type ReadmeOptions } from './readme.template'
export {
  generateBaseTsConfig,
  generateLibTsConfig,
  generateSpecTsConfig,
  getLibraryTypeCompilerOptions,
  type TsConfigBaseOptions,
  type TsConfigLibOptions,
  type TsConfigSpecOptions
} from './tsconfig.template'
export { generateVitestConfig, type VitestConfigOptions } from './vitest-config.template'
