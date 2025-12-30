import type { BenchmarkResult } from '../../stats/types';
import { formatLatency, formatDuration } from '../../utils/time';
import { formatBytes, formatThroughput } from '../../utils/bytes';

export function exportMarkdown(result: BenchmarkResult): string {
  const lines: string[] = [];
  const successRate = ((result.successfulRequests / result.totalRequests) * 100).toFixed(2);

  lines.push('# HTTP Benchmark Results');
  lines.push('');
  lines.push('## Target');
  lines.push(`- **URL**: ${result.url}`);
  lines.push(`- **Method**: ${result.method}`);
  lines.push(`- **Connections**: ${result.connections}`);
  lines.push(`- **Duration**: ${formatDuration(result.durationMs)}`);
  lines.push('');

  lines.push('## Summary');
  lines.push('| Metric | Value |');
  lines.push('|--------|-------|');
  lines.push(`| Total Requests | ${result.totalRequests.toLocaleString()} |`);
  lines.push(`| Successful | ${result.successfulRequests.toLocaleString()} |`);
  lines.push(`| Failed | ${result.failedRequests.toLocaleString()} |`);
  lines.push(`| Success Rate | ${successRate}% |`);
  lines.push(`| Requests/sec | ${result.requestsPerSecond.toFixed(2)} |`);
  lines.push(`| Throughput | ${formatThroughput(result.bytesPerSecond)} |`);
  lines.push(`| Total Data | ${formatBytes(result.totalBytes)} |`);
  lines.push('');

  lines.push('## Latency');
  lines.push('| Percentile | Value |');
  lines.push('|------------|-------|');
  lines.push(`| Min | ${formatLatency(result.latency.min)} |`);
  lines.push(`| P50 (Median) | ${formatLatency(result.latency.p50)} |`);
  lines.push(`| P75 | ${formatLatency(result.latency.p75)} |`);
  lines.push(`| P90 | ${formatLatency(result.latency.p90)} |`);
  lines.push(`| P95 | ${formatLatency(result.latency.p95)} |`);
  lines.push(`| P99 | ${formatLatency(result.latency.p99)} |`);
  lines.push(`| P99.9 | ${formatLatency(result.latency.p999)} |`);
  lines.push(`| Max | ${formatLatency(result.latency.max)} |`);
  lines.push(`| Mean | ${formatLatency(result.latency.mean)} |`);
  lines.push(`| StdDev | ${formatLatency(result.latency.stddev)} |`);
  lines.push('');

  const statusCodes = Object.entries(result.statusCodes).sort(([a], [b]) => Number(a) - Number(b));
  if (statusCodes.length > 0) {
    lines.push('## Status Codes');
    lines.push('| Code | Count | Percentage |');
    lines.push('|------|-------|------------|');
    for (const [code, count] of statusCodes) {
      const pct = ((count / result.totalRequests) * 100).toFixed(2);
      lines.push(`| ${code} | ${count.toLocaleString()} | ${pct}% |`);
    }
    lines.push('');
  }

  const errors = Object.entries(result.errors).sort(([, a], [, b]) => b - a);
  if (errors.length > 0) {
    lines.push('## Errors');
    lines.push('| Type | Count |');
    lines.push('|------|-------|');
    for (const [error, count] of errors) {
      lines.push(`| ${error} | ${count.toLocaleString()} |`);
    }
    lines.push('');
  }

  return lines.join('\n');
}
