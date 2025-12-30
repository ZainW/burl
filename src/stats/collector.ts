import type {
  RequestResult,
  LatencyStats,
  StatsSnapshot,
  TimeSeriesPoint,
  BenchmarkResult,
} from './types'

export class StatsCollector {
  private latencies: number[] = []
  private statusCodes: Map<number, number> = new Map()
  private errors: Map<string, number> = new Map()
  private timeSeries: TimeSeriesPoint[] = []

  private totalRequests = 0
  private successfulRequests = 0
  private failedRequests = 0
  private totalBytes = 0

  private startTime = 0
  private lastSnapshotTime = 0
  private lastSnapshotRequests = 0
  private snapshotInterval = 1000

  private recentLatencies: number[] = []
  private readonly recentWindowSize = 100

  constructor() {
    this.startTime = Date.now()
    this.lastSnapshotTime = this.startTime
  }

  record(result: RequestResult): void {
    this.totalRequests++
    this.latencies.push(result.latencyMs)
    this.totalBytes += result.bytes

    this.recentLatencies.push(result.latencyMs)
    if (this.recentLatencies.length > this.recentWindowSize) {
      this.recentLatencies.shift()
    }

    if (result.success && result.statusCode !== undefined) {
      this.successfulRequests++
      const count = this.statusCodes.get(result.statusCode) || 0
      this.statusCodes.set(result.statusCode, count + 1)
    } else {
      this.failedRequests++
      if (result.error) {
        const count = this.errors.get(result.error) || 0
        this.errors.set(result.error, count + 1)
      }
      if (result.statusCode !== undefined) {
        const count = this.statusCodes.get(result.statusCode) || 0
        this.statusCodes.set(result.statusCode, count + 1)
      }
    }

    const now = Date.now()
    if (now - this.lastSnapshotTime >= this.snapshotInterval) {
      this.captureTimeSeriesPoint(now)
    }
  }

  private captureTimeSeriesPoint(now: number): void {
    const elapsed = (now - this.lastSnapshotTime) / 1000
    const requestsDelta = this.totalRequests - this.lastSnapshotRequests
    const rps = elapsed > 0 ? requestsDelta / elapsed : 0

    const sorted = [...this.recentLatencies].sort((a, b) => a - b)
    const p50 = this.percentile(sorted, 50)
    const p99 = this.percentile(sorted, 99)

    this.timeSeries.push({
      timestamp: now,
      rps,
      latencyP50: p50,
      latencyP99: p99,
      errorCount: this.failedRequests,
    })

    this.lastSnapshotTime = now
    this.lastSnapshotRequests = this.totalRequests
  }

  getSnapshot(): StatsSnapshot {
    const elapsed = Date.now() - this.startTime
    const rps = elapsed > 0 ? (this.totalRequests / elapsed) * 1000 : 0
    const bytesPerSecond = elapsed > 0 ? (this.totalBytes / elapsed) * 1000 : 0

    const sorted = [...this.recentLatencies].sort((a, b) => a - b)

    return {
      totalRequests: this.totalRequests,
      successfulRequests: this.successfulRequests,
      failedRequests: this.failedRequests,
      currentRps: rps,
      bytesPerSecond,
      latencyP50: this.percentile(sorted, 50),
      latencyP99: this.percentile(sorted, 99),
      elapsedMs: elapsed,
    }
  }

  finalize(config: { url: string; method: string; connections: number }): BenchmarkResult {
    const durationMs = Date.now() - this.startTime
    const sorted = [...this.latencies].sort((a, b) => a - b)

    return {
      url: config.url,
      method: config.method,
      connections: config.connections,
      durationMs,

      totalRequests: this.totalRequests,
      successfulRequests: this.successfulRequests,
      failedRequests: this.failedRequests,

      requestsPerSecond: durationMs > 0 ? (this.totalRequests / durationMs) * 1000 : 0,
      bytesPerSecond: durationMs > 0 ? (this.totalBytes / durationMs) * 1000 : 0,
      totalBytes: this.totalBytes,

      latency: this.calculateLatencyStats(sorted),
      statusCodes: Object.fromEntries(this.statusCodes),
      errors: Object.fromEntries(this.errors),

      timeSeries: this.timeSeries,
    }
  }

  private calculateLatencyStats(sorted: number[]): LatencyStats {
    if (sorted.length === 0) {
      return {
        min: 0,
        max: 0,
        mean: 0,
        median: 0,
        stddev: 0,
        p50: 0,
        p75: 0,
        p90: 0,
        p95: 0,
        p99: 0,
        p999: 0,
      }
    }

    const sum = sorted.reduce((a, b) => a + b, 0)
    const mean = sum / sorted.length

    const squaredDiffs = sorted.map(v => Math.pow(v - mean, 2))
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / sorted.length
    const stddev = Math.sqrt(variance)

    return {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      mean,
      median: this.percentile(sorted, 50),
      stddev,
      p50: this.percentile(sorted, 50),
      p75: this.percentile(sorted, 75),
      p90: this.percentile(sorted, 90),
      p95: this.percentile(sorted, 95),
      p99: this.percentile(sorted, 99),
      p999: this.percentile(sorted, 99.9),
    }
  }

  private percentile(sorted: number[], p: number): number {
    if (sorted.length === 0) return 0
    const index = Math.ceil((p / 100) * sorted.length) - 1
    return sorted[Math.max(0, Math.min(index, sorted.length - 1))]
  }
}
