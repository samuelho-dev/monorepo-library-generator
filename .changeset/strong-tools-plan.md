---
"@samuelho-dev/monorepo-library-generator": major
---

Replace the legacy template system with a versioned blueprint pipeline shared by the CLI, Nx generators, and MCP server.

Generated libraries now follow the current Effect 4 and CreativeToolkits conventions, including composite TypeScript project references, explicit package entrypoints, colocated tests, and deterministic formatting. Feature clients are opt-in and require an RPC contract; client-enabled features generate a domain `AtomRpc` client and typed hooks instead of generic client service directories.

This release removes the retired template, environment, auth-contract, and database-types generator implementations. Existing generated libraries should be standardized or regenerated before adopting the new generator output.
