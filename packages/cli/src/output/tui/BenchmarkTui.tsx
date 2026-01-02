import type { BenchmarkResult, StatsSnapshot } from "../../stats/types";
import { formatLatency, formatDuration } from "../../utils/time";
import { formatBytes, formatThroughput } from "../../utils/bytes";
import { VERSION } from "../../version";
import { useState, useEffect } from "react";
import { useKeyboard, useTerminalDimensions } from "@opentui/react";
import { theme } from "./theme";

type Phase = "idle" | "warmup" | "running" | "complete" | "exporting" | "editing";
type MetricView = "overview" | "rps" | "latency" | "throughput";
type LayoutMode = "compact" | "normal" | "wide";
type UpgradeStatus =
  | { status: "current" }
  | { status: "checking" }
  | { status: "downloading"; version: string }
  | { status: "ready"; version: string }
  | { status: "failed"; error: string };

const colors = {
  primary: theme.primary,
  secondary: theme.secondary,
  accent: theme.accent,
  success: theme.success,
  warning: theme.warning,
  error: theme.error,
  text: theme.text,
  textMuted: theme.textMuted,
  textDim: theme.textDim,
  border: theme.border,
  borderMuted: theme.borderMuted,
  info: theme.accent,
};

interface MetricHistory {
  rps: number[];
  latencyP50: number[];
  latencyP99: number[];
  throughput: number[];
  successRate: number[];
  timestamps: number[];
}

interface TuiState {
  phase: Phase;
  view: MetricView;
  url: string;
  method: string;
  connections: number;
  duration?: number;
  snapshot?: StatsSnapshot;
  progress: number;
  result?: BenchmarkResult;
  history: MetricHistory;
  onStop?: () => void;
  onRerun?: () => void;
  onExport?: (format: "json" | "csv" | "markdown") => void;
  onQuit?: () => void;
  onUpdateConnections?: (connections: number) => void;
  exportMessage?: string;
  editInput: string;
  upgradeStatus: UpgradeStatus;
}

const emptyHistory: MetricHistory = {
  rps: [],
  latencyP50: [],
  latencyP99: [],
  throughput: [],
  successRate: [],
  timestamps: [],
};

let globalState: TuiState = {
  phase: "idle",
  view: "overview",
  url: "",
  method: "GET",
  connections: 1,
  progress: 0,
  history: { ...emptyHistory },
  editInput: "",
  upgradeStatus: { status: "current" },
};

let listeners: Set<() => void> = new Set();

export function updateTuiState(partial: Partial<TuiState>) {
  globalState = { ...globalState, ...partial };
  listeners.forEach((fn) => fn());
}

export function getTuiState(): TuiState {
  return globalState;
}

export function resetTuiState() {
  globalState = {
    ...globalState,
    phase: "idle",
    view: "overview",
    progress: 0,
    snapshot: undefined,
    result: undefined,
    history: { ...emptyHistory },
    exportMessage: undefined,
    editInput: "",
  };
  listeners.forEach((fn) => fn());
}

export function setUpgradeStatus(status: UpgradeStatus) {
  globalState = { ...globalState, upgradeStatus: status };
  listeners.forEach((fn) => fn());
}

export function appendMetricHistory(snapshot: StatsSnapshot) {
  const h = globalState.history;
  const total = snapshot.successfulRequests + snapshot.failedRequests;
  const successRate = total > 0 ? (snapshot.successfulRequests / total) * 100 : 100;

  globalState.history = {
    rps: [...h.rps, snapshot.currentRps],
    latencyP50: [...h.latencyP50, snapshot.latencyP50],
    latencyP99: [...h.latencyP99, snapshot.latencyP99],
    throughput: [...h.throughput, snapshot.bytesPerSecond || 0],
    successRate: [...h.successRate, successRate],
    timestamps: [...h.timestamps, snapshot.elapsedMs],
  };
}

