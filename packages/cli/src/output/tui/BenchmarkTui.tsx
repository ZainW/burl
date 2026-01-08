import type { BenchmarkResult, StatsSnapshot } from "../../stats/types";
import type { DiagnosticResult } from "../../core/diagnose";
import { formatLatency, formatDuration } from "../../utils/time";
import { formatBytes, formatThroughput } from "../../utils/bytes";
import { VERSION } from "../../version";
import { createSignal, createEffect, onCleanup, For, Show } from "solid-js";
import { useKeyboard, useTerminalDimensions } from "@opentui/solid";
import { theme } from "./theme";

type Phase = "idle" | "warmup" | "running" | "complete" | "exporting" | "editing" | "diagnosing";
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
  onDiagnose?: () => void;
  exportMessage?: string;
  editInput: string;
  upgradeStatus: UpgradeStatus;
  diagnosticResult?: DiagnosticResult;
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

function useTuiState() {
  const [state, setState] = createSignal(globalState);

  createEffect(() => {
    const listener = () => setState({ ...globalState });
    listeners.add(listener);
    onCleanup(() => listeners.delete(listener));
  });

  return state;
}

function getLayoutMode(width: number): LayoutMode {
  if (width < 80) return "compact";
  if (width > 120) return "wide";
  return "normal";
}

const SPARKLINE_CHARS = ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"];

function Sparkline(props: { values: number[]; width: number; color?: string; label?: string }) {
  const color = () => props.color || colors.primary;

  return (
    <Show
      when={props.values.length > 0}
      fallback={<text fg={colors.textMuted}>Collecting data...</text>}
    >
      {(() => {
        const chartWidth = Math.max(20, props.width - 4);
        const recent = props.values.slice(-chartWidth);
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
            <Show when={props.label}>
              <text fg={colors.secondary}>
                {props.label}{" "}
                <Show when={trend}>
                  <span style={{ fg: trendColor }}>{trend}</span>
                </Show>
              </text>
            </Show>
            <text fg={color()}>{sparkline}</text>
            <box flexDirection="row" gap={2}>
              <text fg={colors.textMuted}>min: {formatValue(min, props.label)}</text>
              <text fg={colors.textMuted}>max: {formatValue(max, props.label)}</text>
              <text fg={colors.success}>now: {formatValue(curr, props.label)}</text>
            </box>
          </box>
        );
      })()}
    </Show>
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

function ProgressBar(props: { progress: number; width: number }) {
  const barWidth = () => Math.max(20, props.width - 10);
  const filled = () => Math.round(props.progress * barWidth());
  const empty = () => barWidth() - filled();
  const bar = () => "█".repeat(filled()) + "░".repeat(empty());
  const pct = () => Math.round(props.progress * 100);

  return (
    <text>
      <span style={{ fg: colors.primary }}>{bar()}</span>
      <span style={{ fg: colors.text }}> {pct()}%</span>
    </text>
  );
}

function Header(props: {
  url: string;
  method: string;
  connections: number;
  duration?: number;
  layout: LayoutMode;
}) {
  const truncatedUrl = () =>
    props.layout === "compact" && props.url.length > 40
      ? props.url.slice(0, 37) + "..."
      : props.url;

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
          <span style={{ fg: colors.primary }}>burl</span>
          <span style={{ fg: colors.textMuted }}> v{VERSION}</span>
        </text>
        <Show when={props.layout !== "compact"}>
          <text fg={colors.textMuted}>
            {props.connections} connection{props.connections === 1 ? "" : "s"}
            {props.duration ? ` · ${formatDuration(props.duration)}` : ""}
          </text>
        </Show>
      </box>
      <box flexDirection="row" gap={1} marginTop={1}>
        <text>
          <span style={{ fg: colors.warning }}>{props.method}</span>
        </text>
        <text fg={colors.text}>{truncatedUrl()}</text>
      </box>
    </box>
  );
}

function TabBar(props: { currentView: MetricView; layout: LayoutMode }) {
  const tabs = [
    { key: "1", view: "overview" as const, label: "Overview", short: "Ovw" },
    { key: "2", view: "rps" as const, label: "RPS", short: "RPS" },
    { key: "3", view: "latency" as const, label: "Latency", short: "Lat" },
    { key: "4", view: "throughput" as const, label: "Throughput", short: "Thr" },
  ];

  return (
    <box flexDirection="row" gap={2} marginBottom={1}>
      <For each={tabs}>
        {(tab) => (
          <text>
            <span
              style={{ fg: props.currentView === tab.view ? colors.primary : colors.textMuted }}
            >
              [{tab.key}] {props.layout === "compact" ? tab.short : tab.label}
            </span>
          </text>
        )}
      </For>
      <Show when={props.layout !== "compact"}>
        <text fg={colors.textDim}> │ [tab] cycle</text>
      </Show>
    </box>
  );
}

