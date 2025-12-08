import { Effect } from "effect"
import type { FileSystemAdapter } from "../../utils/filesystem-adapter"
import { generateSubServiceTemplate } from "../feature/templates/sub-service.template"
import { generateSubServiceIndexTemplate } from "../feature/templates/sub-service-index.template"
import { generateSubServiceLayersTemplate } from "../feature/templates/sub-service-layers.template"
import { generateSubServiceErrorsTemplate } from "../feature/templates/sub-service-errors.template"
import { generateSubServiceTypesTemplate } from "../feature/templates/sub-service-types.template"

export interface SubServiceOptions {
  projectRoot: string
  sourceRoot: string
  packageName: string
  subServices: string[]
}

export const generateSubServices = (
  adapter: FileSystemAdapter,
  options: SubServiceOptions
) =>
  Effect.gen(function* () {
    const servicesDir = `${options.sourceRoot}/lib/server/services`

    // Create services directory
    yield* adapter.makeDirectory(servicesDir)

    // Generate each sub-service
    yield* Effect.forEach(
      options.subServices,
      (serviceName) => generateSingleSubService(adapter, {
        ...options,
        servicesDir,
        serviceName
      }),
      { concurrency: "unbounded" }
    )

    // Generate services barrel export
    yield* generateServicesBarrel(adapter, {
      servicesDir,
      subServices: options.subServices
    })

    return {
      generatedServices: options.subServices,
      filesGenerated: options.subServices.length * 5 + 1  // 5 files per service + 1 barrel
    }
  })

const generateSingleSubService = (
  adapter: FileSystemAdapter,
  options: SubServiceOptions & { servicesDir: string; serviceName: string }
) =>
  Effect.gen(function* () {
    const serviceDir = `${options.servicesDir}/${options.serviceName}`
    const className = toClassName(options.serviceName)

    // Create service directory
    yield* adapter.makeDirectory(serviceDir)

    // Generate service.ts
    yield* adapter.writeFile(
      `${serviceDir}/service.ts`,
      generateSubServiceTemplate({
        serviceName: options.serviceName,
        className,
        packageName: options.packageName
      })
    )

    // Generate index.ts
    yield* adapter.writeFile(
      `${serviceDir}/index.ts`,
      generateSubServiceIndexTemplate({ className })
    )

    // Generate layers.ts
    yield* adapter.writeFile(
      `${serviceDir}/layers.ts`,
      generateSubServiceLayersTemplate({ className })
    )

    // Generate errors.ts
    yield* adapter.writeFile(
      `${serviceDir}/errors.ts`,
      generateSubServiceErrorsTemplate({ className })
    )

    // Generate types.ts
    yield* adapter.writeFile(
      `${serviceDir}/types.ts`,
      generateSubServiceTypesTemplate({ className })
    )
  })

const generateServicesBarrel = (
  adapter: FileSystemAdapter,
  options: { servicesDir: string; subServices: string[] }
) =>
  Effect.gen(function* () {
    const exports = options.subServices
      .map(name => `export * as ${toClassName(name)} from "./${name}"`)
      .join("\n")

    yield* adapter.writeFile(
      `${options.servicesDir}/index.ts`,
      `/**
 * Sub-Services Barrel Export
 *
 * Re-exports all feature sub-services
 */

${exports}
`
    )
  })

const toClassName = (name: string): string => {
  return name
    .split("-")
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join("")
}
