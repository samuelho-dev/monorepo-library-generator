#!/usr/bin/env tsx
import { FsTree } from 'nx/src/generators/tree';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import contractGenerator from './src/generators/contract/contract';
import providerGenerator from './src/generators/provider/provider';
import infraGenerator from './src/generators/infra/infra';

const WORKSPACE = 'generated-libs';

async function generateInfrastructure() {
  console.log('🏗️  GENERATING INFRASTRUCTURE PACKAGES\n');

  const tree = new FsTree(WORKSPACE, false);

  // Generate contract/database for type definitions
  console.log('📦 Generating contract/database (types-database)...');
  await contractGenerator(tree, { name: 'database', includeCQRS: false });

  // Generate provider/kysely for database service
  console.log('📦 Generating provider/kysely...');
  await providerGenerator(tree, { name: 'kysely', externalService: 'Kysely' });

  // Generate infra/env for environment configuration
  console.log('📦 Generating infra/env...');
  await infraGenerator(tree, { name: 'env' });

  // Write all changes to disk
  console.log('\n💾 Writing files to disk...');
  let fileCount = 0;

  for (const change of tree.listChanges()) {
    const fullPath = `${WORKSPACE}/${change.path}`;
    mkdirSync(dirname(fullPath), { recursive: true });

    if (change.type === 'CREATE' || change.type === 'UPDATE') {
      writeFileSync(fullPath, change.content);
      fileCount++;
    }
  }

  console.log(`✅ ${fileCount} files written!\n`);
  console.log('Generated infrastructure packages:');
  console.log('  • libs/contract/database/');
  console.log('  • libs/provider/kysely/');
  console.log('  • libs/infra/env/');
}

generateInfrastructure().catch(console.error);
