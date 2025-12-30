import type { BenchmarkResult } from '../../stats/types'

export function exportCsv(result: BenchmarkResult): string {
  const lines: string[] = []

  lines.push('metric,value')
  lines.push(`url,${escapeCSV(result.url)}`)
  lines.push(`method,${result.method}`)
  lines.push(`connections,${result.connections}`)
  lines.push(`duration_ms,${result.durationMs}`)
  lines.push(`total_requests,${result.totalRequests}`)
  lines.push(`successful_requests,${result.successfulRequests}`)
  lines.push(`failed_requests,${result.failedRequests}`)
  lines.push(`requests_per_second,${result.requestsPerSecond.toFixed(2)}`)
  lines.push(`bytes_per_second,${result.bytesPerSecond.toFixed(2)}`)
  lines.push(`total_bytes,${result.totalBytes}`)
  lines.push(`latency_min_ms,${result.latency.min.toFixed(3)}`)
  lines.push(`latency_max_ms,${result.latency.max.toFixed(3)}`)
  lines.push(`latency_mean_ms,${result.latency.mean.toFixed(3)}`)
  lines.push(`latency_median_ms,${result.latency.median.toFixed(3)}`)
  lines.push(`latency_stddev_ms,${result.latency.stddev.toFixed(3)}`)
  lines.push(`latency_p50_ms,${result.latency.p50.toFixed(3)}`)
  lines.push(`latency_p75_ms,${result.latency.p75.toFixed(3)}`)
  lines.push(`latency_p90_ms,${result.latency.p90.toFixed(3)}`)
  lines.push(`latency_p95_ms,${result.latency.p95.toFixed(3)}`)
  lines.push(`latency_p99_ms,${result.latency.p99.toFixed(3)}`)
  lines.push(`latency_p999_ms,${result.latency.p999.toFixed(3)}`)

  for (const [code, count] of Object.entries(result.statusCodes)) {
    lines.push(`status_${code},${count}`)
  }

  for (const [error, count] of Object.entries(result.errors)) {
    lines.push(`error_${error},${count}`)
  }

  return lines.join('\n')
}

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}
