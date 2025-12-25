# @samuelho-dev/env

Type-safe environment variable access with Effect Config.

## Features

- 🔒 **Single Source of Truth**: One `createEnv` call defines all variables
- 🔐 **Secure**: Secrets protected with `Redacted<string>`
- 🚀 **Fail-fast**: Eager loading on module initialization
- 🛡️ **Runtime Protection**: Server vars throw on client access
- ⚡ **Type Inference**: Types derived via `Config.Config.Success<>`

## Usage

```typescript
import { env } from '@samuelho-dev/env';

// Server context: All variables accessible
env.DATABASE_URL    // Redacted<string>
env.PORT            // number
env.PUBLIC_API_URL  // string
env.NODE_ENV        // string

// Client context: Only client + shared vars
env.PUBLIC_API_URL  // string (works)
env.NODE_ENV        // string (works)
env.DATABASE_URL    // ❌ Runtime error
```

## Customization

Edit `src/env.ts` to modify environment variables:

```typescript
import { createEnv, Config } from "./createEnv"

export const env = createEnv({
  server: {
    DATABASE_URL: Config.redacted("DATABASE_URL"),
    PORT: Config.number("PORT").pipe(Config.withDefault(3000)),
  },
  client: {
    PUBLIC_API_URL: Config.string("PUBLIC_API_URL"),
  },
  shared: {
    NODE_ENV: Config.string("NODE_ENV").pipe(Config.withDefault("development")),
  },
  clientPrefix: "PUBLIC_",
})
```

## Architecture

- **Eager loading**: Variables loaded once on module initialization
- **Effect Config**: Type-safe validation with `Config.all()`
- **Proxy Protection**: Server vars throw on client access
- **ManagedRuntime**: Resource lifecycle management

## Generated Files

This library is auto-generated from your .env file. To regenerate:

```bash
pnpm exec monorepo-library-generator env
```
