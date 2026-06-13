import { handleBlueprintGeneration } from "./blueprint.handler"

export const handleGenerateDataAccess = (input: unknown) => handleBlueprintGeneration("data-access", input)
