/**
 * TypeScript Builder
 *
 * Type-safe builder for generating TypeScript code programmatically.
 * Provides a fluent API for constructing TypeScript files with automatic
 * import management, proper formatting, and validation.
 *
 * @module monorepo-library-generator/typescript-builder
 */

export interface ImportSpec {
  from: string
  imports: Array<string>
  isTypeOnly?: boolean
}

export interface FileHeaderOptions {
  title: string
  description: string
  module?: string
  since?: string
  see?: Array<string>
}

export interface ClassConfig {
  className: string
  extends?: string
  implements?: Array<string>
  exported?: boolean
  jsdoc?: string
  fields?: Array<FieldConfig>
  methods?: Array<MethodConfig>
  staticMethods?: Array<MethodConfig>
  staticProperties?: Array<PropertyConfig>
}

export interface FieldConfig {
  name: string
  type: string
  readonly?: boolean
  optional?: boolean
  visibility?: "public" | "private" | "protected"
  jsdoc?: string
}

export interface MethodConfig {
  name: string
  params: Array<ParameterConfig>
  returnType?: string
  body: string
  isAsync?: boolean
  visibility?: "public" | "private" | "protected"
  jsdoc?: string
}

export interface ParameterConfig {
  name: string
  type: string
  optional?: boolean
  defaultValue?: string
}

export interface PropertyConfig {
  name: string
  type: string
  value: string
  readonly?: boolean
  jsdoc?: string
}

export interface InterfaceConfig {
  name: string
  extends?: Array<string>
  exported?: boolean
  jsdoc?: string
  properties: Array<PropertySignature>
}

export interface PropertySignature {
  name: string
  type: string
  readonly?: boolean
  optional?: boolean
  jsdoc?: string
}

export interface TypeAliasConfig {
  name: string
  type: string
  exported?: boolean
  jsdoc?: string
  typeParams?: Array<string>
}

export interface FunctionConfig {
  name: string
  params: Array<ParameterConfig>
  returnType?: string
  body: string
  exported?: boolean
  isAsync?: boolean
  jsdoc?: string
  typeParams?: Array<string>
}

/**
 * Type-safe builder for generating TypeScript code
 */
export class TypeScriptBuilder {
  private lines: Array<string> = []
  private imports: Map<string, Set<string>> = new Map()
  private typeImports: Map<string, Set<string>> = new Map()

  /**
   * Add a file header with JSDoc documentation
   */
  addFileHeader(options: FileHeaderOptions) {
    this.lines.push("/**")
    this.lines.push(` * ${options.title}`)
    this.lines.push(" *")
    this.lines.push(` * ${options.description}`)
    this.lines.push(" *")

    if (options.module) {
      this.lines.push(` * @module ${options.module}`)
    }

    if (options.since) {
      this.lines.push(` * @since ${options.since}`)
    }

    if (options.see && options.see.length > 0) {
      for (const see of options.see) {
        this.lines.push(` * @see ${see}`)
      }
    }

    this.lines.push(" */")
    this.lines.push("")

    return this
  }

  /**
   * Add import statements
   */
  addImports(imports: Array<ImportSpec>) {
    for (const { from, imports: names, isTypeOnly } of imports) {
      const targetMap = isTypeOnly ? this.typeImports : this.imports

      if (!targetMap.has(from)) {
        targetMap.set(from, new Set())
      }

      for (const name of names) {
        const importSet = targetMap.get(from)
        if (!importSet) {
          throw new Error(`Import set not found for ${from}`)
        }
        importSet.add(name)
      }
    }

    return this
  }

  /**
   * Add a single import
   */
  addImport(from: string, name: string, isTypeOnly = false) {
    return this.addImports([{ from, imports: [name], isTypeOnly }])
  }

  /**
   * Add a blank line
   */
  addBlankLine() {
    this.lines.push("")
    return this
  }

  /**
   * Add a single-line or multi-line comment
   */
  addComment(text: string, style: "line" | "section" | "block" = "line") {
    if (style === "section") {
      this.lines.push("// " + "=".repeat(76))
      this.lines.push(`// ${text}`)
      this.lines.push("// " + "=".repeat(76))
    } else if (style === "block") {
      this.lines.push("/**")
      this.lines.push(` * ${text}`)
      this.lines.push(" */")
    } else {
      this.lines.push(`// ${text}`)
    }

    this.lines.push("")
    return this
  }

