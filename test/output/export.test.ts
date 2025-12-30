import { describe, test, expect } from 'bun:test';
import { exportJson } from '../../src/output/export/json';
import { exportCsv } from '../../src/output/export/csv';
import { exportMarkdown } from '../../src/output/export/markdown';
import type { BenchmarkResult } from '../../src/stats/types';

function createMockResult(): BenchmarkResult {
  return {
    url: 'https://api.example.com/test',
    method: 'GET',
    connections: 10,
    durationMs: 10000,
    totalRequests: 1000,
    successfulRequests: 990,
    failedRequests: 10,
    requestsPerSecond: 100,
    bytesPerSecond: 50000,
    totalBytes: 500000,
    latency: {
      min: 5,
      max: 200,
      mean: 25,
      median: 20,
      stddev: 15,
      p50: 20,
      p75: 30,
      p90: 50,
      p95: 75,
      p99: 150,
      p999: 190,
    },
    statusCodes: { 200: 990, 500: 10 },
    errors: { timeout: 5, connection_reset: 5 },
    timeSeries: [],
  };
}

describe('exportJson', () => {
  test('exports valid JSON', () => {
    const result = createMockResult();
    const json = exportJson(result);

    expect(() => JSON.parse(json)).not.toThrow();
  });

  test('contains all required fields', () => {
    const result = createMockResult();
    const json = exportJson(result);
    const parsed = JSON.parse(json);

    expect(parsed.url).toBe('https://api.example.com/test');
    expect(parsed.method).toBe('GET');
    expect(parsed.connections).toBe(10);
    expect(parsed.totalRequests).toBe(1000);
    expect(parsed.successfulRequests).toBe(990);
    expect(parsed.failedRequests).toBe(10);
    expect(parsed.requestsPerSecond).toBe(100);
    expect(parsed.latency).toBeDefined();
    expect(parsed.latency.p50).toBe(20);
    expect(parsed.latency.p99).toBe(150);
    expect(parsed.statusCodes).toEqual({ 200: 990, 500: 10 });
    expect(parsed.errors).toEqual({ timeout: 5, connection_reset: 5 });
  });

  test('formats with indentation', () => {
    const result = createMockResult();
    const json = exportJson(result);

    expect(json).toContain('\n');
    expect(json).toContain('  ');
  });
});

describe('exportCsv', () => {
  test('exports valid CSV', () => {
    const result = createMockResult();
    const csv = exportCsv(result);
    const lines = csv.split('\n');

    expect(lines[0]).toBe('metric,value');
    expect(lines.length).toBeGreaterThan(10);
  });

  test('contains all metrics', () => {
    const result = createMockResult();
    const csv = exportCsv(result);

    expect(csv).toContain('url,https://api.example.com/test');
    expect(csv).toContain('method,GET');
    expect(csv).toContain('connections,10');
    expect(csv).toContain('total_requests,1000');
    expect(csv).toContain('successful_requests,990');
    expect(csv).toContain('failed_requests,10');
    expect(csv).toContain('requests_per_second,100.00');
    expect(csv).toContain('latency_p50_ms,20.000');
    expect(csv).toContain('latency_p99_ms,150.000');
    expect(csv).toContain('status_200,990');
    expect(csv).toContain('status_500,10');
    expect(csv).toContain('error_timeout,5');
  });

  test('escapes values with commas', () => {
    const result = createMockResult();
    result.url = 'https://example.com?a=1,b=2';
    const csv = exportCsv(result);

    expect(csv).toContain('"https://example.com?a=1,b=2"');
  });
});

describe('exportMarkdown', () => {
  test('exports valid Markdown', () => {
    const result = createMockResult();
    const md = exportMarkdown(result);

    expect(md).toContain('# HTTP Benchmark Results');
    expect(md).toContain('## Target');
    expect(md).toContain('## Summary');
    expect(md).toContain('## Latency');
    expect(md).toContain('## Status Codes');
  });

  test('contains target information', () => {
    const result = createMockResult();
    const md = exportMarkdown(result);

    expect(md).toContain('**URL**: https://api.example.com/test');
    expect(md).toContain('**Method**: GET');
    expect(md).toContain('**Connections**: 10');
  });

  test('contains summary table', () => {
    const result = createMockResult();
    const md = exportMarkdown(result);

    expect(md).toContain('| Metric | Value |');
    expect(md).toContain('| Total Requests | 1,000 |');
    expect(md).toContain('| Successful | 990 |');
    expect(md).toContain('| Failed | 10 |');
  });

  test('contains latency table', () => {
    const result = createMockResult();
    const md = exportMarkdown(result);

    expect(md).toContain('| Percentile | Value |');
    expect(md).toContain('| P50 (Median) |');
    expect(md).toContain('| P99 |');
  });

  test('contains status codes section', () => {
    const result = createMockResult();
    const md = exportMarkdown(result);

    expect(md).toContain('| 200 | 990 |');
    expect(md).toContain('| 500 | 10 |');
  });

  test('contains errors section when present', () => {
    const result = createMockResult();
    const md = exportMarkdown(result);

    expect(md).toContain('## Errors');
    expect(md).toContain('| timeout | 5 |');
    expect(md).toContain('| connection_reset | 5 |');
  });

  test('omits errors section when no errors', () => {
    const result = createMockResult();
    result.errors = {};
    const md = exportMarkdown(result);

    expect(md).not.toContain('## Errors');
  });
});