function StatRow(props: { label: string; value: string; color?: string }) {
  return (
    <box flexDirection="row">
      <text fg={colors.textMuted}>{props.label.padEnd(10)}</text>
      <text fg={props.color || colors.text}>{props.value}</text>
    </box>
  );
}

function BigNumber(props: { label: string; value: string; unit?: string; color?: string }) {
  const color = () => props.color || colors.primary;

  return (
    <box flexDirection="column" alignItems="center" paddingLeft={1} paddingRight={1}>
      <text>
        <span style={{ fg: color() }}>{props.value}</span>
        <Show when={props.unit}>
          <span style={{ fg: colors.textMuted }}>{props.unit}</span>
        </Show>
      </text>
      <text fg={colors.textMuted}>{props.label}</text>
    </box>
  );
}

function MetricsPanel(props: {
  title: string;
  rows: { label: string; value: string; color?: string }[];
}) {
  return (
    <box flexDirection="column" flexGrow={1}>
      <text fg={colors.secondary}>{props.title}</text>
      <box flexDirection="column" marginTop={1}>
        <For each={props.rows}>
          {(row) => <StatRow label={row.label} value={row.value} color={row.color} />}
        </For>
      </box>
    </box>
  );
}

function OverviewView(props: {
  snapshot?: StatsSnapshot;
  history: MetricHistory;
  result?: BenchmarkResult;
  width: number;
  layout: LayoutMode;
}) {
  const data = () => props.result || props.snapshot;

  return (
    <Show when={data()} fallback={<text fg={colors.textMuted}>Waiting for data...</text>}>
      {(_d) => {
        const isComplete = !!props.result;
        const chartWidth =
          props.layout === "wide" ? Math.floor((props.width - 8) / 2) : props.width - 6;

        const requestsRows = [
          {
            label: "Total",
            value: (
              props.result?.totalRequests ??
              props.snapshot?.totalRequests ??
              0
            ).toLocaleString(),
          },
          {
            label: "Success",
            value: (
              props.result?.successfulRequests ??
              props.snapshot?.successfulRequests ??
              0
            ).toLocaleString(),
            color: colors.success,
          },
          {
            label: "Failed",
            value: (
              props.result?.failedRequests ??
              props.snapshot?.failedRequests ??
              0
            ).toLocaleString(),
            color:
              (props.result?.failedRequests ?? props.snapshot?.failedRequests ?? 0) > 0
                ? colors.error
                : colors.textMuted,
          },
          {
            label: "RPS",
            value: (props.result?.requestsPerSecond ?? props.snapshot?.currentRps ?? 0).toFixed(1),
            color: colors.info,
          },
        ];

        const latencyRows = [
          {
            label: "P50",
            value: formatLatency(props.result?.latency.p50 ?? props.snapshot?.latencyP50 ?? 0),
          },
          {
            label: "P99",
            value: formatLatency(props.result?.latency.p99 ?? props.snapshot?.latencyP99 ?? 0),
          },
          { label: "Mean", value: formatLatency(props.result?.latency.mean ?? 0) },
          {
            label: "Max",
            value: formatLatency(props.result?.latency.max ?? 0),
            color: colors.warning,
          },
        ];

        const dataRows = [
          { label: "Total", value: formatBytes(props.result?.totalBytes ?? 0) },
          { label: "Throughput", value: formatThroughput(props.result?.bytesPerSecond ?? 0) },
          {
            label: "Duration",
            value: formatDuration(props.result?.durationMs ?? props.snapshot?.elapsedMs ?? 0),
          },
        ];

        const currentRps = props.result?.requestsPerSecond ?? props.snapshot?.currentRps ?? 0;
        const p99Latency = props.result?.latency.p99 ?? props.snapshot?.latencyP99 ?? 0;
        const successCount =
          props.result?.successfulRequests ?? props.snapshot?.successfulRequests ?? 0;
        const failedCount = props.result?.failedRequests ?? props.snapshot?.failedRequests ?? 0;

        return (
          <box flexDirection="column" gap={1}>
            <box
              flexDirection="row"
              justifyContent="space-around"
              border
              borderStyle="rounded"
              borderColor={colors.primary}
              padding={1}
            >
              <BigNumber label="RPS" value={currentRps.toFixed(0)} color={colors.success} />
              <BigNumber
                label="P99 Latency"
                value={formatLatency(p99Latency)}
                color={p99Latency > 100 ? colors.warning : colors.primary}
              />
              <BigNumber
                label="Success"
                value={successCount.toLocaleString()}
                color={colors.success}
              />
              <Show when={failedCount > 0}>
                <BigNumber
                  label="Failed"
                  value={failedCount.toLocaleString()}
                  color={colors.error}
                />
              </Show>
            </box>

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
              <Show when={props.layout !== "compact"}>
                <MetricsPanel title="Data" rows={dataRows} />
              </Show>
            </box>

            <Show when={props.history.rps.length > 1}>
              <box flexDirection={props.layout === "wide" ? "row" : "column"} gap={1}>
                <box
                  flexGrow={1}
                  border
                  borderStyle="rounded"
                  borderColor={colors.borderMuted}
                  padding={1}
                >
                  <Sparkline
                    values={props.history.rps}
                    label="RPS Trend"
                    color={colors.success}
                    width={chartWidth}
                  />
                </box>
                <Show when={props.layout === "wide"}>
                  <box
                    flexGrow={1}
                    border
                    borderStyle="rounded"
                    borderColor={colors.borderMuted}
                    padding={1}
                  >
                    <Sparkline
                      values={props.history.latencyP50}
                      label="P50 Latency"
                      color={colors.primary}
                      width={chartWidth}
                    />
                  </box>
                </Show>
              </box>
            </Show>

            <Show when={isComplete ? props.result : undefined}>
              {(result) => (
                <StatusCodes
                  statusCodes={result().statusCodes}
                  total={result().totalRequests}
                  width={props.width}
                />
              )}
            </Show>

            <Show
              when={
                isComplete && props.result?.failedRequests && props.result.failedRequests > 0
                  ? props.result
                  : undefined
              }
            >
              {(result) => (
                <ErrorsPanel
                  errors={result().errors}
                  total={result().failedRequests}
                  layout={props.layout}
                />
              )}
            </Show>
          </box>
        );
      }}
    </Show>
  );
}

