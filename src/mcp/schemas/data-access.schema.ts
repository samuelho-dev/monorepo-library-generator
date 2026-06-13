import { createToolDefinition } from "./blueprint.schema"

export const DataAccessToolDefinition = createToolDefinition(
  "data-access",
  "generate_data_access",
  "Generate data-access services with Live, Test, Auto, and test harness layers"
)
