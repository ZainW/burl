import type { BenchmarkResult, StatsSnapshot } from "../../stats/types";
import { formatLatency, formatDuration } from "../../utils/time";
import { formatBytes, formatThroughput } from "../../utils/bytes";
import {
  bold,
  green,
  red,
  yellow,
  cyan,
  gray,
  white,
  successBold,
  errorBold,
  progressBar,
} from "../../utils/colors";

export function renderProgress(snapshot: StatsSnapshot, progress: number, _url: string): string {
  const percentage = Math.round(progress * 100);
  const bar = progressBar(progress, 1, 30);

  const elapsed = formatDuration(snapshot.elapsedMs);
  const rps = snapshot.currentRps.toFixed(1);
  const p50 = formatLatency(snapshot.latencyP50);
  const p99 = formatLatency(snapshot.latencyP99);

  return [
    `\r${bar} ${percentage}%  ${elapsed}`,
    `  ${cyan("RPS")}: ${rps}`,
    `  ${cyan("P50")}: ${p50}`,
    `  ${cyan("P99")}: ${p99}`,
    `  ${green("OK")}: ${snapshot.successfulRequests}`,
    snapshot.failedRequests > 0 ? `  ${red("ERR")}: ${snapshot.failedRequests}` : "",
  ]
    .filter(Boolean)
    .join("");
}

export function renderResult(result: BenchmarkResult): string {
  const lines: string[] = [];

  lines.push("");
  lines.push(bold("═".repeat(60)));
  lines.push(bold("  burl - HTTP Benchmark Results"));
  lines.push(bold("═".repeat(60)));
  lines.push("");

  lines.push(cyan("  Target"));
  lines.push(`    URL:         ${white(result.url)}`);
  lines.push(`    Method:      ${white(result.method)}`);
  lines.push(`    Connections: ${white(String(result.connections))}`);
  lines.push(`    Duration:    ${white(formatDuration(result.durationMs))}`);
  lines.push("");

  lines.push(cyan("  Summary"));
  lines.push(`    Total Requests:  ${white(result.totalRequests.toLocaleString())}`);
  lines.push(`    Successful:      ${successBold(result.successfulRequests.toLocaleString())}`);
  if (result.failedRequests > 0) {
    lines.push(`    Failed:          ${errorBold(result.failedRequests.toLocaleString())}`);
  }
  lines.push(`    Requests/sec:    ${white(result.requestsPerSecond.toFixed(2))}`);
  lines.push(`    Throughput:      ${white(formatThroughput(result.bytesPerSecond))}`);
  lines.push(`    Total Data:      ${white(formatBytes(result.totalBytes))}`);
  lines.push("");

  lines.push(cyan("  Latency"));
  lines.push(`    Min:    ${white(formatLatency(result.latency.min))}`);
  lines.push(`    Max:    ${white(formatLatency(result.latency.max))}`);
  lines.push(`    Mean:   ${white(formatLatency(result.latency.mean))}`);
  lines.push(`    StdDev: ${white(formatLatency(result.latency.stddev))}`);
  lines.push("");
  lines.push(`    P50:    ${white(formatLatency(result.latency.p50))}`);
  lines.push(`    P75:    ${white(formatLatency(result.latency.p75))}`);
  lines.push(`    P90:    ${white(formatLatency(result.latency.p90))}`);
  lines.push(`    P95:    ${white(formatLatency(result.latency.p95))}`);
  lines.push(`    P99:    ${white(formatLatency(result.latency.p99))}`);
  lines.push(`    P99.9:  ${white(formatLatency(result.latency.p999))}`);
  lines.push("");

  const statusCodes = Object.entries(result.statusCodes).sort(([a], [b]) => Number(a) - Number(b));
  if (statusCodes.length > 0) {
    lines.push(cyan("  Status Codes"));
    for (const [code, count] of statusCodes) {
      const codeNum = Number(code);
      const color = codeNum < 300 ? green : codeNum < 400 ? yellow : red;
      const pct = ((count / result.totalRequests) * 100).toFixed(2);
      lines.push(`    ${color(code)}: ${white(count.toLocaleString())} (${pct}%)`);
    }
    lines.push("");
  }

  const errors = Object.entries(result.errors).sort(([, a], [, b]) => b - a);
  if (errors.length > 0) {
    lines.push(cyan("  Errors"));
    for (const [error, count] of errors) {
      lines.push(`    ${red(error)}: ${white(count.toLocaleString())}`);
    }
    lines.push("");
  }

  lines.push(gray("─".repeat(60)));
  lines.push("");

  return lines.join("\n");
}

export function renderHeader(url: string, method: string, connections: number): string {
  const lines: string[] = [];

  lines.push("");
  lines.push(`${bold("burl")} ${gray("v0.1.0")}`);
  lines.push("");
  lines.push(`${cyan("Target:")} ${white(method)} ${white(url)}`);
  lines.push(`${cyan("Connections:")} ${white(String(connections))}`);
  lines.push("");

  return lines.join("\n");
}
