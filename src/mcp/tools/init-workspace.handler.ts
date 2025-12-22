/**
 * MCP Tool: Initialize Workspace
 *
 * MCP handler for initializing workspace-level dotfiles.
 *
 * @module mcp/tools/init-workspace
 */

import { NodeFileSystem, NodePath } from '@effect/platform-node';
import { Effect, Schema } from 'effect';
import { initWorkspace } from '../../cli/commands/init-workspace';
import { createWorkspaceContext } from '../../infrastructure/workspace/context';
import { InitWorkspaceArgs } from '../schemas/init-workspace.schema';

/**
 * Initialize workspace-level dotfiles via MCP
 *
 * Validates args with Effect Schema and initializes workspace dotfiles.
 */
export const handleInitWorkspace = (args: unknown) =>
  Effect.gen(function* () {
    const validatedArgs = yield* Schema.decodeUnknown(InitWorkspaceArgs)(args);
    const workspace = yield* createWorkspaceContext(process.cwd(), 'mcp');

    if (validatedArgs.dryRun) {
      return {
        dryRun: true,
        message: [
          '🔍 Workspace Initialization (Dry Run)',
          '',
          `Target Directory: ${workspace.root}`,
          `Workspace Type: ${workspace.type}`,
          `Merge: ${validatedArgs.merge}`,
          `Overwrite: ${validatedArgs.overwrite}`,
          '',
          'Files to be created:',
          '  - .editorconfig - Editor formatting rules',
          '  - .vscode/settings.json - VSCode workspace settings',
          '  - .vscode/extensions.json - Recommended VSCode extensions',
          '',
          'Note: These files are workspace-level and shared by all libraries.',
          '      Individual libraries will have their own eslint.config.mjs and tsconfig.json',
          '',
          'Run without --dryRun to create these files.',
        ].join('\n'),
      };
    }

    // Execute workspace initialization
    const result = yield* initWorkspace({
      targetDir: workspace.root,
      overwrite: validatedArgs.overwrite,
      merge: validatedArgs.merge,
    });

    return {
      success: true,
      message: [
        '✨ Workspace dotfiles initialized successfully!',
        '',
        `📁 Location: ${workspace.root}`,
        `📊 Files created: ${result.copied}`,
        `🔀 Files merged: ${result.merged}`,
        `⏭️  Files skipped: ${result.skipped}`,
        '',
        'Created workspace-level dotfiles:',
        '  - .editorconfig - Editor formatting rules',
        '  - .vscode/settings.json - VSCode workspace settings',
        '  - .vscode/extensions.json - Recommended VSCode extensions',
      ].join('\n'),
    };
  }).pipe(
    Effect.provide(NodeFileSystem.layer),
    Effect.provide(NodePath.layer),
    Effect.catchAll((error) =>
      Effect.succeed({
        success: false,
        message: `❌ Error initializing workspace: ${error}`,
      }),
    ),
  );
