import { createCliRenderer, type CliRenderer } from "@opentui/core";
import { createRoot } from "@opentui/react";
import type { BenchmarkResult, StatsSnapshot } from "../../stats/types";
import {
  BenchmarkTui,
  updateTuiState,
  getTuiState,
  resetTuiState,
  appendMetricHistory,
  setUpgradeStatus,
} from "./BenchmarkTui";
import { backgroundUpgrade } from "../../commands/auto-upgrade";
import { VERSION } from "../../version";

let renderer: CliRenderer | null = null;
let root: ReturnType<typeof createRoot> | null = null;

interface TuiCallbacks {
  onStop?: () => void;
  onRerun?: () => void;
  onExport?: (format: "json" | "csv" | "markdown") => void;
  onQuit?: () => void;
  onUpdateConnections?: (connections: number) => void;
  onDiagnose?: () => void;
}

export async function initTui(
  url: string,
  method: string,
  connections: number,
  duration: number | undefined,
  callbacks: TuiCallbacks,
): Promise<void> {
  renderer = await createCliRenderer({
    exitOnCtrlC: false,
  });

  root = createRoot(renderer);

  updateTuiState({
    phase: "idle",
    view: "overview",
    url,
    method,
    connections,
    duration,
    progress: 0,
    snapshot: undefined,
    result: undefined,
    exportMessage: undefined,
    editInput: "",
    ...callbacks,
  });

  root.render(<BenchmarkTui />);

  if (!VERSION.includes("dev")) {
    backgroundUpgrade(setUpgradeStatus);
  }
}

export function tuiSetWarmup(): void {
  updateTuiState({ phase: "warmup" });
}

export function tuiSetRunning(): void {
  resetTuiState();
  updateTuiState({ phase: "running" });
}

export function tuiUpdateProgress(snapshot: StatsSnapshot, progress: number): void {
  appendMetricHistory(snapshot);
  updateTuiState({ snapshot, progress });
}

export function tuiSetComplete(result: BenchmarkResult): void {
  updateTuiState({ phase: "complete", result, progress: 1 });
}

export function tuiSetExportMessage(message: string): void {
  updateTuiState({ exportMessage: message });
}

export function tuiUpdateConnections(connections: number): void {
  updateTuiState({ connections, editInput: "" });
}

export function tuiSetDiagnosing(): void {
  updateTuiState({ phase: "diagnosing" });
}

export function tuiSetDiagnosticResult(
  result: Parameters<typeof updateTuiState>[0]["diagnosticResult"],
): void {
  updateTuiState({ phase: "diagnosing", diagnosticResult: result });
}

export function tuiDestroy(): void {
  if (renderer) {
    renderer.destroy();
    renderer = null;
    root = null;
  }
}

export function isTuiActive(): boolean {
  return renderer !== null;
}

export { updateTuiState, getTuiState, resetTuiState };
