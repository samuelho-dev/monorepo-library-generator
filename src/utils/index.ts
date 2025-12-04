// Generator utilities
export * from "./generator-utils"
export * from "./library-generator-utils"
export * from "./naming-utils"

// Infrastructure generation
export * from "./infrastructure-generator"
export * from "./workspace-detection"

// Template utilities
export * from "./template-utils"

// TypeScript configuration utilities
export * from "./tsconfig-utils"

// Build configuration utilities
export * from "./build-config-utils"

// Library metadata utilities
export * from "./library-metadata"

// Dependency utilities
export * from "./dependency-utils"

// Platform utilities
export * from "./platform-utils"

// Filesystem adapters
export * from "./effect-fs-adapter"
export * from "./filesystem-adapter"
export * from "./tree-adapter"

// Code generation utilities
export * from "./code-generation/barrel-export-utils"
export * from "./code-generation/error-template-utils"
export * from "./code-generation/type-template-utils"
// Note: effect-patterns not exported to avoid TaggedErrorConfig naming conflict with error-template-utils

// Shared types
export * from "./shared/types"
