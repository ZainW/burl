import type { BenchmarkResult } from "../../stats/types";
import { formatDuration } from "../../utils/time";
import { formatThroughput } from "../../utils/bytes";
import { VERSION } from "../../version";

interface LlmJsonOutput {
  $schema: string;
  version: string;
  benchmark: {
    url: string;
    method: string;
    connections: number;
    duration_seconds: number;
  };
  summary: {
    total_requests: number;
    successful_requests: number;
    failed_requests: number;
    requests_per_second: number;
    bytes_per_second: number;
    success_rate: number;
  };
  latency_ms: {
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
  };
  status_codes: Record<string, number>;
  errors: Record<string, number>;
  interpretation: {
    performance: "excellent" | "good" | "fair" | "poor";
    issues: string[];
    recommendations: string[];
  };
}

export function exportLlmJson(result: BenchmarkResult): string {
  const successRate = result.successfulRequests / result.totalRequests;
  const { issues, recommendations } = analyzeResult(result);
  const performance = assessPerformance(result, successRate);

  const output: LlmJsonOutput = {
    $schema: "https://burl.dev/schema/v1/result.json",
    version: VERSION,
    benchmark: {
      url: result.url,
      method: result.method,
      connections: result.connections,
      duration_seconds: result.durationMs / 1000,
    },
    summary: {
      total_requests: result.totalRequests,
      successful_requests: result.successfulRequests,
      failed_requests: result.failedRequests,
      requests_per_second: Math.round(result.requestsPerSecond * 100) / 100,
      bytes_per_second: Math.round(result.bytesPerSecond),
      success_rate: Math.round(successRate * 10000) / 10000,
    },
    latency_ms: {
      min: round(result.latency.min),
      max: round(result.latency.max),
      mean: round(result.latency.mean),
      median: round(result.latency.median),
      stddev: round(result.latency.stddev),
      p50: round(result.latency.p50),
      p75: round(result.latency.p75),
      p90: round(result.latency.p90),
      p95: round(result.latency.p95),
      p99: round(result.latency.p99),
      p999: round(result.latency.p999),
    },
    status_codes: result.statusCodes,
    errors: result.errors,
    interpretation: {
      performance,
      issues,
      recommendations,
    },
  };

  return JSON.stringify(output, null, 2);
}

