import { createCliRenderer, type CliRenderer } from '@opentui/core'
import { createRoot } from '@opentui/react'
import type { BenchmarkResult, StatsSnapshot } from '../../stats/types'
import { BenchmarkTui, updateTuiState, getTuiState } from './BenchmarkTui'

let renderer: CliRenderer | null = null
let root: ReturnType<typeof createRoot> | null = null

export async function initTui(url: string, method: string, connections: number): Promise<void> {
  renderer = await createCliRenderer({
    exitOnCtrlC: true,
  })
  
  root = createRoot(renderer)
  
  updateTuiState({
    phase: 'idle',
    url,
    method,
    connections,
    progress: 0,
    snapshot: undefined,
    result: undefined,
  })
  
  root.render(<BenchmarkTui />)
}

export function tuiSetWarmup(): void {
  updateTuiState({ phase: 'warmup' })
}

export function tuiSetRunning(): void {
  updateTuiState({ phase: 'running' })
}

export function tuiUpdateProgress(snapshot: StatsSnapshot, progress: number): void {
  updateTuiState({ snapshot, progress })
}

export function tuiSetComplete(result: BenchmarkResult): void {
  updateTuiState({ phase: 'complete', result, progress: 1 })
}

export function tuiDestroy(): void {
  if (renderer) {
    renderer.destroy()
    renderer = null
    root = null
  }
}

export function isTuiActive(): boolean {
  return renderer !== null
}

export { updateTuiState, getTuiState }
