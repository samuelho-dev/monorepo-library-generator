import { handleBlueprintGeneration } from "./blueprint.handler"

export const handleGenerateFeature = (input: unknown) => handleBlueprintGeneration("feature", input)
