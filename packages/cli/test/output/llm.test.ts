import { describe, test, expect } from "bun:test";
import { exportLlmJson, exportLlmMarkdown } from "../../src/output/export/llm";
import type { BenchmarkResult } from "../../src/stats/types";

function createMockResult(overrides: Partial<BenchmarkResult> = {}): BenchmarkResult {
  return {
    url: "https://api.example.com/test",
    method: "GET",
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
    ...overrides,
  };
}

describe("exportLlmJson", () => {
  test("exports valid JSON with schema", () => {
    const result = createMockResult();
    const json = exportLlmJson(result);
    const parsed = JSON.parse(json);

    expect(parsed.$schema).toBe("https://burl.dev/schema/v1/result.json");
    expect(parsed.version).toBe("0.1.0");
  });

  test("contains benchmark section", () => {
    const result = createMockResult();
    const json = exportLlmJson(result);
    const parsed = JSON.parse(json);

    expect(parsed.benchmark.url).toBe("https://api.example.com/test");
    expect(parsed.benchmark.method).toBe("GET");
    expect(parsed.benchmark.connections).toBe(10);
    expect(parsed.benchmark.duration_seconds).toBe(10);
  });

  test("contains summary section", () => {
    const result = createMockResult();
    const json = exportLlmJson(result);
    const parsed = JSON.parse(json);

    expect(parsed.summary.total_requests).toBe(1000);
    expect(parsed.summary.successful_requests).toBe(990);
    expect(parsed.summary.failed_requests).toBe(10);
    expect(parsed.summary.requests_per_second).toBe(100);
    expect(parsed.summary.success_rate).toBe(0.99);
  });

  test("contains latency_ms section", () => {
    const result = createMockResult();
    const json = exportLlmJson(result);
    const parsed = JSON.parse(json);

    expect(parsed.latency_ms.min).toBe(5);
    expect(parsed.latency_ms.max).toBe(200);
    expect(parsed.latency_ms.mean).toBe(25);
    expect(parsed.latency_ms.p50).toBe(20);
    expect(parsed.latency_ms.p99).toBe(150);
  });

  test("contains interpretation section", () => {
    const result = createMockResult();
    const json = exportLlmJson(result);
    const parsed = JSON.parse(json);

    expect(parsed.interpretation).toBeDefined();
    expect(parsed.interpretation.performance).toBeDefined();
    expect(Array.isArray(parsed.interpretation.issues)).toBe(true);
    expect(Array.isArray(parsed.interpretation.recommendations)).toBe(true);
  });

  test("detects high error rate", () => {
    const result = createMockResult({
      totalRequests: 100,
      successfulRequests: 90,
      failedRequests: 10,
    });
    const json = exportLlmJson(result);
    const parsed = JSON.parse(json);

    expect(parsed.interpretation.issues.length).toBeGreaterThan(0);
    expect(parsed.interpretation.issues.some((i: string) => i.includes("failed"))).toBe(true);
  });

  test("detects tail latency issues", () => {
    const result = createMockResult({
      latency: {
        min: 5,
        max: 1000,
        mean: 25,
        median: 10,
        stddev: 50,
        p50: 10,
        p75: 15,
        p90: 20,
        p95: 30,
        p99: 500,
        p999: 900,
      },
    });
    const json = exportLlmJson(result);
    const parsed = JSON.parse(json);

    expect(
      parsed.interpretation.issues.some((i: string) => i.includes("p99") || i.includes("tail")),
    ).toBe(true);
  });

  test("detects server errors", () => {
    const result = createMockResult({
      statusCodes: { 200: 950, 500: 30, 503: 20 },
    });
    const json = exportLlmJson(result);
    const parsed = JSON.parse(json);

    expect(
      parsed.interpretation.issues.some((i: string) => i.includes("5xx") || i.includes("server")),
    ).toBe(true);
    expect(
      parsed.interpretation.recommendations.some(
        (r: string) => r.includes("server") || r.includes("5xx"),
      ),
    ).toBe(true);
  });

  test("assesses performance correctly", () => {
    const excellentResult = createMockResult({
      successfulRequests: 1000,
      failedRequests: 0,
      latency: {
        min: 1,
        max: 50,
        mean: 10,
        median: 8,
        stddev: 5,
        p50: 8,
        p75: 12,
        p90: 20,
        p95: 30,
        p99: 50,
        p999: 50,
      },
    });
    const excellentJson = exportLlmJson(excellentResult);
    const excellentParsed = JSON.parse(excellentJson);
    expect(excellentParsed.interpretation.performance).toBe("excellent");

    const poorResult = createMockResult({
      totalRequests: 100,
      successfulRequests: 80,
      failedRequests: 20,
    });
    const poorJson = exportLlmJson(poorResult);
    const poorParsed = JSON.parse(poorJson);
    expect(poorParsed.interpretation.performance).toBe("poor");
  });
});

describe("exportLlmMarkdown", () => {
  test("exports valid Markdown", () => {
    const result = createMockResult();
    const md = exportLlmMarkdown(result);

    expect(md).toContain("# HTTP Benchmark Results");
    expect(md).toContain("## Target");
    expect(md).toContain("## Summary");
    expect(md).toContain("## Latency");
  });

  test("contains target section", () => {
    const result = createMockResult();
    const md = exportLlmMarkdown(result);

    expect(md).toContain("**URL**: https://api.example.com/test");
    expect(md).toContain("**Method**: GET");
    expect(md).toContain("**Concurrency**: 10 connections");
  });

  test("contains summary table", () => {
    const result = createMockResult();
    const md = exportLlmMarkdown(result);

    expect(md).toContain("| Metric | Value |");
    expect(md).toContain("Total Requests");
    expect(md).toContain("Success Rate");
    expect(md).toContain("Requests/sec");
  });

  test("contains latency table", () => {
    const result = createMockResult();
    const md = exportLlmMarkdown(result);

    expect(md).toContain("## Latency (milliseconds)");
    expect(md).toContain("| Percentile | Value |");
    expect(md).toContain("p50 (Median)");
    expect(md).toContain("p99");
  });

  test("contains status codes with descriptions", () => {
    const result = createMockResult();
    const md = exportLlmMarkdown(result);

    expect(md).toContain("## Status Codes");
    expect(md).toContain("`200 OK`");
    expect(md).toContain("`500 Internal Server Error`");
  });

  test("contains issues section when present", () => {
    const result = createMockResult({
      totalRequests: 100,
      successfulRequests: 80,
      failedRequests: 20,
    });
    const md = exportLlmMarkdown(result);

    expect(md).toContain("## Issues Detected");
  });

  test("contains recommendations section when present", () => {
    const result = createMockResult({
      statusCodes: { 200: 950, 500: 50 },
    });
    const md = exportLlmMarkdown(result);

    expect(md).toContain("## Recommendations");
  });

  test("omits issues section when no issues", () => {
    const result = createMockResult({
      successfulRequests: 1000,
      failedRequests: 0,
      statusCodes: { 200: 1000 },
      errors: {},
      latency: {
        min: 5,
        max: 50,
        mean: 20,
        median: 18,
        stddev: 5,
        p50: 18,
        p75: 25,
        p90: 35,
        p95: 40,
        p99: 45,
        p999: 50,
      },
    });
    const md = exportLlmMarkdown(result);

    expect(md).not.toContain("## Issues Detected");
  });
});
