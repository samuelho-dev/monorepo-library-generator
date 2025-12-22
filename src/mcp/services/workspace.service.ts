/**
 * WorkspaceService - Workspace detection as Effect Service
 *
 * Wraps workspace-detector utility as a Context.Tag service
 * with Live and Test layer implementations for DI.
 */

import { Context, Effect, Layer } from 'effect';
import { createWorkspaceContext } from '../../infrastructure/workspace/context';
import type {
  WorkspaceContext,
  WorkspaceDetectionError,
} from '../../infrastructure/workspace/types';

export interface WorkspaceServiceImpl {
  readonly detect: (root: string) => Effect.Effect<WorkspaceContext, WorkspaceDetectionError>;
}

export class WorkspaceService extends Context.Tag('WorkspaceService')<
  WorkspaceService,
  WorkspaceServiceImpl
>() {
  static readonly Live = Layer.succeed(this, {
    detect: (root: string) => createWorkspaceContext(root, 'mcp'),
  });

  static readonly Test = Layer.succeed(this, {
    detect: (root: string) =>
      Effect.succeed({
        root,
        scope: '@test',
        type: 'nx' as const,
        packageManager: 'pnpm' as const,
        interfaceType: 'mcp' as const,
        librariesRoot: 'libs',
      }),
  });

  static readonly Mock = (mockContext: Partial<WorkspaceContext>) =>
    Layer.succeed(this, {
      detect: (root: string) =>
        Effect.succeed({
          root,
          scope: mockContext.scope ?? '@mock',
          type: mockContext.type ?? 'nx',
          packageManager: mockContext.packageManager ?? 'pnpm',
          interfaceType: mockContext.interfaceType ?? 'mcp',
          librariesRoot: mockContext.librariesRoot ?? 'libs',
        }),
    });
}