export function exportLlmMarkdown(result: BenchmarkResult): string {
  const lines: string[] = [];
  const successRate = ((result.successfulRequests / result.totalRequests) * 100).toFixed(2);
  const { issues, recommendations } = analyzeResult(result);

  lines.push("# HTTP Benchmark Results");
  lines.push("");

  lines.push("## Target");
  lines.push(`- **URL**: ${result.url}`);
  lines.push(`- **Method**: ${result.method}`);
  lines.push(`- **Duration**: ${formatDuration(result.durationMs)}`);
  lines.push(`- **Concurrency**: ${result.connections} connections`);
  lines.push("");

  lines.push("## Summary");
  lines.push("| Metric | Value |");
  lines.push("|--------|-------|");
  lines.push(`| Total Requests | ${result.totalRequests.toLocaleString()} |`);
  lines.push(`| Success Rate | ${successRate}% |`);
  lines.push(`| Requests/sec | ${result.requestsPerSecond.toFixed(2)} |`);
  lines.push(`| Throughput | ${formatThroughput(result.bytesPerSecond)} |`);
  lines.push("");

  lines.push("## Latency (milliseconds)");
  lines.push("| Percentile | Value |");
  lines.push("|------------|-------|");
  lines.push(`| Min | ${result.latency.min.toFixed(2)} |`);
  lines.push(`| p50 (Median) | ${result.latency.p50.toFixed(2)} |`);
  lines.push(`| p90 | ${result.latency.p90.toFixed(2)} |`);
  lines.push(`| p95 | ${result.latency.p95.toFixed(2)} |`);
  lines.push(`| p99 | ${result.latency.p99.toFixed(2)} |`);
  lines.push(`| Max | ${result.latency.max.toFixed(2)} |`);
  lines.push("");

  const statusCodes = Object.entries(result.statusCodes).sort(([a], [b]) => Number(a) - Number(b));
  if (statusCodes.length > 0) {
    lines.push("## Status Codes");
    for (const [code, count] of statusCodes) {
      const pct = ((count / result.totalRequests) * 100).toFixed(2);
      const statusText = getStatusText(Number(code));
      lines.push(`- \`${code} ${statusText}\`: ${count.toLocaleString()} (${pct}%)`);
    }
    lines.push("");
  }

  if (issues.length > 0) {
    lines.push("## Issues Detected");
    issues.forEach((issue, i) => {
      lines.push(`${i + 1}. ${issue}`);
    });
    lines.push("");
  }

  if (recommendations.length > 0) {
    lines.push("## Recommendations");
    recommendations.forEach((rec, i) => {
      lines.push(`${i + 1}. ${rec}`);
    });
    lines.push("");
  }

  return lines.join("\n");
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function analyzeResult(result: BenchmarkResult): { issues: string[]; recommendations: string[] } {
  const issues: string[] = [];
  const recommendations: string[] = [];

  const errorRate = result.failedRequests / result.totalRequests;
  if (errorRate > 0.01) {
    issues.push(
      `${result.failedRequests} requests failed (${(errorRate * 100).toFixed(2)}% error rate)`,
    );
  }

  const p99ToMedianRatio = result.latency.p99 / result.latency.p50;
  if (p99ToMedianRatio > 5 && result.latency.p50 > 0) {
    issues.push(
      `p99 latency (${result.latency.p99.toFixed(1)}ms) is ${p99ToMedianRatio.toFixed(1)}x higher than median (${result.latency.p50.toFixed(1)}ms), indicating tail latency issues`,
    );
  }

  const serverErrors = Object.entries(result.statusCodes)
    .filter(([code]) => Number(code) >= 500)
    .reduce((sum, [, count]) => sum + count, 0);

  if (serverErrors > 0) {
    const pct = ((serverErrors / result.totalRequests) * 100).toFixed(2);
    issues.push(`${serverErrors} server errors (5xx) detected (${pct}%)`);
    recommendations.push("Investigate server logs for 5xx error root cause");
  }

  if (result.errors["timeout"] && result.errors["timeout"] > 0) {
    recommendations.push("Consider increasing timeout or investigating server response time");
  }

  if (result.errors["connection_refused"] && result.errors["connection_refused"] > 0) {
    recommendations.push("Server may be overloaded or not accepting connections");
  }

  if (p99ToMedianRatio > 3 && result.latency.p50 > 0) {
    recommendations.push("Consider connection pooling or load balancing to reduce tail latency");
  }

  if (result.latency.p50 > 1000) {
    recommendations.push("Median latency exceeds 1 second - investigate server performance");
  }

  return { issues, recommendations };
}

function assessPerformance(
  result: BenchmarkResult,
  successRate: number,
): "excellent" | "good" | "fair" | "poor" {
  if (successRate < 0.95) return "poor";
  if (successRate < 0.99) return "fair";

  const p99 = result.latency.p99;
  if (p99 < 100) return "excellent";
  if (p99 < 500) return "good";
  if (p99 < 2000) return "fair";
  return "poor";
}

function getStatusText(code: number): string {
  const statusTexts: Record<number, string> = {
    200: "OK",
    201: "Created",
    204: "No Content",
    301: "Moved Permanently",
    302: "Found",
    304: "Not Modified",
    400: "Bad Request",
    401: "Unauthorized",
    403: "Forbidden",
    404: "Not Found",
    429: "Too Many Requests",
    500: "Internal Server Error",
    502: "Bad Gateway",
    503: "Service Unavailable",
    504: "Gateway Timeout",
  };
  return statusTexts[code] || "";
}
