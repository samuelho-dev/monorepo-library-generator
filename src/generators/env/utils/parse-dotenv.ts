/**
 * .env File Parser
 *
 * Parses existing .env files and extracts environment variable definitions.
 * Infers types from values and identifies public vs server-only variables.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

export interface ParsedEnvVar {
  name: string;
  type: 'string' | 'number' | 'boolean';
  isPublic: boolean;
  isSecret: boolean; // *_SECRET, *_KEY, DATABASE_URL, REDIS_URL
  context: 'client' | 'server' | 'shared';
  hasDefault?: string | undefined; // For Config.withDefault()
}

/**
 * Parse .env file and extract variable definitions
 *
 * @param filePath - Absolute path to .env file
 * @returns Array of parsed environment variables
 */
export function parseDotEnvFile(filePath: string): Array<ParsedEnvVar> {
  // Check if .env file exists
  if (!fs.existsSync(filePath)) {
    console.log(`No .env file found at ${filePath}, using defaults`);
    return getDefaultEnvVars();
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const vars: Array<ParsedEnvVar> = [];

    for (const line of content.split('\n')) {
      const trimmed = line.trim();

      // Skip comments and empty lines
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }

      // Parse KEY=value format
      const match = trimmed.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (!(match && match[1]) || match[2] === undefined) {
        continue;
      }

      const name = match[1];
      const value = match[2];

      // Remove quotes if present
      const cleanValue = value.replace(/^["']|["']$/g, '');

      const isPublic =
        name.startsWith('PUBLIC_') ||
        name.startsWith('NEXT_PUBLIC_') ||
        name.startsWith('VITE_') ||
        name === 'NODE_ENV';
      const isSecret =
        name.endsWith('_SECRET') ||
        name.endsWith('_KEY') ||
        name === 'DATABASE_URL' ||
        name === 'REDIS_URL';

      vars.push({
        name,
        type: inferType(cleanValue),
        isPublic,
        isSecret,
        // NODE_ENV is always shared (regardless of isPublic), others follow normal rules
        context: name === 'NODE_ENV' ? 'shared' : isPublic ? 'client' : 'server',
        hasDefault: name === 'NODE_ENV' ? 'development' : name === 'PORT' ? '3000' : undefined,
      });
    }

    if (vars.length === 0) {
      console.log(`.env file is empty, using defaults`);
      return getDefaultEnvVars();
    }

    console.log(`Parsed ${vars.length} environment variables from .env`);
    return vars;
  } catch (error) {
    console.error(`Error parsing .env file: ${error}`);
    return getDefaultEnvVars();
  }
}

/**
 * Infer variable type from string value
 *
 * @param value - String value from .env file
 * @returns Inferred type
 */
function inferType(value: string) {
  // Boolean values
  if (value === 'true' || value === 'false') {
    return 'boolean';
  }

  // Numeric values
  if (value !== '' && !isNaN(Number(value))) {
    return 'number';
  }

  // Default to string
  return 'string';
}

/**
 * Default environment variables when no .env file exists
 *
 * @returns Array of default environment variables
 */
export function getDefaultEnvVars(): Array<ParsedEnvVar> {
  return [
    // Node environment (shared)
    {
      name: 'NODE_ENV',
      type: 'string',
      isPublic: true,
      isSecret: false,
      context: 'shared',
      hasDefault: 'development',
    },

    // Server-only variables
    { name: 'DATABASE_URL', type: 'string', isPublic: false, isSecret: true, context: 'server' },
    { name: 'API_SECRET', type: 'string', isPublic: false, isSecret: true, context: 'server' },
    { name: 'REDIS_URL', type: 'string', isPublic: false, isSecret: true, context: 'server' },
    {
      name: 'PORT',
      type: 'number',
      isPublic: false,
      isSecret: false,
      context: 'server',
      hasDefault: '3000',
    },

    // Provider-specific variables (built-in providers)
    { name: 'KYSELY_API_KEY', type: 'string', isPublic: false, isSecret: true, context: 'server' },
    { name: 'KYSELY_TIMEOUT', type: 'number', isPublic: false, isSecret: false, context: 'server' },
    {
      name: 'EFFECT_CACHE_API_KEY',
      type: 'string',
      isPublic: false,
      isSecret: true,
      context: 'server',
    },
    {
      name: 'EFFECT_CACHE_TIMEOUT',
      type: 'number',
      isPublic: false,
      isSecret: false,
      context: 'server',
    },
    {
      name: 'EFFECT_LOGGER_API_KEY',
      type: 'string',
      isPublic: false,
      isSecret: true,
      context: 'server',
    },
    {
      name: 'EFFECT_LOGGER_TIMEOUT',
      type: 'number',
      isPublic: false,
      isSecret: false,
      context: 'server',
    },
    {
      name: 'EFFECT_METRICS_API_KEY',
      type: 'string',
      isPublic: false,
      isSecret: true,
      context: 'server',
    },
    {
      name: 'EFFECT_METRICS_TIMEOUT',
      type: 'number',
      isPublic: false,
      isSecret: false,
      context: 'server',
    },
    {
      name: 'EFFECT_QUEUE_API_KEY',
      type: 'string',
      isPublic: false,
      isSecret: true,
      context: 'server',
    },
    {
      name: 'EFFECT_QUEUE_TIMEOUT',
      type: 'number',
      isPublic: false,
      isSecret: false,
      context: 'server',
    },
    {
      name: 'EFFECT_PUBSUB_API_KEY',
      type: 'string',
      isPublic: false,
      isSecret: true,
      context: 'server',
    },
    {
      name: 'EFFECT_PUBSUB_TIMEOUT',
      type: 'number',
      isPublic: false,
      isSecret: false,
      context: 'server',
    },

    // Client-safe variables (PUBLIC_ prefix)
    { name: 'PUBLIC_API_URL', type: 'string', isPublic: true, isSecret: false, context: 'client' },
    {
      name: 'PUBLIC_FEATURE_FLAG',
      type: 'boolean',
      isPublic: true,
      isSecret: false,
      context: 'client',
    },
  ];
}

/**
 * Find .env file in workspace
 *
 * Searches for .env file starting from workspace root
 *
 * @param workspaceRoot - Absolute path to workspace root
 * @returns Absolute path to .env file, or null if not found
 */
export function findDotEnvFile(workspaceRoot: string) {
  const possiblePaths = [
    path.join(workspaceRoot, '.env'),
    path.join(workspaceRoot, '.env.local'),
    path.join(workspaceRoot, '.env.development'),
  ];

  for (const envPath of possiblePaths) {
    if (fs.existsSync(envPath)) {
      console.log(`Found .env file at: ${envPath}`);
      return envPath;
    }
  }

  return null;
}
