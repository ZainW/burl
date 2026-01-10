import { existsSync } from "node:fs";
import { join } from "node:path";
import type { CliOptions } from "./types";

export interface ConfigFile {
  // Connection options
  connections?: number;
  duration?: string;
  requests?: number;
  qps?: number;
  timeout?: string;
  warmup?: number;

  // Request options
  method?: string;
  headers?: string[] | Record<string, string>;
  body?: string;
  bodyFile?: string;
  contentType?: string;

  // HTTP version
  http1?: boolean;
  http2?: boolean;
  http3?: boolean;

  // Auth
  auth?: string;

  // Output options
  llm?: "json" | "markdown";
  output?: string;
  format?: "text" | "json" | "csv" | "markdown";
  noTui?: boolean;
  noColor?: boolean;
  verbose?: boolean;
  quiet?: boolean;

  // Other
  insecure?: boolean;
  latencyCorrection?: boolean;

  // Profiles
  profiles?: Record<string, ConfigFile>;
}

/**
 * Find and load config file from:
 * 1. ./.burlrc (current directory)
 * 2. ~/.burlrc (home directory)
 */
export function loadConfigFile(): ConfigFile | null {
  const configPaths = [
    "./.burlrc",
    join(process.env.HOME || process.env.USERPROFILE || "", ".burlrc"),
  ];

  for (const path of configPaths) {
    if (existsSync(path)) {
      try {
        const file = Bun.file(path);
        const content = file.text();
        const config = JSON.parse(content as unknown as string) as ConfigFile;
        return config;
      } catch (error) {
        console.error(`Failed to parse config file ${path}:`, error);
        return null;
      }
    }
  }

  return null;
}

/**
 * Normalize config headers to array format
 */
function normalizeHeaders(
  headers?: string[] | Record<string, string>,
): string[] {
  if (!headers) return [];
  if (Array.isArray(headers)) return headers;

  // Convert object to array of "key: value" strings
  return Object.entries(headers).map(([key, value]) => `${key}: ${value}`);
}

/**
 * Check if a CLI argument was explicitly provided (not just using default)
 */
function wasProvided(value: any, defaultValue: any): boolean {
  return value !== undefined && value !== defaultValue;
}

/**
 * Merge config file with CLI options.
 * CLI options take precedence over config file.
 */
export function mergeConfig(
  cliOptions: Partial<CliOptions>,
  configFile: ConfigFile | null,
  profile?: string,
): Partial<CliOptions> {
  if (!configFile) return cliOptions;

  // If profile is specified, use that profile's config
  let config = configFile;
  if (profile && configFile.profiles?.[profile]) {
    config = { ...configFile, ...configFile.profiles[profile] };
  }

  // Merge, with CLI options taking precedence
  const merged: Partial<CliOptions> = {
    // URL is always from CLI
    url: cliOptions.url,

    // Connection options
    connections: wasProvided(cliOptions.connections, 10)
      ? cliOptions.connections
      : config.connections ?? cliOptions.connections,
    duration: wasProvided(cliOptions.duration, "10s")
      ? cliOptions.duration
      : config.duration ?? cliOptions.duration,
    requests: cliOptions.requests ?? config.requests,
    qps: cliOptions.qps ?? config.qps,
    timeout: wasProvided(cliOptions.timeout, "30s")
      ? cliOptions.timeout
      : config.timeout ?? cliOptions.timeout,
    warmup: wasProvided(cliOptions.warmup, 0)
      ? cliOptions.warmup
      : config.warmup ?? cliOptions.warmup,

    // Request options
    method: wasProvided(cliOptions.method, "GET")
      ? cliOptions.method
      : config.method ?? cliOptions.method,
    headers:
      cliOptions.headers && cliOptions.headers.length > 0
        ? cliOptions.headers
        : normalizeHeaders(config.headers),
    body: cliOptions.body ?? config.body,
    bodyFile: cliOptions.bodyFile ?? config.bodyFile,
    contentType: cliOptions.contentType ?? config.contentType,

    // HTTP version
    http1: cliOptions.http1 ?? config.http1 ?? false,
    http2: cliOptions.http2 ?? config.http2 ?? false,
    http3: cliOptions.http3 ?? config.http3 ?? false,

    // Auth
    auth: cliOptions.auth ?? config.auth,

    // Output options
    llm: cliOptions.llm ?? config.llm,
    output: cliOptions.output ?? config.output,
    format: wasProvided(cliOptions.format, "text")
      ? cliOptions.format
      : config.format ?? cliOptions.format,
    noTui: cliOptions.noTui ?? config.noTui ?? false,
    noColor: cliOptions.noColor ?? config.noColor ?? false,
    verbose: cliOptions.verbose ?? config.verbose ?? false,
    quiet: cliOptions.quiet ?? config.quiet ?? false,

    // Other
    insecure: cliOptions.insecure ?? config.insecure ?? false,
    latencyCorrection:
      cliOptions.latencyCorrection ?? config.latencyCorrection ?? false,
    diagnose: cliOptions.diagnose ?? false,
  };

  return merged;
}
