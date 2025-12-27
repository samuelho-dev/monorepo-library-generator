/**
 * Template Registry
 *
 * Central registry for all template definitions.
 * Provides lookup by library type and file type.
 *
 * @module monorepo-library-generator/templates/registry/registry
 */

import {
  contractErrorsTemplate,
  contractEventsTemplate,
  contractPortsTemplate,
  dataAccessErrorsTemplate,
  dataAccessLayersTemplate,
  featureLayersTemplate,
  featureServiceTemplate,
  infraErrorsTemplate,
  infraServiceTemplate,
  providerErrorsTemplate,
  providerServiceTemplate
} from '../definitions'
import type {
  FileType,
  LibraryType,
  TemplateKey,
  TemplateMetadata,
  TemplateRegistry,
  TemplateRegistryEntry
} from './types'

// ============================================================================
// Template Metadata
// ============================================================================

const BASE_CONTEXT = [
  'className',
  'fileName',
  'propertyName',
  'constantName',
  'scope',
  'packageName',
  'projectName',
  'libraryType'
] as const

/**
 * Template metadata definitions
 */
const templateMetadata: Record<string, TemplateMetadata> = {
  // Contract templates
  'contract/errors': {
    id: 'contract/errors',
    libraryType: 'contract',
    fileType: 'errors',
    description: 'Domain and repository error types',
    requiredContext: [...BASE_CONTEXT]
  },
  'contract/events': {
    id: 'contract/events',
    libraryType: 'contract',
    fileType: 'events',
    description: 'Domain event schemas for event sourcing',
    requiredContext: [...BASE_CONTEXT]
  },
  'contract/ports': {
    id: 'contract/ports',
    libraryType: 'contract',
    fileType: 'ports',
    description: 'Repository and service port interfaces',
    requiredContext: [...BASE_CONTEXT],
    optionalContext: ['includeCQRS', 'entityTypeSource']
  },

  // Data-access templates
  'data-access/errors': {
    id: 'data-access/errors',
    libraryType: 'data-access',
    fileType: 'errors',
    description: 'Infrastructure errors (Connection, Timeout, Transaction)',
    requiredContext: [...BASE_CONTEXT]
  },
  'data-access/layers': {
    id: 'data-access/layers',
    libraryType: 'data-access',
    fileType: 'layers',
    description: 'Effect layer compositions for data-access',
    requiredContext: [...BASE_CONTEXT]
  },

  // Feature templates
  'feature/service': {
    id: 'feature/service',
    libraryType: 'feature',
    fileType: 'service',
    description: 'Feature service with Context.Tag and observability',
    requiredContext: [...BASE_CONTEXT]
  },
  'feature/layers': {
    id: 'feature/layers',
    libraryType: 'feature',
    fileType: 'layers',
    description: 'Feature layer compositions',
    requiredContext: [...BASE_CONTEXT]
  },

  // Infra templates
  'infra/errors': {
    id: 'infra/errors',
    libraryType: 'infra',
    fileType: 'errors',
    description: 'Infrastructure service errors',
    requiredContext: [...BASE_CONTEXT]
  },
  'infra/service': {
    id: 'infra/service',
    libraryType: 'infra',
    fileType: 'service',
    description: 'Infrastructure service with Context.Tag',
    requiredContext: [...BASE_CONTEXT]
  },

  // Provider templates
  'provider/errors': {
    id: 'provider/errors',
    libraryType: 'provider',
    fileType: 'errors',
    description: 'Provider errors (RateLimit, Auth, Network)',
    requiredContext: [...BASE_CONTEXT],
    optionalContext: ['externalService']
  },
  'provider/service': {
    id: 'provider/service',
    libraryType: 'provider',
    fileType: 'service',
    description: 'External service provider with CRUD operations',
    requiredContext: [...BASE_CONTEXT],
    optionalContext: ['externalService']
  }
}

// ============================================================================
// Registry Implementation
// ============================================================================

/**
 * Template registry entries
 */
