export interface RequestResult {
  success: boolean;
  statusCode?: number;
  latencyMs: number;
  bytes: number;
  error?: string;
  timestamp: number;
}

export interface LatencyStats {
  min: number;
  max: number;
  mean: number;
  median: number;
  stddev: number;
  p50: number;
  p75: number;
  p90: number;
  p95: number;
  p99: number;
  p999: number;
}

export interface BenchmarkResult {
  url: string;
  method: string;
  connections: number;
  durationMs: number;
  
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  
  requestsPerSecond: number;
  bytesPerSecond: number;
  totalBytes: number;
  
  latency: LatencyStats;
  statusCodes: Record<number, number>;
  errors: Record<string, number>;
  
  timeSeries: TimeSeriesPoint[];
}

export interface TimeSeriesPoint {
  timestamp: number;
  rps: number;
  latencyP50: number;
  latencyP99: number;
  errorCount: number;
}

export interface StatsSnapshot {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  currentRps: number;
  latencyP50: number;
  latencyP99: number;
  elapsedMs: number;
}
