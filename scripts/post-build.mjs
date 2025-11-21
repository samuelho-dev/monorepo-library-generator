#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync, chmodSync, cpSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const distDir = join(process.cwd(), 'dist');

// 1. Fix dist/package.json to include "type": "module" and "generators"
const distPackageJsonPath = join(distDir, 'package.json');
const packageJson = JSON.parse(readFileSync(distPackageJsonPath, 'utf-8'));

// Add type: module and generators field after version
const { name, version, ...rest } = packageJson;
const updatedPackageJson = {
  name,
  version,
  type: 'module',
  generators: './src/generators.json',
  ...rest
};

writeFileSync(distPackageJsonPath, JSON.stringify(updatedPackageJson, null, 2) + '\n');
console.log('✓ Added "type": "module" and "generators" field to dist/package.json');

// 2. Copy compiled generators from dist/dist/esm/generators/ to dist/src/generators/
// This makes Nx generator paths work correctly (they expect dist/src/generators/*.js)
const sourceGeneratorsDir = join(distDir, 'dist', 'esm', 'generators');
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
console.log('✓ Copied compiled generators from dist/dist/esm/generators/ to dist/src/generators/');

// 3. Create dist/bin/cli.js
const binDir = join(distDir, 'bin');
mkdirSync(binDir, { recursive: true });

const cliContent = `#!/usr/bin/env node

import { main } from '../dist/esm/cli/index.js';
import { NodeRuntime } from '@effect/platform-node';

NodeRuntime.runMain(main(process.argv));
`;

const cliPath = join(binDir, 'cli.js');
writeFileSync(cliPath, cliContent);
chmodSync(cliPath, 0o755);

console.log('✓ Created dist/bin/cli.js');