function useTuiState(): TuiState {
  const [state, setState] = useState(globalState);

  useEffect(() => {
    const listener = () => setState({ ...globalState });
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return state;
}

function getLayoutMode(width: number): LayoutMode {
  if (width < 80) return "compact";
  if (width > 120) return "wide";
  return "normal";
}

const SPARKLINE_CHARS = ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"];

function Sparkline({
  values,
  width,
  color = colors.primary,
  label,
}: {
  values: number[];
  width: number;
  color?: string;
  label?: string;
}) {
  if (values.length === 0) return <text fg={colors.textMuted}>Collecting data...</text>;

  const chartWidth = Math.max(20, width - 4);
  const recent = values.slice(-chartWidth);
  const min = Math.min(...recent);
  const max = Math.max(...recent);
  const range = max - min || 1;

  const sparkline = recent
    .map((v) => {
      const normalized = (v - min) / range;
      const index = Math.min(
        Math.floor(normalized * SPARKLINE_CHARS.length),
        SPARKLINE_CHARS.length - 1,
      );
      return SPARKLINE_CHARS[index];
    })
    .join("");

  const curr = recent[recent.length - 1] ?? 0;
  const prev = recent[recent.length - 2];
  const trend = recent.length > 1 && prev !== undefined ? (curr > prev ? "↑" : "↓") : "";
  const trendColor = prev !== undefined && curr > prev ? colors.success : colors.warning;

  return (
    <box flexDirection="column">
      {label && (
        <text fg={colors.secondary}>
          {label} {trend && <span fg={trendColor}>{trend}</span>}
        </text>
      )}
      <text fg={color}>{sparkline}</text>
      <box flexDirection="row" gap={2}>
        <text fg={colors.textMuted}>min: {formatValue(min, label)}</text>
        <text fg={colors.textMuted}>max: {formatValue(max, label)}</text>
        <text fg={colors.success}>now: {formatValue(curr, label)}</text>
      </box>
    </box>
  );
}

function formatValue(value: number, label?: string): string {
  if (label?.toLowerCase().includes("latency")) {
    return formatLatency(value);
  }
  if (label?.toLowerCase().includes("throughput")) {
    return formatThroughput(value);
  }
  if (label?.toLowerCase().includes("rate") || label?.toLowerCase().includes("%")) {
    return value.toFixed(1) + "%";
  }
  return value.toFixed(1);
}

function ProgressBar({ progress, width }: { progress: number; width: number }) {
  const barWidth = Math.max(20, width - 10);
  const filled = Math.round(progress * barWidth);
  const empty = barWidth - filled;
  const bar = "█".repeat(filled) + "░".repeat(empty);
  const pct = Math.round(progress * 100);
  return (
    <text>
      <span fg={colors.primary}>{bar}</span>
      <span fg={colors.text}> {pct}%</span>
    </text>
  );
}

function Header({
  url,
  method,
  connections,
  duration,
  layout,
}: {
  url: string;
  method: string;
  connections: number;
  duration?: number;
  layout: LayoutMode;
}) {
  const truncatedUrl = layout === "compact" && url.length > 40 ? url.slice(0, 37) + "..." : url;

  return (
    <box
      flexDirection="column"
      border
      borderStyle="rounded"
      borderColor={colors.primary}
      padding={1}
      marginBottom={1}
    >
      <box flexDirection="row" justifyContent="space-between">
        <text>
          <span fg={colors.primary}>burl</span>
          <span fg={colors.textMuted}> v{VERSION}</span>
        </text>
        {layout !== "compact" && (
          <text fg={colors.textMuted}>
            {connections} connection{connections === 1 ? "" : "s"}
            {duration ? ` · ${formatDuration(duration)}` : ""}
          </text>
        )}
      </box>
      <box flexDirection="row" gap={1} marginTop={1}>
        <text>
          <span fg={colors.warning}>{method}</span>
        </text>
        <text fg={colors.text}>{truncatedUrl}</text>
      </box>
    </box>
  );
}

function TabBar({
  currentView,
  layout,
}: {
  currentView: MetricView;
  layout: LayoutMode;
}) {
  const tabs: { key: string; view: MetricView; label: string; short: string }[] = [
    { key: "1", view: "overview", label: "Overview", short: "Ovw" },
    { key: "2", view: "rps", label: "RPS", short: "RPS" },
    { key: "3", view: "latency", label: "Latency", short: "Lat" },
    { key: "4", view: "throughput", label: "Throughput", short: "Thr" },
  ];

  return (
    <box flexDirection="row" gap={2} marginBottom={1}>
      {tabs.map((tab) => (
        <text key={tab.key}>
          <span fg={currentView === tab.view ? colors.primary : colors.textMuted}>
            [{tab.key}] {layout === "compact" ? tab.short : tab.label}
          </span>
        </text>
      ))}
      {layout !== "compact" && <text fg={colors.textDim}> │ [tab] cycle</text>}
    </box>
  );
}

function StatRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <box flexDirection="row">
      <text fg={colors.textMuted}>{label.padEnd(10)}</text>
      <text fg={color || colors.text}>{value}</text>
    </box>
  );
}

