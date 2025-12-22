export interface ContractGeneratorSchema {
  name: string;
  directory?: string;
  description?: string;
  dependencies?: Array<string>;
  entities?: Array<string> | string; // Can be array or JSON string from CLI
  includeCQRS?: boolean;
  includeRPC?: boolean;
  tags?: string;

  // Dotfile generation options (Effect.ts code quality enforcement)
  // Only library-specific dotfiles (eslint.config.mjs, tsconfig.json) are added
  addDotfiles?: boolean; // Default: true
  overwriteDotfiles?: boolean; // Default: false
}