function RpsView(props: {
  snapshot?: StatsSnapshot;
  history: MetricHistory;
  result?: BenchmarkResult;
  width: number;
  layout: LayoutMode;
}) {
  const currentRps = () => props.result?.requestsPerSecond ?? props.snapshot?.currentRps ?? 0;
  const avgRps = () =>
    props.history.rps.length > 0
      ? props.history.rps.reduce((a, b) => a + b, 0) / props.history.rps.length
      : 0;
  const maxRps = () => (props.history.rps.length > 0 ? Math.max(...props.history.rps) : 0);
  const minRps = () => (props.history.rps.length > 0 ? Math.min(...props.history.rps) : 0);
  const chartWidth = () => props.width - 6;

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
            <StatRow label="Current" value={currentRps().toFixed(1)} color={colors.success} />
            <StatRow label="Average" value={avgRps().toFixed(1)} />
            <StatRow label="Min" value={minRps().toFixed(1)} />
            <StatRow label="Max" value={maxRps().toFixed(1)} />
          </box>
        </box>
        <Show when={props.layout !== "compact"}>
          <box flexDirection="column">
            <text fg={colors.textMuted}>Variance: {(maxRps() - minRps()).toFixed(1)}</text>
            <text fg={colors.textMuted}>Samples: {props.history.rps.length}</text>
          </box>
        </Show>
      </box>

      <box border borderStyle="rounded" borderColor={colors.borderMuted} padding={1}>
        <Sparkline
          values={props.history.rps}
          label="RPS Over Time"
          color={colors.success}
          width={chartWidth()}
        />
      </box>

      <Show when={props.history.successRate.length > 0}>
        <box border borderStyle="rounded" borderColor={colors.borderMuted} padding={1}>
          <Sparkline
            values={props.history.successRate}
            label="Success Rate %"
            color={colors.primary}
            width={chartWidth()}
          />
        </box>
      </Show>
    </box>
  );
}