function MetricsPanel({
  title,
  rows,
}: {
  title: string;
  rows: { label: string; value: string; color?: string }[];
}) {
  return (
    <box flexDirection="column" flexGrow={1}>
      <text fg={colors.secondary}>{title}</text>
      <box flexDirection="column" marginTop={1}>
        {rows.map((row, i) => (
          <StatRow key={i} label={row.label} value={row.value} color={row.color} />
        ))}
      </box>
    </box>
  );
}

function OverviewView({
  snapshot,
  history,
  result,
  width,
  layout,
}: {
  snapshot?: StatsSnapshot;
  history: MetricHistory;
  result?: BenchmarkResult;
  width: number;
  layout: LayoutMode;
}) {
  const data = result || snapshot;
  if (!data) return <text fg={colors.textMuted}>Waiting for data...</text>;

  const isComplete = !!result;
  const chartWidth = layout === "wide" ? Math.floor((width - 8) / 2) : width - 6;

  const requestsRows = [
    {
      label: "Total",
      value: (result?.totalRequests ?? snapshot?.totalRequests ?? 0).toLocaleString(),
    },
    {
      label: "Success",
      value: (result?.successfulRequests ?? snapshot?.successfulRequests ?? 0).toLocaleString(),
      color: colors.success,
    },
    {
      label: "Failed",
      value: (result?.failedRequests ?? snapshot?.failedRequests ?? 0).toLocaleString(),
      color: (result?.failedRequests ?? snapshot?.failedRequests ?? 0) > 0 ? colors.error : colors.textMuted,
    },
    {
      label: "RPS",
      value: (result?.requestsPerSecond ?? snapshot?.currentRps ?? 0).toFixed(1),
      color: colors.info,
    },
  ];

  const latencyRows = [
    { label: "P50", value: formatLatency(result?.latency.p50 ?? snapshot?.latencyP50 ?? 0) },
    { label: "P99", value: formatLatency(result?.latency.p99 ?? snapshot?.latencyP99 ?? 0) },
    { label: "Mean", value: formatLatency(result?.latency.mean ?? 0) },
    { label: "Max", value: formatLatency(result?.latency.max ?? 0), color: colors.warning },
  ];

  const dataRows = [
    { label: "Total", value: formatBytes(result?.totalBytes ?? 0) },
    { label: "Throughput", value: formatThroughput(result?.bytesPerSecond ?? 0) },
    { label: "Duration", value: formatDuration(result?.durationMs ?? snapshot?.elapsedMs ?? 0) },
  ];

  return (
    <box flexDirection="column" gap={1}>
      <box
        flexDirection="row"
        gap={2}
        border
        borderStyle="rounded"
        borderColor={colors.borderMuted}
        padding={1}
      >
        <MetricsPanel title="Requests" rows={requestsRows} />
        <MetricsPanel title="Latency" rows={latencyRows} />
        {layout !== "compact" && <MetricsPanel title="Data" rows={dataRows} />}
      </box>

      {history.rps.length > 1 && (
        <box flexDirection={layout === "wide" ? "row" : "column"} gap={1}>
          <box
            flexGrow={1}
            border
            borderStyle="rounded"
            borderColor={colors.borderMuted}
            padding={1}
          >
            <Sparkline values={history.rps} label="RPS Trend" color={colors.success} width={chartWidth} />
          </box>
          {layout === "wide" && (
            <box
              flexGrow={1}
              border
              borderStyle="rounded"
              borderColor={colors.borderMuted}
              padding={1}
            >
              <Sparkline
                values={history.latencyP50}
                label="P50 Latency"
                color={colors.primary}
                width={chartWidth}
              />
            </box>
          )}
        </box>
      )}

      {isComplete && result && (
        <StatusCodes statusCodes={result.statusCodes} total={result.totalRequests} />
      )}

      {isComplete && result && result.failedRequests > 0 && result.errors && (
        <ErrorsPanel errors={result.errors} total={result.failedRequests} layout={layout} />
      )}
    </box>
  );
}

