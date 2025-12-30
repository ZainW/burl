# burl

Modern HTTP benchmarking CLI tool built with Bun. Features rich terminal output for humans and LLM-optimized output for AI agents.

## Features

- **Fast**: Built on Bun's native fetch with HTTP/1.1 and HTTP/2 support
- **Concurrent**: Configurable connection pool for load testing
- **Rich Output**: Colored terminal output with latency percentiles
- **LLM-Ready**: Structured JSON and Markdown output optimized for AI consumption
- **Portable**: Ships as a single native executable (no runtime required)
- **Flexible**: Supports custom headers, request bodies, and authentication

## Installation

### From Source

```bash
git clone https://github.com/yourname/burl
cd burl
bun install
bun run build
```

### Run Without Installing

```bash
bun run src/index.ts https://example.com
```

## Usage

### Basic Benchmark

```bash
burl https://api.example.com/health
```

### With Concurrency and Duration

```bash
burl https://api.example.com/users -c 50 -d 30s
```

### POST Request with JSON Body

```bash
burl https://api.example.com/users \
  -m POST \
  -b '{"name":"test"}' \
  -T application/json
```

### With Authentication

```bash
# Bearer token
burl https://api.example.com/secure -a bearer:$TOKEN

# Basic auth
burl https://api.example.com/secure -a basic:username:password
```

### LLM-Optimized Output

```bash
# JSON output with interpretation and recommendations
burl https://api.example.com/health --llm json

# Markdown output for documentation
burl https://api.example.com/health --llm markdown
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

## Requirements

- Bun 1.3.5 or later

## License

MIT-0 - Use however you want, no attribution required.