function LatencyView(props: {
  snapshot?: StatsSnapshot;
  history: MetricHistory;
  result?: BenchmarkResult;
  width: number;
  layout: LayoutMode;
}) {
  const chartWidth = () =>
    props.layout === "wide" ? Math.floor((props.width - 10) / 2) : props.width - 6;

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
          <box
            flexDirection={props.layout === "compact" ? "column" : "row"}
            gap={props.layout === "compact" ? 0 : 3}
            marginTop={1}
          >
            <box flexDirection="column">
              <StatRow label="Min" value={formatLatency(props.result?.latency.min ?? 0)} />
              <StatRow
                label="P50"
                value={formatLatency(props.result?.latency.p50 ?? props.snapshot?.latencyP50 ?? 0)}
              />
              <StatRow label="P75" value={formatLatency(props.result?.latency.p75 ?? 0)} />
              <StatRow label="P90" value={formatLatency(props.result?.latency.p90 ?? 0)} />
            </box>
            <box flexDirection="column">
              <StatRow label="P95" value={formatLatency(props.result?.latency.p95 ?? 0)} />
              <StatRow
                label="P99"
                value={formatLatency(props.result?.latency.p99 ?? props.snapshot?.latencyP99 ?? 0)}
                color={colors.warning}
              />
              <StatRow
                label="Max"
                value={formatLatency(props.result?.latency.max ?? 0)}
                color={colors.error}
              />
            </box>
          </box>
        </box>

        <Show when={props.layout !== "compact"}>
          <box flexDirection="column">
            <text fg={colors.secondary}>Statistics</text>
            <box flexDirection="column" marginTop={1}>
              <StatRow label="Mean" value={formatLatency(props.result?.latency.mean ?? 0)} />
              <StatRow label="StdDev" value={formatLatency(props.result?.latency.stddev ?? 0)} />
            </box>
          </box>
        </Show>
      </box>

      <box flexDirection={props.layout === "wide" ? "row" : "column"} gap={1}>
        <box flexGrow={1} border borderStyle="rounded" borderColor={colors.borderMuted} padding={1}>
          <Sparkline
            values={props.history.latencyP50}
            label="P50 Latency"
            color={colors.primary}
            width={chartWidth()}
          />
        </box>
        <box flexGrow={1} border borderStyle="rounded" borderColor={colors.borderMuted} padding={1}>
          <Sparkline
            values={props.history.latencyP99}
            label="P99 Latency"
            color={colors.error}
            width={chartWidth()}
          />
        </box>
      </box>

      <Show when={props.result}>
        {(result) => <LatencyHistogram result={result()} width={props.width} />}
      </Show>
    </box>
  );
}

function ThroughputView(props: {
  snapshot?: StatsSnapshot;
  history: MetricHistory;
  result?: BenchmarkResult;
  width: number;
  layout: LayoutMode;
}) {
  const avgThroughput = () =>
    props.history.throughput.length > 0
      ? props.history.throughput.reduce((a, b) => a + b, 0) / props.history.throughput.length
      : 0;
  const chartWidth = () => props.width - 6;

  return (
    <box flexDirection="column" gap={1}>
      <box border borderStyle="rounded" borderColor={colors.borderMuted} padding={1}>
        <box flexDirection="column">
          <text fg={colors.secondary}>Data Throughput</text>
          <box flexDirection="row" gap={3} marginTop={1}>
            <StatRow
              label="Current"
              value={formatThroughput(
                props.history.throughput[props.history.throughput.length - 1] ?? 0,
              )}
              color={colors.success}
            />
            <StatRow label="Average" value={formatThroughput(avgThroughput())} />
            <StatRow label="Total" value={formatBytes(props.result?.totalBytes ?? 0)} />
          </box>
        </box>
      </box>

      <box border borderStyle="rounded" borderColor={colors.borderMuted} padding={1}>
        <Sparkline
          values={props.history.throughput}
          label="Throughput Over Time"
          color={colors.warning}
          width={chartWidth()}
        />
      </box>
    </box>
  );
}

