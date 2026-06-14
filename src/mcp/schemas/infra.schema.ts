import { createToolDefinition } from "./blueprint.schema"

export const InfraToolDefinition = createToolDefinition(
  "infra",
  "generate_infra",
  "Generate a capability-driven infrastructure service"
)