function RpsView({
  snapshot,
  history,
  result,
  width,
  layout,
}: {
  snapshot?: StatsSnapshot;
  history: MetricHistory;
  result?: BenchmarkResult;
  width: number;
  layout: LayoutMode;
}) {
  const currentRps = result?.requestsPerSecond ?? snapshot?.currentRps ?? 0;
  const avgRps =
    history.rps.length > 0 ? history.rps.reduce((a, b) => a + b, 0) / history.rps.length : 0;
  const maxRps = history.rps.length > 0 ? Math.max(...history.rps) : 0;
  const minRps = history.rps.length > 0 ? Math.min(...history.rps) : 0;
  const chartWidth = width - 6;

  return (
    <box flexDirection="column" gap={1}>
      <box
        flexDirection="row"
        gap={3}
        border
        borderStyle="rounded"
        borderColor={colors.borderMuted}
        padding={1}
      >
        <box flexDirection="column">
          <text fg={colors.secondary}>Requests Per Second</text>
          <box flexDirection="row" gap={3} marginTop={1}>
            <StatRow label="Current" value={currentRps.toFixed(1)} color={colors.success} />
            <StatRow label="Average" value={avgRps.toFixed(1)} />
            <StatRow label="Min" value={minRps.toFixed(1)} />
            <StatRow label="Max" value={maxRps.toFixed(1)} />
          </box>
        </box>
        {layout !== "compact" && (
          <box flexDirection="column">
            <text fg={colors.textMuted}>Variance: {(maxRps - minRps).toFixed(1)}</text>
            <text fg={colors.textMuted}>Samples: {history.rps.length}</text>
          </box>
        )}
      </box>

      <box border borderStyle="rounded" borderColor={colors.borderMuted} padding={1}>
        <Sparkline values={history.rps} label="RPS Over Time" color={colors.success} width={chartWidth} />
      </box>

      {history.successRate.length > 0 && (
        <box border borderStyle="rounded" borderColor={colors.borderMuted} padding={1}>
          <Sparkline
            values={history.successRate}
            label="Success Rate %"
            color={colors.primary}
            width={chartWidth}
          />
        </box>
      )}
    </box>
  );
}

function LatencyView({
  snapshot,
  history,
  result,
  width,
  layout,
}: {
  snapshot?: StatsSnapshot;
  history: MetricHistory;
  result?: BenchmarkResult;
  width: number;
  layout: LayoutMode;
}) {
  const chartWidth = layout === "wide" ? Math.floor((width - 10) / 2) : width - 6;

  return (
    <box flexDirection="column" gap={1}>
      <box
        flexDirection="row"
        gap={2}
        border
        borderStyle="rounded"
        borderColor={colors.borderMuted}
        padding={1}
      >
        <box flexDirection="column" flexGrow={1}>
          <text fg={colors.secondary}>Percentiles</text>
          <box flexDirection={layout === "compact" ? "column" : "row"} gap={layout === "compact" ? 0 : 3} marginTop={1}>
            <box flexDirection="column">
              <StatRow label="Min" value={formatLatency(result?.latency.min ?? 0)} />
              <StatRow label="P50" value={formatLatency(result?.latency.p50 ?? snapshot?.latencyP50 ?? 0)} />
              <StatRow label="P75" value={formatLatency(result?.latency.p75 ?? 0)} />
              <StatRow label="P90" value={formatLatency(result?.latency.p90 ?? 0)} />
            </box>
            <box flexDirection="column">
              <StatRow label="P95" value={formatLatency(result?.latency.p95 ?? 0)} />
              <StatRow label="P99" value={formatLatency(result?.latency.p99 ?? snapshot?.latencyP99 ?? 0)} color={colors.warning} />
              <StatRow label="Max" value={formatLatency(result?.latency.max ?? 0)} color={colors.error} />
            </box>
          </box>
        </box>

        {layout !== "compact" && (
          <box flexDirection="column">
            <text fg={colors.secondary}>Statistics</text>
            <box flexDirection="column" marginTop={1}>
              <StatRow label="Mean" value={formatLatency(result?.latency.mean ?? 0)} />
              <StatRow label="StdDev" value={formatLatency(result?.latency.stddev ?? 0)} />
            </box>
          </box>
        )}
      </box>

      <box flexDirection={layout === "wide" ? "row" : "column"} gap={1}>
        <box flexGrow={1} border borderStyle="rounded" borderColor={colors.borderMuted} padding={1}>
          <Sparkline
            values={history.latencyP50}
            label="P50 Latency"
            color={colors.primary}
            width={chartWidth}
          />
        </box>
        <box flexGrow={1} border borderStyle="rounded" borderColor={colors.borderMuted} padding={1}>
          <Sparkline
            values={history.latencyP99}
            label="P99 Latency"
            color={colors.error}
            width={chartWidth}
          />
        </box>
      </box>

      {result && <LatencyHistogram result={result} width={width} />}
    </box>
  );
}

