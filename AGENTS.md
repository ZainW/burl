# PROJECT KNOWLEDGE BASE

**Generated:** 2025-12-29
**Commit:** a6475e0
**Branch:** feat/docs-site

## OVERVIEW

HTTP benchmarking CLI (`burl`) built with Bun. Rich TUI + LLM-optimized output formats. Compiles to single native executable. Documentation site at burl.wania.app.

## STRUCTURE

```
burl/
├── packages/
│   ├── cli/           # Main CLI - all code lives here
│   │   ├── src/
│   │   │   ├── core/      # BenchmarkEngine, http-client, auth, types
│   │   │   ├── output/    # All output formatters
│   │   │   │   ├── ansi/  # Simple colored terminal output
│   │   │   │   ├── export/# json, csv, markdown, llm exports
│   │   │   │   └── tui/   # React-based interactive TUI (@opentui)
│   │   │   ├── stats/     # StatsCollector, latency percentiles
│   │   │   └── utils/     # bytes, colors, time, tty helpers
│   │   └── test/          # Mirrors src/ structure
│   └── docs/          # Nuxt 4 docs site (@nuxt/content, @nuxt/ui)
│       ├── app/           # Vue pages and layouts
│       └── content/       # Markdown docs (19 pages, 6 sections)
├── package.json       # Monorepo root - workspace scripts
└── tsconfig.json      # Project references only
```

## WHERE TO LOOK

| Task                   | Location                                | Notes                   |
| ---------------------- | --------------------------------------- | ----------------------- |
| Add CLI flag           | `packages/cli/src/cli.ts`               | Uses `cleye` library    |
| Add output format      | `packages/cli/src/output/export/`       | Follow existing pattern |
| Modify benchmark logic | `packages/cli/src/core/engine.ts`       | Worker pool pattern     |
| Add latency metric     | `packages/cli/src/stats/`               | collector.ts + types.ts |
| Change TUI display     | `packages/cli/src/output/tui/`          | React components        |
| Add LLM interpretation | `packages/cli/src/output/export/llm.ts` | analyzeResult()         |

## CODE MAP

| Symbol            | Type      | Location                      | Role                                         |
| ----------------- | --------- | ----------------------------- | -------------------------------------------- |
| `BenchmarkEngine` | Class     | `core/engine.ts`              | Orchestrates worker pool, progress callbacks |
| `StatsCollector`  | Class     | `stats/collector.ts`          | HDR histogram, percentile calculations       |
| `makeRequest`     | Function  | `core/http-client.ts`         | Single request with Bun.nanoseconds() timing |
| `BenchmarkConfig` | Interface | `core/types.ts`               | Runtime config after CLI parsing             |
| `CliOptions`      | Interface | `core/types.ts`               | Raw CLI args before transformation           |
| `BenchmarkResult` | Interface | `stats/types.ts`              | Final output data structure                  |
| `BenchmarkTui`    | Component | `output/tui/BenchmarkTui.tsx` | Main TUI React component                     |

### Module Flow

```
cli.ts (parseArgs) ──> index.ts (main)
                           │
              ┌────────────┼────────────┐
              │            │            │
         TUI mode     CLI mode     Export mode
              │            │            │
              └────────────┼────────────┘
                           │
                    BenchmarkEngine
                           │
            ┌──────────────┼──────────────┐
            │              │              │
      makeRequest    StatsCollector    ProgressCallback
            │              │              │
            └──────────────┴──────────────┘
                           │
                    BenchmarkResult
                           │
              ┌────────────┼────────────┐
              │            │            │
          renderResult  exportLlm*  exportJson/Csv/Md
```

## CONVENTIONS

- **Bun-first**: Uses `Bun.nanoseconds()`, `Bun.file()`, `Bun.write()` - not Node APIs
- **Type imports**: Always `import type { X }` for type-only imports
- **No barrel exports**: Direct imports from specific files, no index.ts re-exports
- **Duration strings**: Human-readable (`10s`, `1m`) parsed via `parseDuration()`

## ANTI-PATTERNS (THIS PROJECT)

- **Node imports**: Use `node:` protocol if needed (`node:process`) - enforced by oxlint
- **Any types**: `typescript/no-explicit-any` is warn - avoid adding new ones
- **Circular imports**: `import/no-cycle` enforced
- **Console in non-CLI**: Allowed in tests and CLI, avoid in library code

## UNIQUE STYLES

- **Global TUI state**: `BenchmarkTui.tsx` uses module-level state with listener pattern (not React context)
- **Error categorization**: `http-client.ts` normalizes errors to fixed strings (`timeout`, `connection_refused`, etc.)
- **LLM output**: Includes `interpretation` field with auto-generated `issues[]` and `recommendations[]`

## COMMANDS

```bash
# Development
bun run dev https://example.com   # Run directly
bun test                          # Run tests

# Quality
bun run typecheck                 # tsgo --noEmit (native TS)
bun run lint                      # oxlint with strict rules
bun run format                    # oxfmt --write
bun run check                     # All checks (typecheck + lint + format)

# Build
bun run build                     # Single binary for current platform
bun run build:all                 # Cross-platform (linux/darwin/windows x64/arm64)

# CI
bun run ci                        # check + test (what CI runs)

# Docs
bun run docs:dev                  # Local dev server (localhost:3000)
bun run docs:build                # Production build
bun run docs:generate             # Static site generation
```

## TOOLS

| Tool             | Purpose       | Config                                  |
| ---------------- | ------------- | --------------------------------------- |
| `oxlint`         | Linting       | `.oxlintrc.json` - strict, many plugins |
| `oxfmt`          | Formatting    | `.oxfmtrc.json`                         |
| `tsgo`           | Type checking | Native TS compiler (faster than tsc)    |
| `cleye`          | CLI parsing   | Flag definitions in cli.ts              |
| `@opentui/react` | TUI framework | React-based terminal UI                 |

## NOTES

- **No `tsc`**: Uses `tsgo` (TypeScript native preview) - much faster
- **Two packages**: CLI code in `packages/cli`, docs site in `packages/docs`
- **HDR Histogram**: Uses `hdr-histogram-js` for accurate percentile calculations
- **HTTP/3**: Flag exists (`--http3`) but marked experimental
- **Exit codes**: Non-zero if any requests failed (`result.failedRequests > 0`)
- **TUI detection**: `shouldUseTui()` checks TTY, `--no-tui`, `--quiet`, export modes
