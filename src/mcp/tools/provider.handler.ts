import { handleBlueprintGeneration } from "./blueprint.handler"

export const handleGenerateProvider = (input: unknown) => handleBlueprintGeneration("provider", input)