function ThroughputView({
  snapshot: _snapshot,
  history,
  result,
  width,
  layout: _layout,
}: {
  snapshot?: StatsSnapshot;
  history: MetricHistory;
  result?: BenchmarkResult;
  width: number;
  layout: LayoutMode;
}) {
  const avgThroughput =
    history.throughput.length > 0
      ? history.throughput.reduce((a, b) => a + b, 0) / history.throughput.length
      : 0;
  const chartWidth = width - 6;

  return (
    <box flexDirection="column" gap={1}>
      <box border borderStyle="rounded" borderColor={colors.borderMuted} padding={1}>
        <box flexDirection="column">
          <text fg={colors.secondary}>Data Throughput</text>
          <box flexDirection="row" gap={3} marginTop={1}>
            <StatRow
              label="Current"
              value={formatThroughput(history.throughput[history.throughput.length - 1] ?? 0)}
              color={colors.success}
            />
            <StatRow label="Average" value={formatThroughput(avgThroughput)} />
            <StatRow label="Total" value={formatBytes(result?.totalBytes ?? 0)} />
          </box>
        </box>
      </box>

      <box border borderStyle="rounded" borderColor={colors.borderMuted} padding={1}>
        <Sparkline
          values={history.throughput}
          label="Throughput Over Time"
          color={colors.warning}
          width={chartWidth}
        />
      </box>
    </box>
  );
}

function LatencyHistogram({
  result,
  width,
}: {
  result: BenchmarkResult;
  width: number;
}) {
  const buckets = [
    { label: "P50", value: result.latency.p50, color: colors.success },
    { label: "P75", value: result.latency.p75, color: colors.primary },
    { label: "P90", value: result.latency.p90, color: colors.info },
    { label: "P95", value: result.latency.p95, color: colors.warning },
    { label: "P99", value: result.latency.p99, color: colors.error },
  ];

  const maxValue = Math.max(...buckets.map((b) => b.value));
  const barWidth = Math.min(40, width - 25);

  return (
    <box border borderStyle="rounded" borderColor={colors.borderMuted} padding={1}>
      <box flexDirection="column">
        <text fg={colors.secondary}>Latency Distribution</text>
        <box flexDirection="column" marginTop={1}>
          {buckets.map((bucket) => {
            const barLen = Math.max(1, Math.round((bucket.value / maxValue) * barWidth));
            const bar = "▓".repeat(barLen);
            return (
              <box key={bucket.label} flexDirection="row">
                <text fg={colors.textMuted} style={{ width: 5 }}>
                  {bucket.label}
                </text>
                <text fg={bucket.color}>{bar}</text>
                <text fg={colors.text}> {formatLatency(bucket.value)}</text>
              </box>
            );
          })}
        </box>
      </box>
    </box>
  );
}

function StatusCodes({
  statusCodes,
  total,
}: {
  statusCodes: Record<number, number>;
  total: number;
}) {
  const entries = Object.entries(statusCodes).sort(([a], [b]) => Number(a) - Number(b));
  if (entries.length === 0) return null;

  return (
    <box border borderStyle="rounded" borderColor={colors.borderMuted} padding={1}>
      <box flexDirection="column">
        <text fg={colors.secondary}>Status Codes</text>
        <box flexDirection="row" gap={2} marginTop={1} flexWrap="wrap">
          {entries.map(([code, count]) => {
            const codeNum = Number(code);
            const color = codeNum < 300 ? colors.success : codeNum < 400 ? colors.warning : colors.error;
            const pct = ((count / total) * 100).toFixed(0);
            return (
              <text key={code}>
                <span fg={color}>{code}</span>
                <span fg={colors.textMuted}>
                  : {count.toLocaleString()} ({pct}%)
                </span>
              </text>
            );
          })}
        </box>
      </box>
    </box>
  );
}

