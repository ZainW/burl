import type { BenchmarkResult, StatsSnapshot } from '../../stats/types'
import { formatLatency, formatDuration } from '../../utils/time'
import { formatBytes, formatThroughput } from '../../utils/bytes'
import { useState, useEffect } from 'react'
import { useKeyboard } from '@opentui/react'

type Phase = 'idle' | 'warmup' | 'running' | 'complete' | 'exporting' | 'editing'
type MetricView = 'overview' | 'rps' | 'latency' | 'throughput'

interface MetricHistory {
  rps: number[]
  latencyP50: number[]
  latencyP99: number[]
  throughput: number[]
  successRate: number[]
  timestamps: number[]
}

interface TuiState {
  phase: Phase
  view: MetricView
  url: string
  method: string
  connections: number
  duration?: number
  snapshot?: StatsSnapshot
  progress: number
  result?: BenchmarkResult
  history: MetricHistory
  onStop?: () => void
  onRerun?: () => void
  onExport?: (format: 'json' | 'csv' | 'markdown') => void
  onQuit?: () => void
  onUpdateConnections?: (connections: number) => void
  exportMessage?: string
  editInput: string
}

const emptyHistory: MetricHistory = {
  rps: [],
  latencyP50: [],
  latencyP99: [],
  throughput: [],
  successRate: [],
  timestamps: [],
}

let globalState: TuiState = {
  phase: 'idle',
  view: 'overview',
  url: '',
  method: 'GET',
  connections: 1,
  progress: 0,
  history: { ...emptyHistory },
  editInput: '',
}

let listeners: Set<() => void> = new Set()

export function updateTuiState(partial: Partial<TuiState>) {
  globalState = { ...globalState, ...partial }
  listeners.forEach(fn => fn())
}

export function getTuiState(): TuiState {
  return globalState
}

export function resetTuiState() {
  globalState = {
    ...globalState,
    phase: 'idle',
    view: 'overview',
    progress: 0,
    snapshot: undefined,
    result: undefined,
    history: { ...emptyHistory },
    exportMessage: undefined,
    editInput: '',
  }
  listeners.forEach(fn => fn())
}

