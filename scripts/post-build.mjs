#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync, chmodSync, cpSync, readdirSync, renameSync, rmSync, statSync } from 'fs';
import { join } from 'path';

const distDir = join(process.cwd(), 'dist');

console.log('📦 Post-build: Preparing Nx generator structure...\n');

// 1. Flatten the nested dist/dist/ structure created by pack-v3
// NOTE: pack-v3 still creates this nested structure, same as pack-v2
const nestedDistDir = join(distDir, 'dist');
if (statSync(nestedDistDir, { throwIfNoEntry: false })?.isDirectory()) {
  renameSync(join(nestedDistDir, 'esm'), join(distDir, 'esm'));
  renameSync(join(nestedDistDir, 'cjs'), join(distDir, 'cjs'));
  renameSync(join(nestedDistDir, 'dts'), join(distDir, 'dts'));
  rmSync(nestedDistDir, { recursive: true, force: true });
  console.log('✓ Flattened nested dist/dist/ structure');
}

// 2. Add package.json to cjs directory to explicitly mark it as CommonJS
// This prevents any CommonJS/ESM module resolution ambiguity
const cjsPackageJsonPath = join(distDir, 'cjs', 'package.json');
writeFileSync(cjsPackageJsonPath, JSON.stringify({ type: 'commonjs' }, null, 2) + '\n');
console.log('✓ Created dist/cjs/package.json with "type": "commonjs"');

// 2. Update dist/package.json to include "generators" field and update bin
const distPackageJsonPath = join(distDir, 'package.json');
const packageJson = JSON.parse(readFileSync(distPackageJsonPath, 'utf-8'));

// Add generators field and update bin to use .mjs extension
// pack-v3 already handles exports correctly, we just need to add Nx-specific fields
const { name, version, bin, ...rest } = packageJson;
const updatedPackageJson = {
  name,
  version,
  generators: './src/generators.json',
  bin: {
    mlg: './bin/cli.mjs'  // ESM CLI entry point
  },
  ...rest
};

writeFileSync(distPackageJsonPath, JSON.stringify(updatedPackageJson, null, 2) + '\n');
console.log('✓ Added "generators" field and updated bin to dist/package.json');

// 3. Copy compiled CJS generators to dist/src/generators/ for Nx
// Nx generators REQUIRE CommonJS (they use require(), not import)
// This is an Nx requirement, not a workaround
const sourceGeneratorsDir = join(distDir, 'cjs', 'generators');
const targetGeneratorsDir = join(distDir, 'src', 'generators');

// Helper function to recursively copy only .js files
function copyJsFiles(src, dest) {
  mkdirSync(dest, { recursive: true });

  const entries = readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);

    if (entry.isDirectory()) {
      copyJsFiles(srcPath, destPath);
    } else if (entry.name.endsWith('.js')) {
      cpSync(srcPath, destPath);
    }
  }
}

copyJsFiles(sourceGeneratorsDir, targetGeneratorsDir);
console.log('✓ Copied CJS generators from dist/cjs/generators/ to dist/src/generators/');

// 4. Copy compiled CJS utils to dist/src/utils/ for Nx
// Generators import from these utils at runtime
const sourceUtilsDir = join(distDir, 'cjs', 'utils');
const targetUtilsDir = join(distDir, 'src', 'utils');

copyJsFiles(sourceUtilsDir, targetUtilsDir);
console.log('✓ Copied CJS utils from dist/cjs/utils/ to dist/src/utils/');

// 5. Copy generators.json to dist/src/
const generatorsJsonSource = join(process.cwd(), 'src', 'generators.json');
const generatorsJsonDest = join(distDir, 'src', 'generators.json');
cpSync(generatorsJsonSource, generatorsJsonDest);
console.log('✓ Copied generators.json to dist/src/');

// 6. Create dist/bin/cli.mjs (ESM module)
// The CLI uses ESM and imports from dist/esm/
const binDir = join(distDir, 'bin');
mkdirSync(binDir, { recursive: true });

const cliContent = `#!/usr/bin/env node

import { main } from '../esm/cli/index.js';
import { NodeRuntime } from '@effect/platform-node';

NodeRuntime.runMain(main(process.argv));
`;

const cliPath = join(binDir, 'cli.mjs');
writeFileSync(cliPath, cliContent);
chmodSync(cliPath, 0o755);

console.log('✓ Created dist/bin/cli.mjs');
console.log('\n✅ Post-build complete!');
