/**
 * CQRS Templates Index
 *
 * Exports all CQRS-related template generators.
 *
 * @module monorepo-library-generator/feature/cqrs/templates
 */

export { generateCommandsBaseFile, generateCommandsIndexFile } from './commands-base.template'
export { generateCqrsIndexFile } from './cqrs-index.template'

export {
  generateOperationsExecutorFile,
  generateOperationsIndexFile
} from './operations-executor.template'

export {
  generateProjectionsBuilderFile,
  generateProjectionsIndexFile
} from './projections-builder.template'
export { generateQueriesBaseFile, generateQueriesIndexFile } from './queries-base.template'

// Sub-module CQRS Bus (for hybrid DDD pattern)
export { generateSubModuleCqrsBusFile } from './submodule-bus.template'
