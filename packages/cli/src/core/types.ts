export interface BenchmarkConfig {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string | ArrayBuffer;

  connections: number;
  durationMs?: number;
  totalRequests?: number;
  qps?: number;
  timeoutMs: number;
  warmupRequests: number;

  httpVersion: "1.1" | "2" | "3" | "auto";
  auth?: AuthConfig;

  insecure: boolean;
  latencyCorrection: boolean;
}

export type AuthConfig =
  | { type: "basic"; username: string; password: string }
  | { type: "bearer"; token: string };

export interface CliOptions {
  url: string;
  method: string;
  headers: string[];
  body?: string;
  bodyFile?: string;
  contentType?: string;

  connections: number;
  duration?: string;
  requests?: number;
  qps?: number;
  timeout: string;
  warmup: number;

  http1: boolean;
  http2: boolean;
  http3: boolean;

  auth?: string;

  llm?: "json" | "markdown";
  output?: string;
  format: "text" | "json" | "csv" | "markdown";
  noTui: boolean;
  noColor: boolean;
  verbose: boolean;
  quiet: boolean;

  insecure: boolean;
  latencyCorrection: boolean;
}
