import { createToolDefinition } from "./blueprint.schema"

export const ProviderToolDefinition = createToolDefinition(
  "provider",
  "generate_provider",
  "Generate a Pattern B provider with Live, Test, and Auto layers"
)