function LatencyHistogram(props: { result: BenchmarkResult; width: number }) {
  const buckets = [
    { label: "P50", value: props.result.latency.p50, color: colors.success },
    { label: "P75", value: props.result.latency.p75, color: colors.primary },
    { label: "P90", value: props.result.latency.p90, color: colors.info },
    { label: "P95", value: props.result.latency.p95, color: colors.warning },
    { label: "P99", value: props.result.latency.p99, color: colors.error },
  ];

  const maxValue = Math.max(...buckets.map((b) => b.value));
  const barWidth = Math.min(40, props.width - 25);

  return (
    <box border borderStyle="rounded" borderColor={colors.borderMuted} padding={1}>
      <box flexDirection="column">
        <text fg={colors.secondary}>Latency Distribution</text>
        <box flexDirection="column" marginTop={1}>
          <For each={buckets}>
            {(bucket) => {
              const barLen = Math.max(1, Math.round((bucket.value / maxValue) * barWidth));
              const bar = "▓".repeat(barLen);
              return (
                <box flexDirection="row">
                  <text fg={colors.textMuted}>{bucket.label.padEnd(5)}</text>
                  <text fg={bucket.color}>{bar}</text>
                  <text fg={colors.text}> {formatLatency(bucket.value)}</text>
                </box>
              );
            }}
          </For>
        </box>
      </box>
    </box>
  );
}

function StatusCodes(props: { statusCodes: Record<number, number>; total: number; width: number }) {
  const entries = () => Object.entries(props.statusCodes).sort(([a], [b]) => Number(a) - Number(b));

  return (
    <Show when={entries().length > 0 && props.total > 0}>
      {(() => {
        const barWidth = Math.max(20, Math.min(60, props.width - 10));
        const segments = entries().map(([code, count]) => {
          const codeNum = Number(code);
          const color =
            codeNum < 300 ? colors.success : codeNum < 400 ? colors.warning : colors.error;
          const ratio = count / props.total;
          const segmentWidth = Math.max(0, Math.round(ratio * barWidth));
          return { code, count, color, segmentWidth, ratio };
        });

        return (
          <box border borderStyle="rounded" borderColor={colors.borderMuted} padding={1}>
            <box flexDirection="column">
              <text fg={colors.secondary}>Status Codes</text>
              <box flexDirection="row" marginTop={1}>
                <text>[</text>
                <For each={segments}>
                  {(seg) => <text fg={seg.color}>{"█".repeat(seg.segmentWidth)}</text>}
                </For>
                <text>]</text>
              </box>
              <box flexDirection="row" gap={2} marginTop={1} flexWrap="wrap">
                <For each={segments}>
                  {(seg) => (
                    <text>
                      <span style={{ fg: seg.color }}>●</span>
                      <span style={{ fg: colors.text }}> {seg.code}</span>
                      <span style={{ fg: colors.textMuted }}>
                        : {seg.count.toLocaleString()} ({(seg.ratio * 100).toFixed(0)}%)
                      </span>
                    </text>
                  )}
                </For>
              </box>
            </box>
          </box>
        );
      })()}
    </Show>
  );
}

function ErrorsPanel(props: { errors: Record<string, number>; total: number; layout: LayoutMode }) {
  const entries = () => Object.entries(props.errors).sort(([, a], [, b]) => b - a);

  return (
    <Show when={entries().length > 0}>
      <box border borderStyle="rounded" borderColor={colors.error} padding={1}>
        <box flexDirection="column">
          <text fg={colors.error}>Errors ({props.total.toLocaleString()} total)</text>
          <box flexDirection="column" marginTop={1}>
            <For each={entries().slice(0, props.layout === "compact" ? 3 : 5)}>
              {([error, count]) => {
                const pct = ((count / props.total) * 100).toFixed(0);
                return (
                  <text fg={colors.textMuted}>
                    {error}: {count.toLocaleString()} ({pct}%)
                  </text>
                );
              }}
            </For>
          </box>
        </box>
      </box>
    </Show>
  );
}

function RunningStatus(props: {
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
          {formatDuration(props.elapsed)}
          {props.snapshot ? ` · ${props.snapshot.currentRps.toFixed(0)} req/s` : ""}
        </text>
      </box>
      <box marginTop={1}>
        <ProgressBar progress={props.progress} width={props.width - 4} />
      </box>
    </box>
  );
}

function UpgradeNotification(props: { status: UpgradeStatus }) {
  return (
    <Show when={props.status.status === "ready"}>
      <box marginTop={1}>
        <text fg={colors.success}>
          ✓ Updated to v{(props.status as { status: "ready"; version: string }).version} — restart
          burl to use
        </text>
      </box>
    </Show>
  );
}

