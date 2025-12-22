/**
 * Progress and Spinner Utilities
 *
 * Terminal progress indicators for CLI feedback
 *
 * @module monorepo-library-generator/cli/progress
 */

import { Console, Effect, Ref } from 'effect';

/**
 * Spinner frames for animated progress indicator
 */
const SPINNER_FRAMES: ReadonlyArray<string> = Object.freeze([
  '⠋',
  '⠙',
  '⠹',
  '⠸',
  '⠼',
  '⠴',
  '⠦',
  '⠧',
  '⠇',
  '⠏',
]);

/**
 * ANSI escape codes
 */
const ANSI: Readonly<{
  clearLine: string;
  cursorUp: string;
  cursorToStart: string;
  hideCursor: string;
  showCursor: string;
  cyan: string;
  green: string;
  yellow: string;
  red: string;
  dim: string;
  reset: string;
}> = Object.freeze({
  clearLine: '\x1b[2K',
  cursorUp: '\x1b[1A',
  cursorToStart: '\x1b[0G',
  hideCursor: '\x1b[?25l',
  showCursor: '\x1b[?25h',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  dim: '\x1b[2m',
  reset: '\x1b[0m',
});

/**
 * Verbosity level for output
 */
export type Verbosity = 'quiet' | 'normal' | 'verbose';

/**
 * Progress context for tracking generation
 */
export interface ProgressContext {
  readonly verbosity: Verbosity;
  readonly startTime: number;
  readonly filesCreated: number;
}

/**
 * Create a progress context
 */
export function createProgressContext(verbosity: Verbosity) {
  return {
    verbosity,
    startTime: Date.now(),
    filesCreated: 0,
  };
}

/**
 * Format path for display with colors
 */
export function formatPathDisplay(absolutePath: string, relativePath: string) {
  return [
    `${ANSI.cyan}📂${ANSI.reset} Generating to: ${absolutePath}`,
    `${ANSI.dim}📍 Relative: ${relativePath}/${ANSI.reset}`,
  ].join('\n');
}

/**
 * Simple spinner that shows message with animated indicator
 */
export function spinner(message: string) {
  return Effect.gen(function* () {
    const frameRef = yield* Ref.make(0);

    // Start spinner
    yield* Effect.sync(() => {
      process.stdout.write(ANSI.hideCursor);
    });

    const interval = yield* Effect.acquireRelease(
      Effect.sync(() => {
        return setInterval(() => {
          Ref.update(frameRef, (n) => (n + 1) % SPINNER_FRAMES.length).pipe(
            Effect.flatMap(() => Ref.get(frameRef)),
            Effect.flatMap((frame) =>
              Effect.sync(() => {
                process.stdout.write(
                  `${ANSI.clearLine}${ANSI.cursorToStart}${ANSI.cyan}${SPINNER_FRAMES[frame]}${ANSI.reset} ${message}`,
                );
              }),
            ),
            Effect.runSync,
          );
        }, 80);
      }),
      (interval) =>
        Effect.sync(() => {
          clearInterval(interval);
          process.stdout.write(`${ANSI.clearLine}${ANSI.cursorToStart}${ANSI.showCursor}`);
        }),
    );

    return interval;
  });
}

/**
 * Show progress indicator and run effect
 */
export function withProgress<A, E, R>(
  message: string,
  effect: Effect.Effect<A, E, R>,
  verbosity: Verbosity = 'normal',
) {
  if (verbosity === 'quiet') {
    return effect;
  }

  return Effect.gen(function* () {
    if (verbosity === 'verbose') {
      yield* Console.log(`${ANSI.dim}${message}...${ANSI.reset}`);
      return yield* effect;
    }

    // Normal mode - show spinner
    const startTime = Date.now();

    yield* Effect.sync(() => {
      process.stdout.write(ANSI.hideCursor);
    });

    const result = yield* Effect.onExit(effect, () =>
      Effect.sync(() => {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        process.stdout.write(`${ANSI.clearLine}${ANSI.cursorToStart}${ANSI.showCursor}`);
        console.log(
          `${ANSI.green}✨${ANSI.reset} ${message} ${ANSI.dim}(${elapsed}s)${ANSI.reset}`,
        );
      }),
    );

    return result;
  });
}

/**
 * Log file creation (for verbose mode)
 */
export function logFileCreation(filePath: string, verbosity: Verbosity) {
  if (verbosity !== 'verbose') {
    return Effect.void;
  }

  return Console.log(`  ${ANSI.dim}Creating${ANSI.reset} ${filePath}...`);
}

/**
 * Show success message
 */
export function showSuccess(
  libraryName: string,
  fileCount: number,
  elapsedMs: number,
  verbosity: Verbosity,
) {
  const elapsed = (elapsedMs / 1000).toFixed(1);

  if (verbosity === 'quiet') {
    return Console.log(`${ANSI.green}✓${ANSI.reset} ${libraryName}`);
  }

  return Console.log(
    [
      '',
      `${ANSI.green}✨${ANSI.reset} Created ${fileCount} files in ${elapsed}s`,
      `${ANSI.green}✅${ANSI.reset} Successfully generated library: ${ANSI.cyan}${libraryName}${ANSI.reset}`,
    ].join('\n'),
  );
}

/**
 * Show error message
 */
export function showError(message: string, verbosity: Verbosity) {
  if (verbosity === 'quiet') {
    return Console.error(`${ANSI.red}✗${ANSI.reset} Error`);
  }

  return Console.error(`${ANSI.red}✗ Error:${ANSI.reset} ${message}`);
}

/**
 * Show generation start message
 */
export function showGenerationStart(
  libraryType: string,
  libraryName: string,
  absolutePath: string,
  relativePath: string,
  verbosity: Verbosity,
) {
  if (verbosity === 'quiet') {
    return Effect.void;
  }

  return Console.log(
    [
      formatPathDisplay(absolutePath, relativePath),
      '',
      `${ANSI.cyan}⠋${ANSI.reset} Creating ${libraryType} library: ${libraryName}...`,
    ].join('\n'),
  );
}
