import { handleBlueprintGeneration } from "./blueprint.handler"

export const handleGenerateInfra = (input: unknown) => handleBlueprintGeneration("infra", input)