function ErrorsPanel({
  errors,
  total,
  layout,
}: {
  errors: Record<string, number>;
  total: number;
  layout: LayoutMode;
}) {
  const entries = Object.entries(errors).sort(([, a], [, b]) => b - a);
  if (entries.length === 0) return null;

  return (
    <box border borderStyle="rounded" borderColor={colors.error} padding={1}>
      <box flexDirection="column">
        <text fg={colors.error}>Errors ({total.toLocaleString()} total)</text>
        <box flexDirection="column" marginTop={1}>
          {entries.slice(0, layout === "compact" ? 3 : 5).map(([error, count]) => {
            const pct = ((count / total) * 100).toFixed(0);
            return (
              <text key={error} fg={colors.textMuted}>
                {error}: {count.toLocaleString()} ({pct}%)
              </text>
            );
          })}
        </box>
      </box>
    </box>
  );
}

function RunningStatus({
  progress,
  elapsed,
  snapshot,
  width,
}: {
  progress: number;
  elapsed: number;
  snapshot?: StatsSnapshot;
  width: number;
}) {
  return (
    <box
      flexDirection="column"
      border
      borderStyle="rounded"
      borderColor={colors.primary}
      padding={1}
      marginBottom={1}
    >
      <box flexDirection="row" justifyContent="space-between">
        <text fg={colors.info}>Running benchmark...</text>
        <text fg={colors.textMuted}>
          {formatDuration(elapsed)}
          {snapshot && ` · ${snapshot.currentRps.toFixed(0)} req/s`}
        </text>
      </box>
      <box marginTop={1}>
        <ProgressBar progress={progress} width={width - 4} />
      </box>
    </box>
  );
}

function UpgradeNotification({ status }: { status: UpgradeStatus }) {
  if (status.status === "ready") {
    return (
      <box marginTop={1}>
        <text fg={colors.success}>✓ Updated to v{status.version} — restart burl to use</text>
      </box>
    );
  }

  if (status.status === "downloading") {
    return (
      <box marginTop={1}>
        <text fg={colors.textMuted}>↓ Downloading v{status.version}...</text>
      </box>
    );
  }

  return null;
}

function CommandBar({
  phase,
  exportMessage,
  editInput,
  connections,
  layout,
}: {
  phase: Phase;
  exportMessage?: string;
  editInput: string;
  connections: number;
  layout: LayoutMode;
}) {
  const divider = layout === "compact" ? "" : "─".repeat(60);

  if (phase === "running") {
    return (
      <box marginTop={1}>
        <text fg={colors.textMuted}>
          {layout === "compact" ? "[q] stop" : "[q] stop early  [1-4] switch view  [tab] cycle"}
        </text>
      </box>
    );
  }

  if (phase === "exporting") {
    return (
      <box marginTop={1}>
        <text fg={colors.warning}>[j] JSON  [c] CSV  [m] Markdown  [esc] cancel</text>
      </box>
    );
  }

  if (phase === "editing") {
    return (
      <box flexDirection="column" marginTop={1}>
        {divider && <text fg={colors.textMuted}>{divider}</text>}
        <box flexDirection="row" gap={1}>
          <text fg={colors.warning}>Connections:</text>
          <text fg={colors.text}>{editInput || connections}</text>
          <text fg={colors.primary}>█</text>
        </box>
        <text fg={colors.textMuted}>
          {layout === "compact"
            ? "[0-9] type [enter] confirm [esc] cancel"
            : "[0-9] type  [backspace] delete  [enter] confirm  [esc] cancel"}
        </text>
      </box>
    );
  }

  if (phase === "complete") {
    return (
      <box flexDirection="column" marginTop={1}>
        {divider && <text fg={colors.textMuted}>{divider}</text>}
        {exportMessage && <text fg={colors.success}>{exportMessage}</text>}
        <text fg={colors.info}>
          {layout === "compact"
            ? "[r] rerun [e] export [q] quit"
            : "[r] rerun  [c] connections  [e] export  [1-4] view  [q] quit"}
        </text>
      </box>
    );
  }

  return null;
}

function MetricContent({
  view,
  snapshot,
  history,
  result,
  width,
  layout,
}: {
  view: MetricView;
  snapshot?: StatsSnapshot;
  history: MetricHistory;
  result?: BenchmarkResult;
  width: number;
  layout: LayoutMode;
}) {
  switch (view) {
    case "rps":
      return <RpsView snapshot={snapshot} history={history} result={result} width={width} layout={layout} />;
    case "latency":
      return <LatencyView snapshot={snapshot} history={history} result={result} width={width} layout={layout} />;
    case "throughput":
      return <ThroughputView snapshot={snapshot} history={history} result={result} width={width} layout={layout} />;
    default:
      return <OverviewView snapshot={snapshot} history={history} result={result} width={width} layout={layout} />;
  }
}

