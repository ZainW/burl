---
seo:
  title: burl - Modern HTTP Benchmarking CLI
  description: Fast, modern HTTP benchmarking with rich TUI output and LLM-optimized formats. Built with Bun.
---

::u-page-hero
---
orientation: horizontal
---

#title
Modern [HTTP Benchmarking]{.text-primary} for Developers.

#description
Fast, intuitive benchmarking with rich terminal output for humans and structured formats for AI agents. Ships as a single native executable.

#links
  :::u-button
  ---
  to: /getting-started/introduction
  size: xl
  trailing-icon: i-lucide-arrow-right
  ---
  Get Started
  :::

  :::u-button
  ---
  icon: i-simple-icons-github
  color: neutral
  variant: outline
  size: xl
  to: https://github.com/ZainW/burl
  target: _blank
  ---
  View on GitHub
  :::

#default
  :::prose-pre
  ---
  filename: terminal
  ---
  ```bash
  # Quick benchmark
  burl https://api.example.com/health -c 50 -d 30s

  # LLM-optimized output
  burl https://api.example.com/users --llm json
  ```
  :::
::

::u-page-section
#title
Why burl?

#features
  :::u-page-feature
  ---
  icon: i-lucide-zap
  ---
  #title
  Blazing Fast

  #description
  Built on Bun's native fetch with HTTP/1.1 and HTTP/2 support. Minimal overhead, maximum throughput.
  :::

  :::u-page-feature
  ---
  icon: i-lucide-terminal
  ---
  #title
  Rich Terminal UI

  #description
  Beautiful colored output with real-time progress, latency histograms, and percentile breakdowns.
  :::

  :::u-page-feature
  ---
  icon: i-lucide-bot
  ---
  #title
  LLM-Ready Output

  #description
  Structured JSON and Markdown output optimized for AI consumption with automatic issue detection and recommendations.
  :::

  :::u-page-feature
  ---
  icon: i-lucide-package
  ---
  #title
  Single Binary

  #description
  Ships as a portable native executable. No runtime dependencies, just download and run.
  :::

  :::u-page-feature
  ---
  icon: i-lucide-settings
  ---
  #title
  Highly Configurable

  #description
  Custom headers, request bodies, authentication, rate limiting, and warmup requests.
  :::

  :::u-page-feature
  ---
  icon: i-lucide-bar-chart-3
  ---
  #title
  Accurate Statistics

  #description
  HDR histogram-based latency tracking with precise percentile calculations (P50, P90, P95, P99).
  :::
::

::u-page-section
#title
Quick Example

#default
  :::prose-pre
  ---
  filename: terminal
  ---
  ```bash
  $ burl https://api.example.com/users -c 10 -d 5s

  ════════════════════════════════════════════════════════════
    burl - HTTP Benchmark Results
  ════════════════════════════════════════════════════════════

    Target
      URL:         https://api.example.com/users
      Method:      GET
      Connections: 10
      Duration:    5.02s

    Summary
      Total Requests:  523
      Successful:      523
      Requests/sec:    104.18
      Throughput:      89.23 KB/s

    Latency
      P50:    45.2ms
      P90:    78.3ms
      P95:    95.1ms
      P99:    142.7ms
  ```
  :::
::

::u-page-section
  :::u-page-c-t-a
  ---
  title: Ready to benchmark?
  description: Get started in under a minute with a single command.
  links:
    - label: Read the docs
      to: /getting-started/introduction
      trailing-icon: i-lucide-arrow-right
    - label: View examples
      to: /examples/load-testing
      variant: subtle
      icon: i-lucide-code
  ---
  :::
::
