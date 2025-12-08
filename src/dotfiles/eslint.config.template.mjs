// @ts-check
import * as effectEslint from "@effect/eslint-plugin"

export default [
  ...effectEslint.configs.recommended,
  ...effectEslint.configs.dprint
]