function CommandBar(props: {
  phase: Phase;
  exportMessage?: string;
  editInput: string;
  connections: number;
  layout: LayoutMode;
}) {
  const divider = () => (props.layout === "compact" ? "" : "─".repeat(60));

  return (
    <>
      <Show when={props.phase === "running"}>
        <box marginTop={1}>
          <text fg={colors.textMuted}>
            {props.layout === "compact"
              ? "[q] stop"
              : "[q] stop early  [1-4] switch view  [tab] cycle"}
          </text>
        </box>
      </Show>

      <Show when={props.phase === "exporting"}>
        <box marginTop={1}>
          <text fg={colors.warning}>[j] JSON [c] CSV [m] Markdown [esc] cancel</text>
        </box>
      </Show>

      <Show when={props.phase === "editing"}>
        <box flexDirection="column" marginTop={1}>
          <Show when={divider()}>
            <text fg={colors.textMuted}>{divider()}</text>
          </Show>
          <box flexDirection="row" gap={1}>
            <text fg={colors.warning}>Connections:</text>
            <text fg={colors.text}>{props.editInput || props.connections}</text>
            <text fg={colors.primary}>█</text>
          </box>
          <text fg={colors.textMuted}>
            {props.layout === "compact"
              ? "[0-9] type [enter] confirm [esc] cancel"
              : "[0-9] type  [backspace] delete  [enter] confirm  [esc] cancel"}
          </text>
        </box>
      </Show>

      <Show when={props.phase === "complete"}>
        <box flexDirection="column" marginTop={1}>
          <Show when={divider()}>
            <text fg={colors.textMuted}>{divider()}</text>
          </Show>
          <Show when={props.exportMessage}>
            <text fg={colors.success}>{props.exportMessage}</text>
          </Show>
          <text fg={colors.info}>
            {props.layout === "compact"
              ? "[r] rerun [d] diagnose [e] export [q] quit"
              : "[r] rerun  [d] diagnose  [c] connections  [e] export  [1-4] view  [q] quit"}
          </text>
        </box>
      </Show>

      <Show when={props.phase === "diagnosing"}>
        <box marginTop={1}>
          <text fg={colors.textMuted}>Running connection diagnostics...</text>
        </box>
      </Show>
    </>
  );
}

function DiagnosticsTimingBar(props: {
  label: string;
  value: number;
  maxValue: number;
  skipLabel?: string;
  barColor?: string;
}) {
  const barWidth = 25;
  const barColor = () => props.barColor || colors.primary;

  return (
    <Show
      when={!(props.skipLabel && props.value === 0)}
      fallback={
        <box flexDirection="row">
          <text fg={colors.textMuted}>{props.label.padEnd(14)}</text>
          <text fg={colors.textMuted}>{`(${props.skipLabel})`.padEnd(barWidth + 2)}</text>
          <text fg={colors.textMuted}>{"0.00ms".padStart(10)}</text>
        </box>
      }
    >
      {(() => {
        const filled =
          props.maxValue > 0
            ? Math.max(1, Math.round((props.value / props.maxValue) * barWidth))
            : 0;
        const empty = barWidth - filled;
        const bar = "█".repeat(filled) + "░".repeat(empty);

        return (
          <box flexDirection="row">
            <text fg={colors.textMuted}>{props.label.padEnd(14)}</text>
            <text fg={barColor()}>{bar}</text>
            <text fg={colors.text}>{` ${formatLatency(props.value).padStart(10)}`}</text>
          </box>
        );
      })()}
    </Show>
  );
}

