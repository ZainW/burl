#!/usr/bin/env bun

import { parseArgs, buildConfig } from './cli';
import { BenchmarkEngine } from './core/engine';
import { setColorEnabled } from './utils/colors';
import { renderHeader, renderProgress, renderResult } from './output/ansi/simple';
import { exportJson } from './output/export/json';
import { exportCsv } from './output/export/csv';
import { exportMarkdown } from './output/export/markdown';
import { exportLlmJson, exportLlmMarkdown } from './output/export/llm';
import { shouldUseTui, isInteractiveTerminal } from './utils/tty';
import type { BenchmarkConfig } from './core/types';
import type { BenchmarkResult } from './stats/types';

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    printHelp();
    process.exit(0);
  }

  if (args.includes('--version') || args.includes('-V')) {
    console.log('burl v0.1.0');
    process.exit(0);
  }

  const options = parseArgs(args);

  if (options.noColor) {
    setColorEnabled(false);
  }

  if (!options.url.startsWith('http://') && !options.url.startsWith('https://')) {
    options.url = `https://${options.url}`;
  }

  const config = buildConfig(options);

  const isExportMode = Boolean(options.llm || options.output || options.format !== 'text');
  const useTui = shouldUseTui(options.noTui || options.quiet || isExportMode, false);
  const useAnsiProgress = !useTui && process.stdout.isTTY && !options.quiet && !options.llm;

  if (useTui) {
    await runTuiMode(config, options);
  } else {
    await runCliMode(config, options, useAnsiProgress);
  }
}

async function runTuiMode(config: BenchmarkConfig, options: ReturnType<typeof parseArgs>): Promise<void> {
  const { 
    initTui, 
    tuiSetRunning, 
    tuiUpdateProgress, 
    tuiSetComplete, 
    tuiSetExportMessage,
    tuiUpdateConnections,
    tuiDestroy 
  } = await import('./output/tui/index.tsx');

  let currentConfig = { ...config };
  let engine = new BenchmarkEngine(currentConfig);
  let currentResult: BenchmarkResult | null = null;
  let shouldExit = false;
  let exportCount = 0;

  const runBenchmark = async () => {
    engine = new BenchmarkEngine(currentConfig);
    tuiSetRunning();

    engine.setProgressCallback((snapshot, progress) => {
      tuiUpdateProgress(snapshot, progress);
    });

    try {
      currentResult = await engine.run();
      tuiSetComplete(currentResult);
    } catch (err) {
      tuiDestroy();
      console.error('Error:', err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  };

  const handleExport = async (format: 'json' | 'csv' | 'markdown') => {
    if (!currentResult) return;

    exportCount++;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const ext = format === 'markdown' ? 'md' : format;
    const filename = options.output || `burl-${timestamp}.${ext}`;

    let output: string;
    switch (format) {
      case 'json':
        output = exportJson(currentResult);
        break;
      case 'csv':
        output = exportCsv(currentResult);
        break;
      case 'markdown':
        output = exportMarkdown(currentResult);
        break;
    }

    await Bun.write(filename, output);
    tuiSetExportMessage(`Exported to ${filename}`);
  };

  const handleQuit = () => {
    shouldExit = true;
    tuiDestroy();
    const exitCode = currentResult && currentResult.failedRequests > 0 ? 1 : 0;
    process.exit(exitCode);
  };

  const handleUpdateConnections = (connections: number) => {
    currentConfig = { ...currentConfig, connections };
    tuiUpdateConnections(connections);
    runBenchmark();
  };

  await initTui(
    config.url,
    config.method,
    config.connections,
    config.durationMs,
    {
      onStop: () => engine.stop(),
      onRerun: () => runBenchmark(),
      onExport: handleExport,
      onQuit: handleQuit,
      onUpdateConnections: handleUpdateConnections,
    }
  );

  await runBenchmark();

  await new Promise<void>((resolve) => {
    const checkExit = setInterval(() => {
      if (shouldExit) {
        clearInterval(checkExit);
        resolve();
      }
    }, 100);
  });
}

async function runCliMode(
  config: BenchmarkConfig, 
  options: ReturnType<typeof parseArgs>,
  useAnsiProgress: boolean
): Promise<void> {
  const engine = new BenchmarkEngine(config);

  if (useAnsiProgress) {
    console.log(renderHeader(config.url, config.method, config.connections));
    engine.setProgressCallback((snapshot, progress) => {
      process.stdout.write(renderProgress(snapshot, progress, config.url));
    });
  }

  try {
    const result = await engine.run();

    if (useAnsiProgress) {
      process.stdout.write('\n');
    }

    let output: string;

    if (options.llm === 'json') {
      output = exportLlmJson(result);
    } else if (options.llm === 'markdown') {
      output = exportLlmMarkdown(result);
    } else if (options.format === 'json') {
      output = exportJson(result);
    } else if (options.format === 'csv') {
      output = exportCsv(result);
    } else if (options.format === 'markdown') {
      output = exportMarkdown(result);
    } else {
      output = renderResult(result);
    }

    if (options.output) {
      await Bun.write(options.output, output);
      if (!options.quiet) {
        console.log(`Results written to ${options.output}`);
      }
    } else {
      console.log(output);
    }

    const exitCode = result.failedRequests > 0 ? 1 : 0;
    process.exit(exitCode);
  } catch (err) {
    console.error('Error:', err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

function printHelp(): void {
  const help = `
burl - Modern HTTP benchmarking CLI

Usage: burl <url> [options]

Arguments:
  url                      Target URL to benchmark

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
  --http3                  Force HTTP/3 (experimental)

Authentication:
  -a, --auth <auth>        basic:user:pass or bearer:token

Output Options:
  --llm <format>           LLM output: json or markdown
  -o, --output <file>      Write results to file
  -f, --format <fmt>       Output: text, json, csv, markdown
  --no-tui                 Disable rich TUI
  --no-color               Disable colors
  -v, --verbose            Verbose output
  --quiet                  Minimal output

TUI Controls:
  [1-4]                    Switch metric view (Overview/RPS/Latency/Throughput)
  [tab]                    Cycle through views
  [q]                      Stop benchmark / Quit
  [r]                      Rerun benchmark (after completion)
  [c]                      Change connections and rerun (after completion)
  [e]                      Export results (after completion)

Other:
  -k, --insecure           Skip TLS verification
  --latency-correction     Enable latency correction
  --version, -V            Show version
  --help, -h               Show this help

Examples:
  burl https://api.example.com/health
  burl https://api.example.com -c 50 -d 30s
  burl https://api.example.com -m POST -b '{"test":1}' -T application/json
  burl https://api.example.com -a bearer:$TOKEN --llm json
`;

  console.log(help);
}

main();
