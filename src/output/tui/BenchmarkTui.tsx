import type { BenchmarkResult, StatsSnapshot } from '../../stats/types'
import { formatLatency, formatDuration } from '../../utils/time'
import { formatBytes, formatThroughput } from '../../utils/bytes'
import { useState, useEffect } from 'react'

interface TuiState {
  phase: 'idle' | 'warmup' | 'running' | 'complete'
  url: string
  method: string
  connections: number
  snapshot?: StatsSnapshot
  progress: number
  result?: BenchmarkResult
}

let globalState: TuiState = {
  phase: 'idle',
  url: '',
  method: 'GET',
  connections: 1,
  progress: 0,
}

let listeners: Set<() => void> = new Set()

export function updateTuiState(partial: Partial<TuiState>) {
  globalState = { ...globalState, ...partial }
  listeners.forEach(fn => fn())
}

export function getTuiState(): TuiState {
  return globalState
}

function useTuiState(): TuiState {
  const [state, setState] = useState(globalState)
  
  useEffect(() => {
    const listener = () => setState({ ...globalState })
    listeners.add(listener)
    return () => { listeners.delete(listener) }
  }, [])
  
  return state
}

function ProgressBar({ progress, width = 30 }: { progress: number, width?: number }) {
  const filled = Math.round(progress * width)
  const empty = width - filled
  const bar = '█'.repeat(filled) + '░'.repeat(empty)
  const pct = Math.round(progress * 100)
  return <text>{bar} {pct}%</text>
}

function Header({ url, method, connections }: { url: string, method: string, connections: number }) {
  return (
    <box flexDirection="column" marginBottom={1}>
      <text>
        <span fg="#7aa2f7">burl</span>
        <span fg="#565f89"> v0.1.0</span>
      </text>
      <text>
        <span fg="#7dcfff">Target: </span>
        <span fg="#c0caf5">{method} {url}</span>
      </text>
      <text>
        <span fg="#7dcfff">Connections: </span>
        <span fg="#c0caf5">{connections}</span>
      </text>
    </box>
  )
}

function RunningView({ snapshot, progress }: { snapshot: StatsSnapshot, progress: number }) {
  return (
    <box flexDirection="column" marginTop={1}>
      <box flexDirection="row" gap={2}>
        <ProgressBar progress={progress} />
        <text fg="#565f89">{formatDuration(snapshot.elapsedMs)}</text>
      </box>
      
      <box flexDirection="row" gap={3} marginTop={1}>
        <text>
          <span fg="#7dcfff">RPS: </span>
          <span fg="#c0caf5">{snapshot.currentRps.toFixed(1)}</span>
        </text>
        <text>
          <span fg="#7dcfff">P50: </span>
          <span fg="#c0caf5">{formatLatency(snapshot.latencyP50)}</span>
        </text>
        <text>
          <span fg="#7dcfff">P99: </span>
          <span fg="#c0caf5">{formatLatency(snapshot.latencyP99)}</span>
        </text>
      </box>
      
      <box flexDirection="row" gap={3} marginTop={1}>
        <text>
          <span fg="#9ece6a">OK: </span>
          <span fg="#c0caf5">{snapshot.successfulRequests.toLocaleString()}</span>
        </text>
        {snapshot.failedRequests > 0 && (
          <text>
            <span fg="#f7768e">ERR: </span>
            <span fg="#c0caf5">{snapshot.failedRequests.toLocaleString()}</span>
          </text>
        )}
      </box>
    </box>
  )
}

function LatencyHistogram({ result }: { result: BenchmarkResult }) {
  const buckets = [
    { label: 'P50', value: result.latency.p50 },
    { label: 'P75', value: result.latency.p75 },
    { label: 'P90', value: result.latency.p90 },
    { label: 'P95', value: result.latency.p95 },
    { label: 'P99', value: result.latency.p99 },
  ]
  
  const maxValue = Math.max(...buckets.map(b => b.value))
  const barWidth = 20
  
  return (
    <box flexDirection="column" marginTop={1}>
      <text fg="#7dcfff">Latency Distribution</text>
      {buckets.map(bucket => {
        const width = Math.max(1, Math.round((bucket.value / maxValue) * barWidth))
        const bar = '▓'.repeat(width)
        return (
          <box key={bucket.label} flexDirection="row">
            <text style={{ width: 5 }} fg="#565f89">{bucket.label}</text>
            <text fg="#7aa2f7">{bar}</text>
            <text fg="#c0caf5"> {formatLatency(bucket.value)}</text>
          </box>
        )
      })}
    </box>
  )
}

