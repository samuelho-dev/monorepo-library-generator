// Generator utilities
export * from "./generators"
export * from "./library-metadata"
export * from "./naming"

// Infrastructure generation
export * from "./infrastructure"
export * from "./workspace-detection"

// Template utilities
export * from "./templates"

// TypeScript configuration utilities
export * from "./tsconfig"

// Build configuration utilities
export * from "./build-config"

// Platform utilities
export * from "./platforms"

// Filesystem adapters
export * from "./effect-fs-adapter"
export * from "./filesystem-adapter"
export * from "./tree-adapter"

// Code generation utilities
export * from "./code-generation/barrel-exports"
export * from "./code-generation/error-templates"
export * from "./code-generation/type-templates"
// Note: effect-patterns not exported to avoid TaggedErrorConfig naming conflict with error-templates

// Shared types
export * from "./shared/types"
