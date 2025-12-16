// @ts-check
import * as effectEslint from "@effect/eslint-plugin"

export default [
  ...effectEslint.configs.dprint,
  {
    name: "effect-ts-strict",
    rules: {
      // Effect.ts Best Practices
      "@effect/dprint": "error",

      // Disallow Effect.Do (deprecated in Effect 3.0+)
      "@effect/no-effect-do": "error",

      // TypeScript Best Practices for Effect.ts
      "@typescript-eslint/explicit-function-return-type": "off", // Infer from Effect types
      "@typescript-eslint/explicit-module-boundary-types": "off", // Infer from Effect types

      // Disallow type assertions except 'as const'
      "@typescript-eslint/consistent-type-assertions": [
        "error",
        {
          assertionStyle: "as",
          objectLiteralTypeAssertions: "allow-as-const"
        }
      ],

      // Import/Export Best Practices
      "@typescript-eslint/consistent-type-imports": [
        "error",
        {
          prefer: "type-imports",
          disallowTypeAnnotations: false,
          fixStyle: "separate-type-imports"
        }
      ],

      // Effect.ts prefers functional patterns
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_"
        }
      ]
    }
  }
]