function StatusCodes({ statusCodes, total }: { statusCodes: Record<number, number>, total: number }) {
  const entries = Object.entries(statusCodes)
    .sort(([a], [b]) => Number(a) - Number(b))
  
  if (entries.length === 0) return null
  
  return (
    <box flexDirection="column" marginTop={1}>
      <text fg="#7dcfff">Status Codes</text>
      {entries.map(([code, count]) => {
        const codeNum = Number(code)
        const color = codeNum < 300 ? '#9ece6a' : codeNum < 400 ? '#e0af68' : '#f7768e'
        const pct = ((count / total) * 100).toFixed(1)
        return (
          <text key={code}>
            <span fg={color}>{code}</span>
            <span fg="#c0caf5">: {count.toLocaleString()} ({pct}%)</span>
          </text>
        )
      })}
    </box>
  )
}

function ResultView({ result }: { result: BenchmarkResult }) {
  return (
    <box flexDirection="column">
      <text fg="#7aa2f7">{'═'.repeat(50)}</text>
      <text fg="#7aa2f7">  Benchmark Results</text>
      <text fg="#7aa2f7">{'═'.repeat(50)}</text>
      
      <box flexDirection="column" marginTop={1}>
        <text fg="#7dcfff">Summary</text>
        <text>
          <span fg="#565f89">  Total:     </span>
          <span fg="#c0caf5">{result.totalRequests.toLocaleString()} requests</span>
        </text>
        <text>
          <span fg="#565f89">  Success:   </span>
          <span fg="#9ece6a">{result.successfulRequests.toLocaleString()}</span>
        </text>
        {result.failedRequests > 0 && (
          <text>
            <span fg="#565f89">  Failed:    </span>
            <span fg="#f7768e">{result.failedRequests.toLocaleString()}</span>
          </text>
        )}
        <text>
          <span fg="#565f89">  RPS:       </span>
          <span fg="#c0caf5">{result.requestsPerSecond.toFixed(2)}</span>
        </text>
        <text>
          <span fg="#565f89">  Throughput:</span>
          <span fg="#c0caf5"> {formatThroughput(result.bytesPerSecond)}</span>
        </text>
        <text>
          <span fg="#565f89">  Data:      </span>
          <span fg="#c0caf5">{formatBytes(result.totalBytes)}</span>
        </text>
      </box>
      
      <box flexDirection="column" marginTop={1}>
        <text fg="#7dcfff">Latency</text>
        <text>
          <span fg="#565f89">  Min:    </span>
          <span fg="#c0caf5">{formatLatency(result.latency.min)}</span>
        </text>
        <text>
          <span fg="#565f89">  Max:    </span>
          <span fg="#c0caf5">{formatLatency(result.latency.max)}</span>
        </text>
        <text>
          <span fg="#565f89">  Mean:   </span>
          <span fg="#c0caf5">{formatLatency(result.latency.mean)}</span>
        </text>
        <text>
          <span fg="#565f89">  StdDev: </span>
          <span fg="#c0caf5">{formatLatency(result.latency.stddev)}</span>
        </text>
      </box>
      
      <LatencyHistogram result={result} />
      <StatusCodes statusCodes={result.statusCodes} total={result.totalRequests} />
      
      <text fg="#565f89" marginTop={1}>{'─'.repeat(50)}</text>
    </box>
  )
}

export function BenchmarkTui() {
  const state = useTuiState()
  
  return (
    <box flexDirection="column" padding={1}>
      <Header url={state.url} method={state.method} connections={state.connections} />
      
      {state.phase === 'warmup' && (
        <text fg="#e0af68">Warming up...</text>
      )}
      
      {state.phase === 'running' && state.snapshot && (
        <RunningView snapshot={state.snapshot} progress={state.progress} />
      )}
      
      {state.phase === 'complete' && state.result && (
        <ResultView result={state.result} />
      )}
    </box>
  )
}