export function appendMetricHistory(snapshot: StatsSnapshot) {
  const h = globalState.history
  const total = snapshot.successfulRequests + snapshot.failedRequests
  const successRate = total > 0 ? (snapshot.successfulRequests / total) * 100 : 100
  
  globalState.history = {
    rps: [...h.rps, snapshot.currentRps],
    latencyP50: [...h.latencyP50, snapshot.latencyP50],
    latencyP99: [...h.latencyP99, snapshot.latencyP99],
    throughput: [...h.throughput, snapshot.bytesPerSecond || 0],
    successRate: [...h.successRate, successRate],
    timestamps: [...h.timestamps, snapshot.elapsedMs],
  }
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

const SPARKLINE_CHARS = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█']

function Sparkline({ values, width = 50, color = '#7aa2f7', label }: { 
  values: number[], width?: number, color?: string, label?: string 
}) {
  if (values.length === 0) return <text fg="#565f89">Collecting data...</text>
  
  const recent = values.slice(-width)
  const min = Math.min(...recent)
  const max = Math.max(...recent)
  const range = max - min || 1
  
  const sparkline = recent.map(v => {
    const normalized = (v - min) / range
    const index = Math.min(Math.floor(normalized * SPARKLINE_CHARS.length), SPARKLINE_CHARS.length - 1)
    return SPARKLINE_CHARS[index]
  }).join('')
  
  const curr = recent[recent.length - 1] ?? 0
  
  return (
    <box flexDirection="column">
      {label && <text fg="#7dcfff">{label}</text>}
      <text fg={color}>{sparkline}</text>
      <box flexDirection="row" gap={3}>
        <text fg="#565f89">min: {formatValue(min, label)}</text>
        <text fg="#565f89">max: {formatValue(max, label)}</text>
        <text fg="#9ece6a">current: {formatValue(curr, label)}</text>
      </box>
    </box>
  )
}

function formatValue(value: number, label?: string): string {
  if (label?.toLowerCase().includes('latency')) {
    return formatLatency(value)
  }
  if (label?.toLowerCase().includes('throughput')) {
    return formatThroughput(value)
  }
  if (label?.toLowerCase().includes('rate') || label?.toLowerCase().includes('%')) {
    return value.toFixed(1) + '%'
  }
  return value.toFixed(1)
}

function ProgressBar({ progress, width = 40 }: { progress: number, width?: number }) {
  const filled = Math.round(progress * width)
  const empty = width - filled
  const bar = '█'.repeat(filled) + '░'.repeat(empty)
  const pct = Math.round(progress * 100)
  return <text fg="#7aa2f7">{bar} {pct}%</text>
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

function TabBar({ currentView, phase }: { currentView: MetricView, phase: Phase }) {
  const tabs: { key: string, view: MetricView, label: string }[] = [
    { key: '1', view: 'overview', label: 'Overview' },
    { key: '2', view: 'rps', label: 'RPS' },
    { key: '3', view: 'latency', label: 'Latency' },
    { key: '4', view: 'throughput', label: 'Throughput' },
  ]
  
  return (
    <box flexDirection="row" gap={1} marginBottom={1}>
      {tabs.map(tab => (
        <text key={tab.key}>
          <span fg={currentView === tab.view ? '#7aa2f7' : '#565f89'}>
            [{tab.key}] {tab.label}
          </span>
        </text>
      ))}
      <text fg="#565f89"> | [tab] cycle</text>
    </box>
  )
}

function StatsTable({ rows }: { rows: { label: string, value: string, color?: string }[] }) {
  return (
    <box flexDirection="column">
      {rows.map((row, i) => (
        <text key={i}>
          <span fg="#565f89">{row.label.padEnd(12)}</span>
          <span fg={row.color || '#c0caf5'}>{row.value}</span>
        </text>
      ))}
    </box>
  )
}

function OverviewView({ snapshot, history, result }: { 
  snapshot?: StatsSnapshot, history: MetricHistory, result?: BenchmarkResult 
}) {
  const data = result || snapshot
  if (!data) return <text fg="#565f89">Waiting for data...</text>
  
  const isComplete = !!result
  
  return (
    <box flexDirection="column">
      <box flexDirection="row" gap={4}>
        <box flexDirection="column">
          <text fg="#7dcfff">Requests</text>
          <StatsTable rows={[
            { label: 'Total', value: (result?.totalRequests ?? snapshot?.totalRequests ?? 0).toLocaleString() },
            { label: 'Success', value: (result?.successfulRequests ?? snapshot?.successfulRequests ?? 0).toLocaleString(), color: '#9ece6a' },
            { label: 'Failed', value: (result?.failedRequests ?? snapshot?.failedRequests ?? 0).toLocaleString(), color: (result?.failedRequests ?? snapshot?.failedRequests ?? 0) > 0 ? '#f7768e' : '#565f89' },
            { label: 'RPS', value: (result?.requestsPerSecond ?? snapshot?.currentRps ?? 0).toFixed(1) },
          ]} />
        </box>
        
        <box flexDirection="column">
          <text fg="#7dcfff">Latency</text>
          <StatsTable rows={[
            { label: 'P50', value: formatLatency(result?.latency.p50 ?? snapshot?.latencyP50 ?? 0) },
            { label: 'P99', value: formatLatency(result?.latency.p99 ?? snapshot?.latencyP99 ?? 0) },
            { label: 'Mean', value: formatLatency(result?.latency.mean ?? 0) },
            { label: 'Max', value: formatLatency(result?.latency.max ?? 0) },
          ]} />
        </box>
        
        <box flexDirection="column">
          <text fg="#7dcfff">Data</text>
          <StatsTable rows={[
            { label: 'Total', value: formatBytes(result?.totalBytes ?? 0) },
            { label: 'Throughput', value: formatThroughput(result?.bytesPerSecond ?? 0) },
            { label: 'Duration', value: formatDuration(result?.durationMs ?? snapshot?.elapsedMs ?? 0) },
          ]} />
        </box>
      </box>
      
      {history.rps.length > 1 && (
        <box flexDirection="column" marginTop={1}>
          <Sparkline values={history.rps} label="RPS Trend" color="#9ece6a" />
        </box>
      )}
      
      {isComplete && result && <StatusCodes statusCodes={result.statusCodes} total={result.totalRequests} />}
    </box>
  )
}

function RpsView({ snapshot, history, result }: { 
  snapshot?: StatsSnapshot, history: MetricHistory, result?: BenchmarkResult 
}) {
  const currentRps = result?.requestsPerSecond ?? snapshot?.currentRps ?? 0
  const avgRps = history.rps.length > 0 
    ? history.rps.reduce((a, b) => a + b, 0) / history.rps.length 
    : 0
  const maxRps = history.rps.length > 0 ? Math.max(...history.rps) : 0
  const minRps = history.rps.length > 0 ? Math.min(...history.rps) : 0
  
  return (
    <box flexDirection="column">
      <text fg="#7dcfff">Requests Per Second</text>
      
      <box flexDirection="row" gap={4} marginTop={1}>
        <StatsTable rows={[
          { label: 'Current', value: currentRps.toFixed(1), color: '#9ece6a' },
          { label: 'Average', value: avgRps.toFixed(1) },
          { label: 'Min', value: minRps.toFixed(1) },
          { label: 'Max', value: maxRps.toFixed(1) },
        ]} />
        
        <box flexDirection="column">
          <text fg="#565f89">Variance: {(maxRps - minRps).toFixed(1)}</text>
          <text fg="#565f89">Samples: {history.rps.length}</text>
        </box>
      </box>
      
      <box marginTop={1}>
        <Sparkline values={history.rps} label="RPS Over Time" color="#9ece6a" width={60} />
      </box>
      
      {history.successRate.length > 0 && (
        <box marginTop={1}>
          <Sparkline values={history.successRate} label="Success Rate %" color="#7aa2f7" width={60} />
        </box>
      )}
    </box>
  )
}

function LatencyView({ snapshot, history, result }: { 
  snapshot?: StatsSnapshot, history: MetricHistory, result?: BenchmarkResult 
}) {
  return (
    <box flexDirection="column">
      <text fg="#7dcfff">Latency Distribution</text>
      
      <box flexDirection="row" gap={4} marginTop={1}>
        <box flexDirection="column">
          <text fg="#565f89">Percentiles</text>
          <StatsTable rows={[
            { label: 'Min', value: formatLatency(result?.latency.min ?? 0) },
            { label: 'P50', value: formatLatency(result?.latency.p50 ?? snapshot?.latencyP50 ?? 0) },
            { label: 'P75', value: formatLatency(result?.latency.p75 ?? 0) },
            { label: 'P90', value: formatLatency(result?.latency.p90 ?? 0) },
            { label: 'P95', value: formatLatency(result?.latency.p95 ?? 0) },
            { label: 'P99', value: formatLatency(result?.latency.p99 ?? snapshot?.latencyP99 ?? 0) },
            { label: 'Max', value: formatLatency(result?.latency.max ?? 0) },
          ]} />
        </box>
        
        <box flexDirection="column">
          <text fg="#565f89">Statistics</text>
          <StatsTable rows={[
            { label: 'Mean', value: formatLatency(result?.latency.mean ?? 0) },
            { label: 'StdDev', value: formatLatency(result?.latency.stddev ?? 0) },
          ]} />
        </box>
      </box>
      
      <box marginTop={1}>
        <Sparkline values={history.latencyP50} label="P50 Latency Over Time" color="#7aa2f7" width={60} />
      </box>
      
      <box marginTop={1}>
        <Sparkline values={history.latencyP99} label="P99 Latency Over Time" color="#f7768e" width={60} />
      </box>
      
      {result && <LatencyHistogram result={result} />}
    </box>
  )
}

function ThroughputView({ snapshot, history, result }: { 
  snapshot?: StatsSnapshot, history: MetricHistory, result?: BenchmarkResult 
}) {
  const avgThroughput = history.throughput.length > 0 
    ? history.throughput.reduce((a, b) => a + b, 0) / history.throughput.length 
    : 0
  
  return (
    <box flexDirection="column">
      <text fg="#7dcfff">Data Throughput</text>
      
      <box flexDirection="row" gap={4} marginTop={1}>
        <StatsTable rows={[
          { label: 'Current', value: formatThroughput(history.throughput[history.throughput.length - 1] ?? 0), color: '#9ece6a' },
          { label: 'Average', value: formatThroughput(avgThroughput) },
          { label: 'Total Data', value: formatBytes(result?.totalBytes ?? 0) },
        ]} />
      </box>
      
      <box marginTop={1}>
        <Sparkline values={history.throughput} label="Throughput Over Time" color="#e0af68" width={60} />
      </box>
    </box>
  )
}

function LatencyHistogram({ result }: { result: BenchmarkResult }) {
  const buckets = [
    { label: 'P50', value: result.latency.p50, color: '#9ece6a' },
    { label: 'P75', value: result.latency.p75, color: '#7aa2f7' },
    { label: 'P90', value: result.latency.p90, color: '#7dcfff' },
    { label: 'P95', value: result.latency.p95, color: '#e0af68' },
    { label: 'P99', value: result.latency.p99, color: '#f7768e' },
  ]
  
  const maxValue = Math.max(...buckets.map(b => b.value))
  const barWidth = 30
  
  return (
    <box flexDirection="column" marginTop={1}>
      <text fg="#565f89">Histogram</text>
      {buckets.map(bucket => {
        const width = Math.max(1, Math.round((bucket.value / maxValue) * barWidth))
        const bar = '▓'.repeat(width)
        return (
          <box key={bucket.label} flexDirection="row">
            <text fg="#565f89" style={{ width: 4 }}>{bucket.label}</text>
            <text fg={bucket.color}> {bar}</text>
            <text fg="#c0caf5"> {formatLatency(bucket.value)}</text>
          </box>
        )
      })}
    </box>
  )
}

function StatusCodes({ statusCodes, total }: { statusCodes: Record<number, number>, total: number }) {
  const entries = Object.entries(statusCodes).sort(([a], [b]) => Number(a) - Number(b))
  if (entries.length === 0) return null
  
  return (
    <box flexDirection="column" marginTop={1}>
      <text fg="#7dcfff">Status Codes</text>
      <box flexDirection="row" gap={2}>
        {entries.map(([code, count]) => {
          const codeNum = Number(code)
          const color = codeNum < 300 ? '#9ece6a' : codeNum < 400 ? '#e0af68' : '#f7768e'
          const pct = ((count / total) * 100).toFixed(0)
          return (
            <text key={code}>
              <span fg={color}>{code}</span>
              <span fg="#565f89">: {count} ({pct}%)</span>
            </text>
          )
        })}
      </box>
    </box>
  )
}

function RunningStatus({ progress, elapsed }: { progress: number, elapsed: number }) {
  return (
    <box flexDirection="column" marginBottom={1}>
      <box flexDirection="row" gap={2}>
        <ProgressBar progress={progress} />
        <text fg="#565f89">{formatDuration(elapsed)}</text>
      </box>
    </box>
  )
}

function CommandBar({ phase, exportMessage, editInput, connections }: { 
  phase: Phase, exportMessage?: string, editInput: string, connections: number 
}) {
  if (phase === 'running') {
    return (
      <box marginTop={1}>
        <text fg="#565f89">[q] stop early  [1-4] switch view  [tab] cycle</text>
      </box>
    )
  }
  
  if (phase === 'exporting') {
    return (
      <box marginTop={1}>
        <text fg="#e0af68">[j] JSON  [c] CSV  [m] Markdown  [esc] cancel</text>
      </box>
    )
  }
  
  if (phase === 'editing') {
    return (
      <box flexDirection="column" marginTop={1}>
        <text fg="#565f89">{'─'.repeat(60)}</text>
        <box flexDirection="row" gap={1}>
          <text fg="#e0af68">Connections:</text>
          <text fg="#c0caf5">{editInput || connections}</text>
          <text fg="#7aa2f7">█</text>
        </box>
        <text fg="#565f89">[0-9] type  [backspace] delete  [enter] confirm  [esc] cancel</text>
      </box>
    )
  }
  
  if (phase === 'complete') {
    return (
      <box flexDirection="column" marginTop={1}>
        <text fg="#565f89">{'─'.repeat(60)}</text>
        {exportMessage && <text fg="#9ece6a">{exportMessage}</text>}
        <text fg="#7dcfff">[r] rerun  [c] connections  [e] export  [1-4] view  [q] quit</text>
      </box>
    )
  }
  
  return null
}

function MetricContent({ view, snapshot, history, result }: {
  view: MetricView, snapshot?: StatsSnapshot, history: MetricHistory, result?: BenchmarkResult
}) {
  switch (view) {
    case 'rps':
      return <RpsView snapshot={snapshot} history={history} result={result} />
    case 'latency':
      return <LatencyView snapshot={snapshot} history={history} result={result} />
    case 'throughput':
      return <ThroughputView snapshot={snapshot} history={history} result={result} />
    default:
      return <OverviewView snapshot={snapshot} history={history} result={result} />
  }
}

const VIEW_ORDER: MetricView[] = ['overview', 'rps', 'latency', 'throughput']

export function BenchmarkTui() {
  const state = useTuiState()
  
  useKeyboard((key) => {
    if (state.phase === 'running' || state.phase === 'complete') {
      if (key.name === '1') updateTuiState({ view: 'overview' })
      else if (key.name === '2') updateTuiState({ view: 'rps' })
      else if (key.name === '3') updateTuiState({ view: 'latency' })
      else if (key.name === '4') updateTuiState({ view: 'throughput' })
      else if (key.name === 'tab') {
        const currentIndex = VIEW_ORDER.indexOf(state.view)
        const nextIndex = (currentIndex + 1) % VIEW_ORDER.length
        updateTuiState({ view: VIEW_ORDER[nextIndex] })
      }
    }
    
    if (state.phase === 'running') {
      if (key.name === 'q' && state.onStop) {
        state.onStop()
      }
    } else if (state.phase === 'editing') {
      if (key.name === 'escape') {
        updateTuiState({ phase: 'complete', editInput: '' })
      } else if (key.name === 'return') {
        const newConnections = parseInt(state.editInput, 10)
        if (newConnections > 0 && state.onUpdateConnections) {
          state.onUpdateConnections(newConnections)
        } else {
          updateTuiState({ phase: 'complete', editInput: '' })
        }
      } else if (key.name === 'backspace') {
        updateTuiState({ editInput: state.editInput.slice(0, -1) })
      } else if (/^[0-9]$/.test(key.name)) {
        const newInput = state.editInput + key.name
        if (parseInt(newInput, 10) <= 10000) {
          updateTuiState({ editInput: newInput })
        }
      }
    } else if (state.phase === 'exporting') {
      if (key.name === 'j' && state.onExport) {
        state.onExport('json')
        updateTuiState({ phase: 'complete' })
      } else if (key.name === 'c' && state.onExport) {
        state.onExport('csv')
        updateTuiState({ phase: 'complete' })
      } else if (key.name === 'm' && state.onExport) {
        state.onExport('markdown')
        updateTuiState({ phase: 'complete' })
      } else if (key.name === 'escape') {
        updateTuiState({ phase: 'complete' })
      }
    } else if (state.phase === 'complete') {
      if (key.name === 'r' && state.onRerun) {
        state.onRerun()
      } else if (key.name === 'c') {
        updateTuiState({ phase: 'editing', editInput: '' })
      } else if (key.name === 'e') {
        updateTuiState({ phase: 'exporting' })
      } else if (key.name === 'q' && state.onQuit) {
        state.onQuit()
      }
    }
  })
  
  return (
    <box flexDirection="column" padding={1}>
      <Header url={state.url} method={state.method} connections={state.connections} />
      
      {state.phase === 'warmup' && (
        <text fg="#e0af68">Warming up...</text>
      )}
      
      {(state.phase === 'running' || state.phase === 'complete' || state.phase === 'exporting' || state.phase === 'editing') && (
        <>
          <TabBar currentView={state.view} phase={state.phase} />
          
          {state.phase === 'running' && state.snapshot && (
            <RunningStatus progress={state.progress} elapsed={state.snapshot.elapsedMs} />
          )}
          
          {state.phase === 'complete' && (
            <box marginBottom={1}>
              <text fg="#9ece6a">✓ Benchmark complete</text>
            </box>
          )}
          
          <MetricContent 
            view={state.view} 
            snapshot={state.snapshot} 
            history={state.history} 
            result={state.result} 
          />
        </>
      )}
      
      <CommandBar 
        phase={state.phase} 
        exportMessage={state.exportMessage} 
        editInput={state.editInput}
        connections={state.connections}
      />
    </box>
  )
}
