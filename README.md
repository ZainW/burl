# burl

[![License: MIT-0](https://img.shields.io/badge/License-MIT--0-blue.svg)](https://opensource.org/licenses/MIT-0)
[![CI](https://github.com/ZainW/burl/workflows/CI/badge.svg)](https://github.com/ZainW/burl/actions)
[![Built with Bun](https://img.shields.io/badge/Built%20with-Bun-black?logo=bun)](https://bun.sh)

Modern HTTP benchmarking CLI tool built with Bun. Features rich terminal output for humans and LLM-optimized output for AI agents.

![burl demo](https://via.placeholder.com/800x400/1a1b26/7aa2f7?text=burl+TUI+Demo+%28Coming+Soon%29)
<!-- TODO: Replace with actual screenshot/GIF -->

## Features

- **Fast**: Built on Bun's native fetch with HTTP/1.1 and HTTP/2 support
- **Concurrent**: Configurable connection pool for load testing
- **Rich Output**: Colored terminal output with latency percentiles
- **LLM-Ready**: Structured JSON and Markdown output optimized for AI consumption
- **Portable**: Ships as a single native executable (no runtime required)
- **Flexible**: Supports custom headers, request bodies, and authentication

## Why burl?

Tired of complex build processes and cryptic output from traditional HTTP benchmarking tools? burl is a modern alternative designed for developer experience.

| Feature | burl | wrk | hey | ab | oha |
|---------|------|-----|-----|-----|-----|
| **Installation** | Single binary (no runtime) | Build from C source | Go install or binary | Usually pre-installed | Rust binary |
| **Real-time TUI** | ✅ Interactive, colorful | ❌ | ❌ | ❌ | ❌ |
| **LLM Integration** | ✅ JSON/Markdown output | ❌ | ❌ | ❌ | ❌ |
| **HTTP/2 Support** | ✅ | ✅ | ✅ | ❌ | ✅ |
| **Configuration** | CLI + config file | Lua scripts | CLI only | CLI only | CLI only |
| **Percentiles** | P50/P90/P95/P99 | Custom | P50/P75/P90/P99 | Basic | P50/P75/P90/P99 |
| **Built With** | Bun (TypeScript) | C + LuaJIT | Go | C | Rust |
| **Warmup Support** | ✅ | ❌ | ❌ | ❌ | ✅ |
| **Rate Limiting** | ✅ QPS control | ✅ | ✅ | ❌ | ✅ |

**Choose burl if you want:**
- Beautiful, human-readable output without sacrificing performance
- AI-ready structured output for automated analysis
- Zero-hassle installation (download and run)
- Modern CLI ergonomics with helpful error messages
- Integration with LLMs and AI workflows

## Installation

### Quick Install (Recommended)

```bash
curl -fsSL https://raw.githubusercontent.com/ZainW/burl/master/install.sh | bash
```

This automatically detects your OS/architecture and installs the latest release to `~/.burl/bin`.

### Manual Installation

Download pre-built binaries from [GitHub Releases](https://github.com/ZainW/burl/releases):

```bash
# macOS (Apple Silicon)
curl -L https://github.com/ZainW/burl/releases/latest/download/burl-darwin-arm64 -o burl
chmod +x burl && sudo mv burl /usr/local/bin/

# Linux (x64)
curl -L https://github.com/ZainW/burl/releases/latest/download/burl-linux-x64 -o burl
chmod +x burl && sudo mv burl /usr/local/bin/

# Windows (PowerShell)
Invoke-WebRequest https://github.com/ZainW/burl/releases/latest/download/burl-windows-x64.exe -OutFile burl.exe
```

### From Source

Requires [Bun](https://bun.sh) 1.3.5+

```bash
git clone https://github.com/ZainW/burl
cd burl
bun install
bun run build
# Binary will be in packages/cli/dist/
```

### Try Without Installing

```bash
# Using bunx (requires Bun)
bunx @burl/cli https://example.com

# Or run directly from source
git clone https://github.com/ZainW/burl && cd burl
bun install
bun run packages/cli/src/index.ts https://example.com
```

## Usage

### Quick Start

```bash
# Basic health check
burl https://api.example.com/health

# Load test with 50 concurrent connections for 30 seconds
burl https://api.example.com/users -c 50 -d 30s

# Quick 100-request test
burl https://api.github.com/zen -n 100
```

### Real-World Examples

```bash
# Test your Next.js API route
burl http://localhost:3000/api/users -c 10 -d 10s

# Benchmark GraphQL endpoint
burl https://api.spacex.land/graphql \
  -m POST \
  -b '{"query":"{ rockets { name } }"}' \
  -T application/json

# Load test with authentication
burl https://api.stripe.com/v1/customers \
  -a bearer:sk_test_123 \
  -c 20 -d 30s

# Test webhook endpoint with custom payload
burl https://webhook.site/abc-123 \
  -m POST \
  -B ./webhook-payload.json \
  -H "X-Signature: abc123"

# Compare HTTP/1.1 vs HTTP/2 performance
burl https://http2.golang.org/reqinfo --http1
burl https://http2.golang.org/reqinfo --http2
```

### CI/CD Integration

```bash
# Fail CI if P95 latency exceeds 100ms
burl https://staging.api.com/health --llm json | \
  jq -e '.latency_ms.p95 < 100'

# Generate performance report for PR comments
burl https://preview-${PR_NUMBER}.app.com \
  --llm markdown \
  -o performance-report.md
```

### LLM-Optimized Output

```bash
# Get structured JSON with automatic issue detection
burl https://api.example.com/health --llm json

# Generate markdown report for documentation
burl https://api.example.com/users --llm markdown -o docs/api-performance.md

# Pipe to AI for analysis
burl https://api.slow.com -d 30s --llm json | \
  llm "Analyze this performance data and suggest optimizations"
```

## CLI Options

```
burl <url> [options]

Connection Options:
  -c, --connections <n>    Concurrent connections (default: 10)
  -d, --duration <time>    Test duration, e.g., 10s, 1m (default: 10s)
  -n, --requests <n>       Total requests (alternative to duration)
  -q, --qps <n>            Rate limit in queries per second
  -t, --timeout <time>     Request timeout (default: 30s)
  -w, --warmup <n>         Warmup requests (default: 0)

Request Options:
  -m, --method <method>    HTTP method (default: GET)
  -H, --header <header>    Custom header (repeatable)
  -b, --body <data>        Request body
  -B, --body-file <file>   Request body from file
  -T, --content-type <ct>  Content-Type header

HTTP Version:
  --http1                  Force HTTP/1.1
  --http2                  Force HTTP/2

Authentication:
  -a, --auth <auth>        basic:user:pass or bearer:token

Output Options:
  --llm <format>           LLM output: json or markdown
  -o, --output <file>      Write results to file
  -f, --format <fmt>       Output: text, json, csv, markdown
  --no-tui                 Disable rich TUI
  --no-color               Disable colors

Other:
  -k, --insecure           Skip TLS verification
  --latency-correction     Enable latency correction
  --version, -V            Show version
  --help, -h               Show help
```

## Output Formats

### Text (Default)

Rich colored output with statistics:

```
════════════════════════════════════════════════════════════
  burl - HTTP Benchmark Results
════════════════════════════════════════════════════════════

  Target
    URL:         https://api.example.com/health
    Method:      GET
    Connections: 10
    Duration:    10.05s

  Summary
    Total Requests:  1,234
    Successful:      1,234
    Requests/sec:    122.89
    Throughput:      45.23 KB/s

  Latency
    P50:    12.4ms
    P90:    32.1ms
    P95:    45.2ms
    P99:    89.3ms
```

### LLM JSON

Structured output with automatic interpretation:

```json
{
  "$schema": "https://burl.dev/schema/v1/result.json",
  "summary": {
    "total_requests": 1234,
    "requests_per_second": 122.89,
    "success_rate": 1
  },
  "latency_ms": {
    "p50": 12.4,
    "p99": 89.3
  },
  "interpretation": {
    "performance": "good",
    "issues": [],
    "recommendations": []
  }
}
```

### LLM Markdown

Human-readable format optimized for LLM context:

```markdown
# HTTP Benchmark Results

## Summary
| Metric | Value |
|--------|-------|
| Total Requests | 1,234 |
| Success Rate | 100% |
| Requests/sec | 122.89 |

## Recommendations
1. Performance is good, no immediate issues detected
```

## Building Native Executables

```bash
# Build for current platform
bun run build

# Cross-platform builds
bun run build:linux-x64
bun run build:darwin-arm64
bun run build:windows-x64
```

## Configuration File

Save default options and create reusable profiles with a `.burlrc` config file:

```json
{
  "connections": 20,
  "duration": "30s",
  "http2": true,
  "profiles": {
    "quick": {
      "connections": 5,
      "duration": "5s"
    },
    "load-test": {
      "connections": 100,
      "duration": "60s"
    }
  }
}
```

Place `.burlrc` in your project directory or home directory (`~/.burlrc`). CLI arguments always override config values.

See [packages/cli/examples/README.md](packages/cli/examples/README.md) for detailed examples and use cases.

## Shell Completions

burl includes completion scripts for Bash, Zsh, and Fish. Install them for a better CLI experience with Tab completion for all options and flags.

```bash
# Bash
source packages/cli/completions/burl.bash

# Zsh
cp packages/cli/completions/_burl /usr/local/share/zsh/site-functions/

# Fish
cp packages/cli/completions/burl.fish ~/.config/fish/completions/
```

See [packages/cli/completions/README.md](packages/cli/completions/README.md) for detailed instructions.

## Requirements

- Bun 1.3.5 or later (for building from source)
- No runtime dependencies for pre-built binaries

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT-0 - Use however you want, no attribution required.
