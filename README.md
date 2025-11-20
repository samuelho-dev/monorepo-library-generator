# @samuelho-dev/monorepo-library-generator

> Effect-based monorepo library generator with Nx integration

Generate production-ready TypeScript libraries for Effect-native monorepos with a single command. Supports contract, data-access, feature, infrastructure, and provider library types following Effect best practices.

## Features

- 🚀 **5 Library Types**: Contract, Data Access, Feature, Infrastructure, Provider
- 🎯 **Effect-First**: Uses Effect patterns (Context.Tag, Layer, Data.TaggedError)
- 📦 **Nx Integration**: Works as Nx generator or standalone CLI
- 🔧 **TypeScript**: Strict mode, project references, composite builds
- 🧪 **Testing**: Vitest + @effect/vitest integration
- 📚 **Documentation**: Comprehensive inline docs and examples
- 🏗️ **Best Practices**: Follows Effect 3.0+ patterns and Nx conventions

## Installation

### As Standalone CLI

```bash
# Run directly with npx (no installation required)
npx @samuelho-dev/monorepo-library-generator contract product

# Or install globally
npm install -g @samuelho-dev/monorepo-library-generator
mlg contract product
```

### As Nx Generator (in Nx workspace)

```bash
# Install as dev dependency
npm install -D @samuelho-dev/monorepo-library-generator

# Use with nx generate
npx nx g @samuelho-dev/monorepo-library-generator:contract product
```

## Quick Start

### Generate a Contract Library

```bash
mlg contract product
```

Creates a contract library with entities, errors, events, and ports using Effect patterns.

### Generate a Data Access Library

```bash
mlg data-access product
```

Creates a data-access library with repository implementation and Kysely query builders.

### Generate a Feature Library

```bash
mlg feature user-management
```

Creates a feature library with business logic and optional React hooks.

### Generate an Infrastructure Library

```bash
mlg infra cache
```

Creates an infrastructure library for technical services like caching or logging.

### Generate a Provider Library

```bash
mlg provider stripe
```

Creates a provider library for external service integration with proper error handling.

## Library Types

- **Contract**: Domain boundaries with types and interfaces
- **Data Access**: Database operations and persistence
- **Feature**: Application features with business logic
- **Infrastructure**: Technical infrastructure services
- **Provider**: External service integration

## CLI Options

```bash
# Contract
mlg contract <name> [--description] [--includeCQRS] [--includeRPC]

# Data Access
mlg data-access <name> [--description]

# Feature
mlg feature <name> [--platform] [--includeRPC]

# Infrastructure
mlg infra <name> [--description]

# Provider
mlg provider <name> --externalService <service> [--platform]
```

## Key Patterns

All generated libraries follow Effect best practices:

- **Context.Tag** for dependency injection
- **Data.TaggedError** for type-safe errors
- **Layer** pattern for configuration
- **Schema.Class** for domain entities
- **Effect** for async operations

## Requirements

- Node.js 18+
- TypeScript 5.6+
- Effect 3.0+

## Contributing

Contributions welcome! Please open an issue or submit a PR.

## License

MIT © Samuel Ho

## Links

- [Repository](https://github.com/samuelho-dev/monorepo-library-generator)
- [Issues](https://github.com/samuelho-dev/monorepo-library-generator/issues)
- [Effect Documentation](https://effect.website)

---

**Made with Effect** ⚡️