function DiagnosticsView(props: {
  diagnosticResult: DiagnosticResult;
  url: string;
  method: string;
}) {
  const maxTime = () =>
    Math.max(
      props.diagnosticResult.cold.dnsLookupMs,
      props.diagnosticResult.cold.tcpTlsConnectMs,
      props.diagnosticResult.cold.ttfbMs,
      props.diagnosticResult.cold.contentTransferMs,
      props.diagnosticResult.warm.ttfbMs,
      props.diagnosticResult.warm.contentTransferMs,
    );

  return (
    <box flexDirection="column" gap={1}>
      <box border borderStyle="rounded" borderColor={colors.primary} padding={1}>
        <box flexDirection="column">
          <text fg={colors.secondary}>Cold Connection (first request)</text>
          <box flexDirection="column" marginTop={1}>
            <DiagnosticsTimingBar
              label="DNS Lookup"
              value={props.diagnosticResult.cold.dnsLookupMs}
              maxValue={maxTime()}
              barColor={colors.info}
            />
            <DiagnosticsTimingBar
              label="TCP + TLS"
              value={props.diagnosticResult.cold.tcpTlsConnectMs}
              maxValue={maxTime()}
              barColor={colors.warning}
            />
            <DiagnosticsTimingBar
              label="TTFB"
              value={props.diagnosticResult.cold.ttfbMs}
              maxValue={maxTime()}
              barColor={colors.success}
            />
            <DiagnosticsTimingBar
              label="Transfer"
              value={props.diagnosticResult.cold.contentTransferMs}
              maxValue={maxTime()}
              barColor={colors.primary}
            />
            <box flexDirection="row" marginTop={1}>
              <text fg={colors.text}>{"Total".padEnd(14)}</text>
              <text fg={colors.text}>{formatLatency(props.diagnosticResult.cold.totalMs)}</text>
            </box>
          </box>
        </box>
      </box>

      <box border borderStyle="rounded" borderColor={colors.success} padding={1}>
        <box flexDirection="column">
          <text fg={colors.secondary}>Warm Connection (reused)</text>
          <box flexDirection="column" marginTop={1}>
            <DiagnosticsTimingBar
              label="DNS Lookup"
              value={props.diagnosticResult.warm.dnsLookupMs}
              maxValue={maxTime()}
              skipLabel="cached"
            />
            <DiagnosticsTimingBar
              label="TCP + TLS"
              value={props.diagnosticResult.warm.tcpTlsConnectMs}
              maxValue={maxTime()}
              skipLabel="keep-alive"
              barColor={colors.warning}
            />
            <DiagnosticsTimingBar
              label="TTFB"
              value={props.diagnosticResult.warm.ttfbMs}
              maxValue={maxTime()}
              barColor={colors.success}
            />
            <DiagnosticsTimingBar
              label="Transfer"
              value={props.diagnosticResult.warm.contentTransferMs}
              maxValue={maxTime()}
              barColor={colors.primary}
            />
            <box flexDirection="row" marginTop={1}>
              <text fg={colors.text}>{"Total".padEnd(14)}</text>
              <text fg={colors.text}>{formatLatency(props.diagnosticResult.warm.totalMs)}</text>
            </box>
          </box>
        </box>
      </box>

      <box border borderStyle="rounded" borderColor={colors.borderMuted} padding={1}>
        <box flexDirection="column">
          <text fg={colors.secondary}>Connection Details</text>
          <box flexDirection="column" marginTop={1}>
            <StatRow label="Target" value={`${props.method} ${props.url}`} />
            <StatRow label="Remote" value={props.diagnosticResult.details.remoteAddress} />
            <StatRow label="Protocol" value={props.diagnosticResult.details.protocol} />
            <Show when={props.diagnosticResult.details.tlsVersion}>
              {(tls) => <StatRow label="TLS" value={tls()} />}
            </Show>
            <Show when={props.diagnosticResult.details.serverHeader}>
              {(server) => <StatRow label="Server" value={server()} />}
            </Show>
          </box>
        </box>
      </box>
    </box>
  );
}

function MetricContent(props: {
  view: MetricView;
  snapshot?: StatsSnapshot;
  history: MetricHistory;
  result?: BenchmarkResult;
  width: number;
  layout: LayoutMode;
}) {
  return (
    <>
      <Show when={props.view === "rps"}>
        <RpsView
          snapshot={props.snapshot}
          history={props.history}
          result={props.result}
          width={props.width}
          layout={props.layout}
        />
      </Show>
      <Show when={props.view === "latency"}>
        <LatencyView
          snapshot={props.snapshot}
          history={props.history}
          result={props.result}
          width={props.width}
          layout={props.layout}
        />
      </Show>
      <Show when={props.view === "throughput"}>
        <ThroughputView
          snapshot={props.snapshot}
          history={props.history}
          result={props.result}
          width={props.width}
          layout={props.layout}
        />
      </Show>
      <Show when={props.view === "overview"}>
        <OverviewView
          snapshot={props.snapshot}
          history={props.history}
          result={props.result}
          width={props.width}
          layout={props.layout}
        />
      </Show>
    </>
  );
}

const VIEW_ORDER: MetricView[] = ["overview", "rps", "latency", "throughput"];

