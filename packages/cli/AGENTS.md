# CLI Package

HTTP benchmarking CLI implementation. See root AGENTS.md for project overview.

## STRUCTURE

```
src/
├── cli.ts         # parseArgs(), buildConfig() - cleye flag definitions
├── index.ts       # main() entry, mode routing (TUI/CLI/export)
├── core/          # Benchmark execution
│   ├── engine.ts      # BenchmarkEngine - worker pool orchestration
│   ├── http-client.ts # makeRequest() - single request with timing
│   ├── auth.ts        # parseAuth(), applyAuth() - basic/bearer
│   └── types.ts       # BenchmarkConfig, CliOptions, AuthConfig
├── output/        # Result formatting
│   ├── ansi/simple.ts # Colored terminal output
│   ├── tui/*.tsx      # React TUI components (@opentui)
│   └── export/*.ts    # json, csv, markdown, llm formats
├── stats/         # Metrics collection
│   ├── collector.ts   # StatsCollector - percentiles, time series
│   └── types.ts       # BenchmarkResult, LatencyStats, StatsSnapshot
└── utils/         # Helpers (bytes, colors, time, tty)
```

## WHERE TO LOOK (CLI-SPECIFIC)

| Task | File | Function/Class |
|------|------|----------------|
| Add CLI flag | `cli.ts` | `parseArgs()` flags object |
| Transform flag to config | `cli.ts` | `buildConfig()` |
| Change worker behavior | `core/engine.ts` | `runWorker()` |
| Add error category | `core/http-client.ts` | `categorizeError()` |
| Add latency percentile | `stats/collector.ts` | `calculateLatencyStats()` |
| Add TUI keyboard shortcut | `output/tui/BenchmarkTui.tsx` | `useKeyboard()` handler |
| Add LLM recommendation | `output/export/llm.ts` | `analyzeResult()` |

## DATA FLOW

```
CliOptions (raw strings)
    │ buildConfig()
    ▼
BenchmarkConfig (parsed)
    │ BenchmarkEngine.run()
    ▼
StatsCollector.record(RequestResult)
    │ finalize()
    ▼
BenchmarkResult
    │
    ├─> renderResult()      # ANSI text
    ├─> exportLlmJson()     # LLM JSON with interpretation
    ├─> exportLlmMarkdown() # LLM Markdown
    └─> exportJson/Csv/Md() # Plain exports
```

## TESTING

```
test/
├── cli.test.ts         # parseArgs edge cases
├── core/auth.test.ts   # Auth header generation
├── output/*.test.ts    # Export format validation
├── stats/collector.test.ts # Percentile math
└── utils/*.test.ts     # Unit tests for helpers
```

- Tests mirror `src/` structure
- Run: `bun test` (from cli/ or root)
- No mocks for Bun APIs - tests use real implementations

## OUTPUT MODES

| Mode | Trigger | Handler |
|------|---------|---------|
| TUI | Default (TTY) | `runTuiMode()` - React components |
| ANSI | `--no-tui` or non-TTY | `runCliMode()` - simple.ts |
| Export | `--format` or `--output` | `exportJson/Csv/Md()` |
| LLM | `--llm json\|markdown` | `exportLlmJson/Markdown()` |

## ANTI-PATTERNS (CLI-SPECIFIC)

- **Blocking in workers**: `runWorker()` must stay async
- **Direct process.exit()**: Only in main(), catch handlers - let engine cleanup
- **Mutating BenchmarkConfig**: Create new object for reruns
