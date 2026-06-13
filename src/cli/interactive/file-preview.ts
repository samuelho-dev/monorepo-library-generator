import { parseCommaSeparated } from "../../core"
import type { FilePreview, LibraryType, WizardOptions } from "./types"
import { colors, status } from "./ui/colors"

export function getFilePreview(
  libraryType: LibraryType,
  libraryName: string,
  options: WizardOptions
) {
  if (libraryType === "domain") {
    return ["contract", "data-access", "feature"].flatMap((kind) => [
      { path: `${kind}/${libraryName}/package.json`, description: `${kind} manifest` },
      { path: `${kind}/${libraryName}/project.json`, description: `${kind} Nx project` },
      { path: `${kind}/${libraryName}/src/`, description: `${kind} source` }
    ])
  }
  const modules = parseCommaSeparated(options.modules) ?? [libraryName]
  const files: Array<FilePreview> = [
    { path: "package.json", description: "Package manifest and exact exports" },
    { path: "project.json", description: "Nx run-command targets" },
    { path: "tsconfig.lib.json", description: "Composite declaration build" }
  ]
  const flat = modules.length === 1 && modules[0] === libraryName
  if (libraryType === "provider") {
    files.push({
      path: "src/lib/service.ts",
      description: `${libraryName} provider service and layers`
    })
    return files
  }
  if (libraryType === "contract") {
    const capabilities = parseCommaSeparated(options.capabilities) ?? ["errors", "ports"]
    const groups = flat
      ? [libraryName]
      : Array.from(new Set(modules.map((module) => module.split("/")[0]!)))
    for (const group of groups) {
      for (const role of capabilities.filter((capability) => capability !== "rpc")) {
        const directory = flat ? "src/lib" : `src/lib/${group}`
        files.push({ path: `${directory}/${role}.ts`, description: `${group} ${role}` })
      }
    }
    if (capabilities.includes("rpc")) {
      files.push({ path: "src/lib/rpc.ts", description: `${libraryName} RPC contract and group` })
    }
    return files
  }
  for (const module of modules) {
    if (libraryType === "feature") {
      files.push({
        path: `src/lib/server/services/${module}/service.ts`,
        description: `${module} feature service`
      })
    } else {
      const directory = flat ? "src/lib" : `src/lib/${module}`
      files.push({
        path: `${directory}/service.ts`,
        description: `${module} ${libraryType} service and layers`
      })
    }
  }
  return files
}

export function formatFilePreview(files: ReadonlyArray<FilePreview>) {
  return files
    .map((file) => {
      const icon = file.isOptional ? status.bullet : status.arrow
      return `  ${icon} ${colors.white(file.path)} ${colors.muted(`- ${file.description}`)}`
    })
    .join("\n")
}

export function countFiles(files: ReadonlyArray<FilePreview>) {
  const optional = files.filter((file) => file.isOptional).length
  return { total: files.length, required: files.length - optional, optional }
}

export function getTargetDirectory(
  librariesRoot: string,
  libraryType: LibraryType,
  libraryName: string
) {
  return libraryType === "domain" ? librariesRoot : `${librariesRoot}/${libraryType}/${libraryName}`
}

export function getCreationDescription(libraryType: LibraryType, libraryName: string) {
  return libraryType === "domain"
    ? `Creating contract/${libraryName}, data-access/${libraryName}, and feature/${libraryName}`
    : `Creating ${libraryType}/${libraryName}`
}
