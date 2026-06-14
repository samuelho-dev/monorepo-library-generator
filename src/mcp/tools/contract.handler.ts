import { handleBlueprintGeneration } from "./blueprint.handler"

export const handleGenerateContract = (input: unknown) => handleBlueprintGeneration("contract", input)