const VIEW_ORDER: MetricView[] = ["overview", "rps", "latency", "throughput"];

export function BenchmarkTui() {
  const state = useTuiState();
  const { width, height: _height } = useTerminalDimensions();
  const layout = getLayoutMode(width);

  useKeyboard((key) => {
    if (state.phase === "running" || state.phase === "complete") {
      if (key.name === "1") updateTuiState({ view: "overview" });
      else if (key.name === "2") updateTuiState({ view: "rps" });
      else if (key.name === "3") updateTuiState({ view: "latency" });
      else if (key.name === "4") updateTuiState({ view: "throughput" });
      else if (key.name === "tab") {
        const currentIndex = VIEW_ORDER.indexOf(state.view);
        const nextIndex = (currentIndex + 1) % VIEW_ORDER.length;
        updateTuiState({ view: VIEW_ORDER[nextIndex] });
      }
    }

    if (state.phase === "running") {
      if (key.name === "q" && state.onStop) {
        state.onStop();
      }
    } else if (state.phase === "editing") {
      if (key.name === "escape") {
        updateTuiState({ phase: "complete", editInput: "" });
      } else if (key.name === "return") {
        const newConnections = parseInt(state.editInput, 10);
        if (newConnections > 0 && state.onUpdateConnections) {
          state.onUpdateConnections(newConnections);
        } else {
          updateTuiState({ phase: "complete", editInput: "" });
        }
      } else if (key.name === "backspace") {
        updateTuiState({ editInput: state.editInput.slice(0, -1) });
      } else if (/^[0-9]$/.test(key.name)) {
        const newInput = state.editInput + key.name;
        if (parseInt(newInput, 10) <= 10000) {
          updateTuiState({ editInput: newInput });
        }
      }
    } else if (state.phase === "exporting") {
      if (key.name === "j" && state.onExport) {
        state.onExport("json");
        updateTuiState({ phase: "complete" });
      } else if (key.name === "c" && state.onExport) {
        state.onExport("csv");
        updateTuiState({ phase: "complete" });
      } else if (key.name === "m" && state.onExport) {
        state.onExport("markdown");
        updateTuiState({ phase: "complete" });
      } else if (key.name === "escape") {
        updateTuiState({ phase: "complete" });
      }
    } else if (state.phase === "complete") {
      if (key.name === "r" && state.onRerun) {
        state.onRerun();
      } else if (key.name === "c") {
        updateTuiState({ phase: "editing", editInput: "" });
      } else if (key.name === "e") {
        updateTuiState({ phase: "exporting" });
      } else if (key.name === "q" && state.onQuit) {
        state.onQuit();
      }
    }
  });

  return (
    <box flexDirection="column" padding={1}>
      <Header
        url={state.url}
        method={state.method}
        connections={state.connections}
        duration={state.duration}
        layout={layout}
      />

      {state.phase === "warmup" && (
        <box border borderStyle="rounded" borderColor={colors.warning} padding={1} marginBottom={1}>
          <text fg={colors.warning}>Warming up...</text>
        </box>
      )}

      {(state.phase === "running" ||
        state.phase === "complete" ||
        state.phase === "exporting" ||
        state.phase === "editing") && (
        <>
          <TabBar currentView={state.view} layout={layout} />

          {state.phase === "running" && state.snapshot && (
            <RunningStatus
              progress={state.progress}
              elapsed={state.snapshot.elapsedMs}
              snapshot={state.snapshot}
              width={width}
            />
          )}

          {state.phase === "complete" && (
            <box
              border
              borderStyle="rounded"
              borderColor={colors.success}
              padding={1}
              marginBottom={1}
            >
              <text fg={colors.success}>✓ Benchmark complete</text>
            </box>
          )}

          <MetricContent
            view={state.view}
            snapshot={state.snapshot}
            history={state.history}
            result={state.result}
            width={width}
            layout={layout}
          />
        </>
      )}

      <CommandBar
        phase={state.phase}
        exportMessage={state.exportMessage}
        editInput={state.editInput}
        connections={state.connections}
        layout={layout}
      />

      {state.phase === "complete" && <UpgradeNotification status={state.upgradeStatus} />}
    </box>
  );
}