  /**
   * Add a section comment (prominent separator)
   */
  addSectionComment(text: string) {
    return this.addComment(text, "section")
  }

  /**
   * Add JSDoc comment
   */
  public addJSDoc(jsdoc: string) {
    this.lines.push("/**")
    const docLines = jsdoc.split("\n")
    for (const line of docLines) {
      this.lines.push(` * ${line}`.trimEnd())
    }
    this.lines.push(" */")
  }

  /**
   * Add a class declaration
   */
  addClass(config: ClassConfig) {
    if (config.jsdoc) {
      this.addJSDoc(config.jsdoc)
    }

    const exported = config.exported !== false ? "export " : ""
    const extendsClause = config.extends ? ` extends ${config.extends}` : ""
    const implementsClause = config.implements && config.implements.length > 0
      ? ` implements ${config.implements.join(", ")}`
      : ""

    this.lines.push(
      `${exported}class ${config.className}${extendsClause}${implementsClause} {`
    )

    // Add static properties
    if (config.staticProperties && config.staticProperties.length > 0) {
      for (const prop of config.staticProperties) {
        if (prop.jsdoc) {
          this.addJSDoc(prop.jsdoc)
        }
        const readonlyModifier = prop.readonly ? "readonly " : ""
        this.lines.push(
          `  static ${readonlyModifier}${prop.name}: ${prop.type} = ${prop.value};`
        )
        this.lines.push("")
      }
    }

    // Add fields
    if (config.fields && config.fields.length > 0) {
      for (const field of config.fields) {
        if (field.jsdoc) {
          this.addJSDoc(field.jsdoc)
        }
        const visibility = field.visibility || "public"
        const readonlyModifier = field.readonly ? "readonly " : ""
        const optionalModifier = field.optional ? "?" : ""
        this.lines.push(
          `  ${visibility} ${readonlyModifier}${field.name}${optionalModifier}: ${field.type};`
        )
      }
      this.lines.push("")
    }

    // Add static methods
    if (config.staticMethods && config.staticMethods.length > 0) {
      for (const method of config.staticMethods) {
        this.addMethodToClass(method, true)
      }
    }

    // Add methods
    if (config.methods && config.methods.length > 0) {
      for (const method of config.methods) {
        this.addMethodToClass(method, false)
      }
    }

    this.lines.push("}")
    this.lines.push("")

    return this
  }

  /**
   * Add a method to a class
   */
  private addMethodToClass(method: MethodConfig, isStatic: boolean) {
    if (method.jsdoc) {
      this.addJSDoc(method.jsdoc)
    }

    const staticModifier = isStatic ? "static " : ""
    const asyncModifier = method.isAsync ? "async " : ""
    const visibility = method.visibility || "public"
    const visibilityPrefix = visibility === "public" ? "" : `${visibility} `

    const params = method.params
      .map((p) => {
        const optional = p.optional ? "?" : ""
        const defaultVal = p.defaultValue ? ` = ${p.defaultValue}` : ""
        return `${p.name}${optional}: ${p.type}${defaultVal}`
      })
      .join(", ")

    // Don't add explicit return type - let TypeScript infer it (linter requirement)

    this.lines.push(
      `  ${visibilityPrefix}${staticModifier}${asyncModifier}${method.name}(${params}) {`
    )

    // Add method body (preserve indentation)
    const bodyLines = method.body.trim().split("\n")
    for (const line of bodyLines) {
      if (line.trim()) {
        this.lines.push(`    ${line}`)
      } else {
        this.lines.push("")
      }
    }

    this.lines.push("  }")
    this.lines.push("")
  }

