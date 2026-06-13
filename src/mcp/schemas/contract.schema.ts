import { createToolDefinition } from "./blueprint.schema"

export const ContractToolDefinition = createToolDefinition(
  "contract",
  "generate_contract",
  "Generate a capability-driven Effect v4 contract library"
)