export function BenchmarkTui() {
  const state = useTuiState();
  const dims = useTerminalDimensions();
  const layout = () => getLayoutMode(dims().width);

  useKeyboard((key) => {
    const s = state();
    if (s.phase === "running" || s.phase === "complete") {
      if (key.name === "1") updateTuiState({ view: "overview" });
      else if (key.name === "2") updateTuiState({ view: "rps" });
      else if (key.name === "3") updateTuiState({ view: "latency" });
      else if (key.name === "4") updateTuiState({ view: "throughput" });
      else if (key.name === "tab") {
        const currentIndex = VIEW_ORDER.indexOf(s.view);
        const nextIndex = (currentIndex + 1) % VIEW_ORDER.length;
        updateTuiState({ view: VIEW_ORDER[nextIndex] });
      }
    }

    if (s.phase === "running") {
      if (key.name === "q" && s.onStop) {
        s.onStop();
      }
    } else if (s.phase === "editing") {
      if (key.name === "escape") {
        updateTuiState({ phase: "complete", editInput: "" });
      } else if (key.name === "return") {
        const newConnections = parseInt(s.editInput, 10);
        if (newConnections > 0 && s.onUpdateConnections) {
          s.onUpdateConnections(newConnections);
        } else {
          updateTuiState({ phase: "complete", editInput: "" });
        }
      } else if (key.name === "backspace") {
        updateTuiState({ editInput: s.editInput.slice(0, -1) });
      } else if (/^[0-9]$/.test(key.name)) {
        const newInput = s.editInput + key.name;
        if (parseInt(newInput, 10) <= 10000) {
          updateTuiState({ editInput: newInput });
        }
      }
    } else if (s.phase === "exporting") {
      if (key.name === "j" && s.onExport) {
        s.onExport("json");
        updateTuiState({ phase: "complete" });
      } else if (key.name === "c" && s.onExport) {
        s.onExport("csv");
        updateTuiState({ phase: "complete" });
      } else if (key.name === "m" && s.onExport) {
        s.onExport("markdown");
        updateTuiState({ phase: "complete" });
      } else if (key.name === "escape") {
        updateTuiState({ phase: "complete" });
      }
    } else if (s.phase === "complete") {
      if (key.name === "r" && s.onRerun) {
        s.onRerun();
      } else if (key.name === "d" && s.onDiagnose) {
        s.onDiagnose();
      } else if (key.name === "c") {
        updateTuiState({ phase: "editing", editInput: "" });
      } else if (key.name === "e") {
        updateTuiState({ phase: "exporting" });
      } else if (key.name === "q" && s.onQuit) {
        s.onQuit();
      }
    } else if (s.phase === "diagnosing" && key.name === "escape") {
      updateTuiState({ phase: "complete" });
    }
  });

  return (
    <box flexDirection="column" padding={1}>
      <Header
        url={state().url}
        method={state().method}
        connections={state().connections}
        duration={state().duration}
        layout={layout()}
      />

      <Show when={state().phase === "warmup"}>
        <box border borderStyle="rounded" borderColor={colors.warning} padding={1} marginBottom={1}>
          <text fg={colors.warning}>Warming up...</text>
        </box>
      </Show>

      <Show
        when={
          state().phase === "running" ||
          state().phase === "complete" ||
          state().phase === "exporting" ||
          state().phase === "editing"
        }
      >
        <TabBar currentView={state().view} layout={layout()} />

        <Show when={state().phase === "running" ? state().snapshot : undefined}>
          {(snapshot) => (
            <RunningStatus
              progress={state().progress}
              elapsed={snapshot().elapsedMs}
              snapshot={snapshot()}
              width={dims().width}
            />
          )}
        </Show>

        <Show when={state().phase === "complete"}>
          <box
            border
            borderStyle="rounded"
            borderColor={colors.success}
            padding={1}
            marginBottom={1}
          >
            <text fg={colors.success}>✓ Benchmark complete</text>
          </box>
        </Show>

        <MetricContent
          view={state().view}
          snapshot={state().snapshot}
          history={state().history}
          result={state().result}
          width={dims().width}
          layout={layout()}
        />
      </Show>

      <CommandBar
        phase={state().phase}
        exportMessage={state().exportMessage}
        editInput={state().editInput}
        connections={state().connections}
        layout={layout()}
      />

      <Show when={state().phase === "diagnosing" ? state().diagnosticResult : undefined}>
        {(result) => (
          <DiagnosticsView diagnosticResult={result()} url={state().url} method={state().method} />
        )}
      </Show>

      <Show when={state().phase === "complete"}>
        <UpgradeNotification status={state().upgradeStatus} />
      </Show>
    </box>
  );
}
