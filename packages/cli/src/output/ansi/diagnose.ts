import type { DiagnosticResult, TimingBreakdown } from "../../core/diagnose";
import { formatLatency } from "../../utils/time";
import { bold, cyan, yellow, green, blue, white, gray } from "../../utils/colors";

const BAR_WIDTH = 30;

function createBar(value: number, maxValue: number, color: (s: string) => string): string {
  if (maxValue === 0) return gray("░".repeat(BAR_WIDTH));

  const filled = Math.max(1, Math.round((value / maxValue) * BAR_WIDTH));
  const empty = BAR_WIDTH - filled;

  return color("█".repeat(filled)) + gray("░".repeat(empty));
}

function formatPhaseRow(
  label: string,
  value: number,
  maxValue: number,
  color: (s: string) => string,
  skipLabel?: string,
): string {
  if (skipLabel && value === 0) {
    return `  │  ${label.padEnd(16)} ${gray(`(${skipLabel})`.padEnd(BAR_WIDTH + 2))} ${gray("0.00ms").padStart(10)}`;
  }

  const bar = createBar(value, maxValue, color);
  const timeStr = formatLatency(value).padStart(10);

  return `  │  ${label.padEnd(16)} ${bar} ${white(timeStr)}`;
}

function renderTimingSection(
  title: string,
  timing: TimingBreakdown,
  maxTime: number,
  isWarm: boolean,
): string[] {
  const lines: string[] = [];

  lines.push(`  ┌─ ${title} ${"─".repeat(50 - title.length)}`);
  lines.push("  │");

  lines.push(
    formatPhaseRow("DNS Lookup", timing.dnsLookupMs, maxTime, cyan, isWarm ? "cached" : undefined),
  );

  lines.push(
    formatPhaseRow(
      "TCP + TLS",
      timing.tcpTlsConnectMs,
      maxTime,
      yellow,
      isWarm ? "keep-alive" : undefined,
    ),
  );

  lines.push(formatPhaseRow("Time to First", timing.ttfbMs, maxTime, green));
  lines.push(`  │   ${gray("Byte (TTFB)")}`);

  lines.push(formatPhaseRow("Content", timing.contentTransferMs, maxTime, blue));
  lines.push(`  │   ${gray("Transfer")}`);

  lines.push(`  │  ${"─".repeat(55)}`);
  lines.push(
    `  │  ${"Total".padEnd(16)} ${" ".repeat(BAR_WIDTH + 2)} ${white(formatLatency(timing.totalMs).padStart(10))}`,
  );
  lines.push("  │");
  lines.push(`  └${"─".repeat(58)}`);

  return lines;
}

export function renderDiagnostics(result: DiagnosticResult, url: string, method: string): string {
  const lines: string[] = [];
  const maxTime = Math.max(
    result.cold.dnsLookupMs,
    result.cold.tcpTlsConnectMs,
    result.cold.ttfbMs,
    result.cold.contentTransferMs,
    result.warm.ttfbMs,
    result.warm.contentTransferMs,
  );

  lines.push("");
  lines.push(bold("═".repeat(65)));
  lines.push(bold("  burl - Connection Diagnostics"));
  lines.push(bold("═".repeat(65)));
  lines.push("");

  lines.push(`  ${cyan("Target:")} ${white(method)} ${white(url)}`);
  lines.push("");

  lines.push(
    ...renderTimingSection("Cold Connection (first request)", result.cold, maxTime, false),
  );
  lines.push("");

  lines.push(
    ...renderTimingSection("Warm Connection (reused, cached DNS)", result.warm, maxTime, true),
  );
  lines.push("");

  lines.push(`  ${cyan("Connection Details")}`);
  lines.push(`    Remote Address:   ${white(result.details.remoteAddress)}`);
  lines.push(`    Protocol:         ${white(result.details.protocol)}`);

  if (result.details.tlsVersion) {
    lines.push(`    TLS:              ${white(result.details.tlsVersion)}`);
  }

  if (result.details.serverHeader) {
    lines.push(`    Server:           ${white(result.details.serverHeader)}`);
  }

  lines.push(`    Status:           ${white(String(result.statusCode))}`);
  lines.push(`    Response Size:    ${white(formatBytes(result.responseSize))}`);

  if (result.details.contentType) {
    lines.push(`    Content-Type:     ${white(result.details.contentType)}`);
  }

  lines.push("");
  lines.push(gray("─".repeat(65)));
  lines.push("");

  return lines.join("\n");
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