const registryEntries: Map<TemplateKey, TemplateRegistryEntry> = new Map([
  // Contract templates
  [
    'contract/errors',
    {
      template: contractErrorsTemplate,
      metadata: templateMetadata['contract/errors']
    }
  ],
  [
    'contract/events',
    {
      template: contractEventsTemplate,
      metadata: templateMetadata['contract/events']
    }
  ],
  [
    'contract/ports',
    {
      template: contractPortsTemplate,
      metadata: templateMetadata['contract/ports']
    }
  ],

  // Data-access templates
  [
    'data-access/errors',
    {
      template: dataAccessErrorsTemplate,
      metadata: templateMetadata['data-access/errors']
    }
  ],
  [
    'data-access/layers',
    {
      template: dataAccessLayersTemplate,
      metadata: templateMetadata['data-access/layers']
    }
  ],

  // Feature templates
  [
    'feature/service',
    {
      template: featureServiceTemplate,
      metadata: templateMetadata['feature/service']
    }
  ],
  [
    'feature/layers',
    {
      template: featureLayersTemplate,
      metadata: templateMetadata['feature/layers']
    }
  ],

  // Infra templates
  [
    'infra/errors',
    {
      template: infraErrorsTemplate,
      metadata: templateMetadata['infra/errors']
    }
  ],
  [
    'infra/service',
    {
      template: infraServiceTemplate,
      metadata: templateMetadata['infra/service']
    }
  ],

  // Provider templates
  [
    'provider/errors',
    {
      template: providerErrorsTemplate,
      metadata: templateMetadata['provider/errors']
    }
  ],
  [
    'provider/service',
    {
      template: providerServiceTemplate,
      metadata: templateMetadata['provider/service']
    }
  ]
])

/**
 * Create the template registry
 */
export function createTemplateRegistry() {
  return {
    get: (key: TemplateKey) => registryEntries.get(key),

    getByLibraryType: (libraryType: LibraryType) => {
      const entries: Array<TemplateRegistryEntry> = []
      for (const [key, entry] of registryEntries) {
        if (key.startsWith(`${libraryType}/`)) {
          entries.push(entry)
        }
      }
      return entries
    },

    keys: () => Array.from(registryEntries.keys()),

    has: (key: TemplateKey) => registryEntries.has(key),

    size: () => registryEntries.size
  }
}

/**
 * Shared registry instance
 */
let sharedRegistry: TemplateRegistry | null = null

/**
 * Get the shared template registry
 */
export function getTemplateRegistry() {
  if (!sharedRegistry) {
    sharedRegistry = createTemplateRegistry()
  }
  return sharedRegistry
}

// ============================================================================
// Lookup Helpers
// ============================================================================

/**
 * Get available file types for a library type
 */
export function getAvailableFileTypes(libraryType: LibraryType) {
  const registry = getTemplateRegistry()
  const entries = registry.getByLibraryType(libraryType)
  return entries.map((entry) => entry.metadata.fileType)
}

/**
 * Get template by library type and file type
 */
export function getTemplate(libraryType: LibraryType, fileType: FileType) {
  const registry = getTemplateRegistry()
  const key: TemplateKey = `${libraryType}/${fileType}`
  return registry.get(key)
}

/**
 * Check if a template exists for the given library and file type
 */
export function hasTemplate(libraryType: LibraryType, fileType: FileType) {
  const registry = getTemplateRegistry()
  const key: TemplateKey = `${libraryType}/${fileType}`
  return registry.has(key)
}

/**
 * Get all registered library types
 */
export function getRegisteredLibraryTypes() {
  const registry = getTemplateRegistry()
  const types = new Set<LibraryType>()
  for (const key of registry.keys()) {
    const [libraryType] = key.split('/')
    if (libraryType) {
      types.add(libraryType)
    }
  }
  return Array.from(types)
}

/**
 * Validate that all required context variables are present
 */
export function validateContext(key: TemplateKey, context: Record<string, unknown>) {
  const registry = getTemplateRegistry()
  const entry = registry.get(key)

  if (!entry) {
    return { valid: false, missing: ['Template not found'] }
  }

  const missing: Array<string> = []
  for (const required of entry.metadata.requiredContext) {
    if (!(required in context)) {
      missing.push(required)
    }
  }

  return { valid: missing.length === 0, missing }
}
