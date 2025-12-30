import { cli, command } from 'cleye';
import type { CliOptions, BenchmarkConfig } from './core/types';
import { parseDuration } from './utils/time';
import { parseAuth } from './core/auth';

const name = 'burl';
const version = '0.1.0';

export function parseArgs(args: string[]): CliOptions {
  const argv = cli({
    name,
    version,
    parameters: ['<url>'],
    flags: {
      method: {
        type: String,
        alias: 'm',
        default: 'GET',
        description: 'HTTP method',
      },
      header: {
        type: [String],
        alias: 'H',
        default: [],
        description: 'Custom header (can be used multiple times)',
      },
      body: {
        type: String,
        alias: 'b',
        description: 'Request body',
      },
      bodyFile: {
        type: String,
        alias: 'B',
        description: 'Request body from file',
      },
      contentType: {
        type: String,
        alias: 'T',
        description: 'Content-Type header',
      },
      connections: {
        type: Number,
        alias: 'c',
        default: 10,
        description: 'Number of concurrent connections',
      },
      duration: {
        type: String,
        alias: 'd',
        default: '10s',
        description: 'Test duration (e.g., 10s, 1m)',
      },
      requests: {
        type: Number,
        alias: 'n',
        description: 'Total number of requests',
      },
      qps: {
        type: Number,
        alias: 'q',
        description: 'Rate limit in queries per second',
      },
      timeout: {
        type: String,
        alias: 't',
        default: '30s',
        description: 'Request timeout',
      },
      warmup: {
        type: Number,
        alias: 'w',
        default: 0,
        description: 'Number of warmup requests',
      },
      http1: {
        type: Boolean,
        default: false,
        description: 'Force HTTP/1.1',
      },
      http2: {
        type: Boolean,
        default: false,
        description: 'Force HTTP/2',
      },
      http3: {
        type: Boolean,
        default: false,
        description: 'Force HTTP/3 (experimental)',
      },
      auth: {
        type: String,
        alias: 'a',
        description: 'Auth: basic:user:pass or bearer:token',
      },
      llm: {
        type: String,
        description: 'LLM-optimized output: json or markdown',
      },
      output: {
        type: String,
        alias: 'o',
        description: 'Output file',
      },
      format: {
        type: String,
        alias: 'f',
        default: 'text',
        description: 'Output format: text, json, csv, markdown',
      },
      noTui: {
        type: Boolean,
        default: false,
        description: 'Disable rich TUI',
      },
      noColor: {
        type: Boolean,
        default: false,
        description: 'Disable colored output',
      },
      verbose: {
        type: Boolean,
        alias: 'v',
        default: false,
        description: 'Verbose output',
      },
      quiet: {
        type: Boolean,
        default: false,
        description: 'Minimal output',
      },
      insecure: {
        type: Boolean,
        alias: 'k',
        default: false,
        description: 'Skip TLS verification',
      },
      latencyCorrection: {
        type: Boolean,
        default: false,
        description: 'Enable latency correction',
      },
    },
  }, undefined, args);

  return {
    url: argv._.url,
    method: argv.flags.method.toUpperCase(),
    headers: argv.flags.header,
    body: argv.flags.body,
    bodyFile: argv.flags.bodyFile,
    contentType: argv.flags.contentType,
    connections: argv.flags.connections,
    duration: argv.flags.duration,
    requests: argv.flags.requests,
    qps: argv.flags.qps,
    timeout: argv.flags.timeout,
    warmup: argv.flags.warmup,
    http1: argv.flags.http1,
    http2: argv.flags.http2,
    http3: argv.flags.http3,
    auth: argv.flags.auth,
    llm: argv.flags.llm as 'json' | 'markdown' | undefined,
    output: argv.flags.output,
    format: argv.flags.format as 'text' | 'json' | 'csv' | 'markdown',
    noTui: argv.flags.noTui,
    noColor: argv.flags.noColor,
    verbose: argv.flags.verbose,
    quiet: argv.flags.quiet,
    insecure: argv.flags.insecure,
    latencyCorrection: argv.flags.latencyCorrection,
  };
}

export function buildConfig(options: CliOptions): BenchmarkConfig {
  const headers: Record<string, string> = {};

  for (const h of options.headers) {
    const colonIndex = h.indexOf(':');
    if (colonIndex !== -1) {
      const key = h.slice(0, colonIndex).trim();
      const value = h.slice(colonIndex + 1).trim();
      headers[key] = value;
    }
  }

  if (options.contentType) {
    headers['Content-Type'] = options.contentType;
  }

  let body: string | ArrayBuffer | undefined;
  if (options.body) {
    body = options.body;
  } else if (options.bodyFile) {
    const file = Bun.file(options.bodyFile);
    body = file.text() as unknown as string;
  }

  let httpVersion: '1.1' | '2' | '3' | 'auto' = 'auto';
  if (options.http1) httpVersion = '1.1';
  if (options.http2) httpVersion = '2';
  if (options.http3) httpVersion = '3';

  const config: BenchmarkConfig = {
    url: options.url,
    method: options.method,
    headers,
    body,
    connections: options.connections,
    timeoutMs: parseDuration(options.timeout),
    warmupRequests: options.warmup,
    httpVersion,
    insecure: options.insecure,
    latencyCorrection: options.latencyCorrection,
  };

  if (options.requests) {
    config.totalRequests = options.requests;
  } else if (options.duration) {
    config.durationMs = parseDuration(options.duration);
  }

  if (options.qps) {
    config.qps = options.qps;
  }

  if (options.auth) {
    config.auth = parseAuth(options.auth);
  }

  return config;
}