  /**
   * Add an interface declaration
   */
  addInterface(config: InterfaceConfig) {
    if (config.jsdoc) {
      this.addJSDoc(config.jsdoc)
    }

    const exported = config.exported !== false ? "export " : ""
    const extendsClause = config.extends && config.extends.length > 0
      ? ` extends ${config.extends.join(", ")}`
      : ""

    this.lines.push(`${exported}interface ${config.name}${extendsClause} {`)

    for (const prop of config.properties) {
      if (prop.jsdoc) {
        this.lines.push("  /**")
        this.lines.push(`   * ${prop.jsdoc}`)
        this.lines.push("   */")
      }
      const readonlyModifier = prop.readonly ? "readonly " : ""
      const optionalModifier = prop.optional ? "?" : ""
      this.lines.push(
        `  ${readonlyModifier}${prop.name}${optionalModifier}: ${prop.type};`
      )
    }

    this.lines.push("}")
    this.lines.push("")

    return this
  }

  /**
   * Add a type alias
   */
  addTypeAlias(config: TypeAliasConfig) {
    if (config.jsdoc) {
      this.addJSDoc(config.jsdoc)
    }

    const exported = config.exported !== false ? "export " : ""
    const typeParams = config.typeParams && config.typeParams.length > 0
      ? `<${config.typeParams.join(", ")}>`
      : ""

    this.lines.push(
      `${exported}type ${config.name}${typeParams} = ${config.type};`
    )
    this.lines.push("")

    return this
  }

  /**
   * Add a function declaration
   */
  addFunction(config: FunctionConfig) {
    if (config.jsdoc) {
      this.addJSDoc(config.jsdoc)
    }

    const exported = config.exported !== false ? "export " : ""
    const asyncModifier = config.isAsync ? "async " : ""
    const typeParams = config.typeParams && config.typeParams.length > 0
      ? `<${config.typeParams.join(", ")}>`
      : ""

    const params = config.params
      .map((p) => {
        const optional = p.optional ? "?" : ""
        const defaultVal = p.defaultValue ? ` = ${p.defaultValue}` : ""
        return `${p.name}${optional}: ${p.type}${defaultVal}`
      })
      .join(", ")

    const returnType = config.returnType ? `: ${config.returnType}` : ""

    this.lines.push(
      `${exported}${asyncModifier}function ${config.name}${typeParams}(${params})${returnType} {`
    )

    // Add function body
    const bodyLines = config.body.trim().split("\n")
    for (const line of bodyLines) {
      if (line.trim()) {
        this.lines.push(`  ${line}`)
      } else {
        this.lines.push("")
      }
    }

    this.lines.push("}")
    this.lines.push("")

    return this
  }

  /**
   * Add a const declaration
   */
  addConst(
    name: string,
    value: string,
    type?: string,
    exported = true,
    jsdoc?: string
  ) {
    if (jsdoc) {
      this.addJSDoc(jsdoc)
    }

    const exportKeyword = exported ? "export " : ""
    const typeAnnotation = type ? `: ${type}` : ""

    this.lines.push(
      `${exportKeyword}const ${name}${typeAnnotation} = ${value};`
    )
    this.lines.push("")

    return this
  }

  /**
   * Add raw TypeScript code
   */
  addRaw(code: string) {
    this.lines.push(code)
    return this
  }

  /**
   * Generate the final TypeScript code
   */
  toString() {
    const importLines: Array<string> = []

    // Generate regular imports (sorted by module name)
    const sortedImports = Array.from(this.imports.entries()).sort((a, b) => a[0].localeCompare(b[0]))
    for (const [from, names] of sortedImports) {
      const sortedNames = Array.from(names).sort()
      importLines.push(`import { ${sortedNames.join(", ")} } from "${from}";`)
    }

    // Generate type-only imports (sorted by module name)
    const sortedTypeImports = Array.from(this.typeImports.entries()).sort(
      (a, b) => a[0].localeCompare(b[0])
    )
    for (const [from, names] of sortedTypeImports) {
      const sortedNames = Array.from(names).sort()
      importLines.push(
        `import type { ${sortedNames.join(", ")} } from "${from}";`
      )
    }

    // Combine imports and content with blank line separator
    if (importLines.length > 0) {
      return [...importLines, "", ...this.lines].join("\n")
    }

    return this.lines.join("\n")
  }

  /**
   * Clear all content and start fresh
   */
  clear() {
    this.lines = []
    this.imports.clear()
    this.typeImports.clear()
    return this
  }
}
