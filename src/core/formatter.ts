import { Biome, type Configuration } from "@biomejs/js-api/nodejs"
import type { GeneratedFile } from "./types"

const biome = new Biome()
const { projectKey } = biome.openProject()

const configuration = {
  formatter: {
    enabled: true,
    indentStyle: "space",
    indentWidth: 2,
    lineWidth: 100,
    lineEnding: "lf"
  },
  javascript: {
    formatter: {
      quoteStyle: "single",
      jsxQuoteStyle: "double",
      semicolons: "asNeeded",
      trailingCommas: "none",
      arrowParentheses: "always",
      bracketSpacing: true
    }
  },
  json: {
    parser: {
      allowComments: true,
      allowTrailingCommas: true
    },
    formatter: {
      trailingCommas: "none"
    }
  },
  linter: {
    enabled: false,
    rules: { recommended: false }
  },
  assist: {
    enabled: true,
    actions: {
      recommended: false,
      source: { organizeImports: "on" }
    }
  }
} satisfies Configuration

biome.applyConfiguration(projectKey, configuration)

export function formatGeneratedFile(file: GeneratedFile) {
  const organized = file.format === "typescript"
    ? biome.lintContent(projectKey, file.content, {
      filePath: file.path,
      fixFileMode: "safeFixes"
    }).content
    : file.content
  const formatted = biome.formatContent(projectKey, organized, { filePath: file.path })
  if (formatted.diagnostics.length > 0) {
    throw new Error(`Failed to format generated file: ${file.path}`)
  }
  return { ...file, content: formatted.content }
}
