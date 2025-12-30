import { describe, test, expect } from "bun:test";
import { parseArgs, buildConfig } from "../src/cli";

describe("parseArgs", () => {
  test("parses URL argument", () => {
    const options = parseArgs(["https://example.com"]);
    expect(options.url).toBe("https://example.com");
  });

  test("parses method flag", () => {
    expect(parseArgs(["https://example.com", "-m", "POST"]).method).toBe("POST");
    expect(parseArgs(["https://example.com", "--method", "PUT"]).method).toBe("PUT");
  });

  test("parses connections flag", () => {
    expect(parseArgs(["https://example.com", "-c", "50"]).connections).toBe(50);
    expect(parseArgs(["https://example.com", "--connections", "100"]).connections).toBe(100);
  });

  test("parses duration flag", () => {
    expect(parseArgs(["https://example.com", "-d", "30s"]).duration).toBe("30s");
    expect(parseArgs(["https://example.com", "--duration", "1m"]).duration).toBe("1m");
  });

  test("parses requests flag", () => {
    expect(parseArgs(["https://example.com", "-n", "1000"]).requests).toBe(1000);
    expect(parseArgs(["https://example.com", "--requests", "5000"]).requests).toBe(5000);
  });

  test("parses timeout flag", () => {
    expect(parseArgs(["https://example.com", "-t", "5s"]).timeout).toBe("5s");
    expect(parseArgs(["https://example.com", "--timeout", "1m"]).timeout).toBe("1m");
  });

  test("parses warmup flag", () => {
    expect(parseArgs(["https://example.com", "-w", "10"]).warmup).toBe(10);
    expect(parseArgs(["https://example.com", "--warmup", "50"]).warmup).toBe(50);
  });

  test("parses header flags", () => {
    const options = parseArgs([
      "https://example.com",
      "-H",
      "Content-Type: application/json",
      "-H",
      "X-Custom: value",
    ]);
    expect(options.headers).toEqual(["Content-Type: application/json", "X-Custom: value"]);
  });

  test("parses body flag", () => {
    expect(parseArgs(["https://example.com", "-b", '{"test":1}']).body).toBe('{"test":1}');
    expect(parseArgs(["https://example.com", "--body", "data"]).body).toBe("data");
  });

  test("parses content-type flag", () => {
    expect(parseArgs(["https://example.com", "-T", "application/json"]).contentType).toBe(
      "application/json",
    );
  });

  test("parses HTTP version flags", () => {
    expect(parseArgs(["https://example.com", "--http1"]).http1).toBe(true);
    expect(parseArgs(["https://example.com", "--http2"]).http2).toBe(true);
    expect(parseArgs(["https://example.com", "--http3"]).http3).toBe(true);
  });

  test("parses auth flag", () => {
    expect(parseArgs(["https://example.com", "-a", "bearer:token"]).auth).toBe("bearer:token");
    expect(parseArgs(["https://example.com", "--auth", "basic:u:p"]).auth).toBe("basic:u:p");
  });

  test("parses LLM output flag", () => {
    expect(parseArgs(["https://example.com", "--llm", "json"]).llm).toBe("json");
    expect(parseArgs(["https://example.com", "--llm", "markdown"]).llm).toBe("markdown");
  });

  test("parses output flag", () => {
    expect(parseArgs(["https://example.com", "-o", "results.json"]).output).toBe("results.json");
  });

  test("parses format flag", () => {
    expect(parseArgs(["https://example.com", "-f", "json"]).format).toBe("json");
    expect(parseArgs(["https://example.com", "--format", "csv"]).format).toBe("csv");
  });

  test("parses boolean flags", () => {
    const options = parseArgs([
      "https://example.com",
      "--no-tui",
      "--no-color",
      "-v",
      "--quiet",
      "-k",
      "--latency-correction",
    ]);
    expect(options.noTui).toBe(true);
    expect(options.noColor).toBe(true);
    expect(options.verbose).toBe(true);
    expect(options.quiet).toBe(true);
    expect(options.insecure).toBe(true);
    expect(options.latencyCorrection).toBe(true);
  });

  test("uses default values", () => {
    const options = parseArgs(["https://example.com"]);
    expect(options.method).toBe("GET");
    expect(options.connections).toBe(10);
    expect(options.duration).toBe("10s");
    expect(options.timeout).toBe("30s");
    expect(options.warmup).toBe(0);
    expect(options.format).toBe("text");
    expect(options.noTui).toBe(false);
    expect(options.noColor).toBe(false);
  });
});

describe("buildConfig", () => {
  test("builds config from options", () => {
    const options = parseArgs(["https://example.com", "-c", "50", "-d", "30s"]);
    const config = buildConfig(options);

    expect(config.url).toBe("https://example.com");
    expect(config.method).toBe("GET");
    expect(config.connections).toBe(50);
    expect(config.durationMs).toBe(30000);
    expect(config.timeoutMs).toBe(30000);
  });

  test("parses headers into object", () => {
    const options = parseArgs([
      "https://example.com",
      "-H",
      "Content-Type: application/json",
      "-H",
      "X-Custom: value with spaces",
    ]);
    const config = buildConfig(options);

    expect(config.headers["Content-Type"]).toBe("application/json");
    expect(config.headers["X-Custom"]).toBe("value with spaces");
  });

  test("sets content-type header", () => {
    const options = parseArgs(["https://example.com", "-T", "application/json"]);
    const config = buildConfig(options);

    expect(config.headers["Content-Type"]).toBe("application/json");
  });

  test("sets body", () => {
    const options = parseArgs(["https://example.com", "-b", '{"test":1}']);
    const config = buildConfig(options);

    expect(config.body).toBe('{"test":1}');
  });

  test("configures HTTP version", () => {
    expect(buildConfig(parseArgs(["https://example.com"])).httpVersion).toBe("auto");
    expect(buildConfig(parseArgs(["https://example.com", "--http1"])).httpVersion).toBe("1.1");
    expect(buildConfig(parseArgs(["https://example.com", "--http2"])).httpVersion).toBe("2");
    expect(buildConfig(parseArgs(["https://example.com", "--http3"])).httpVersion).toBe("3");
  });

  test("configures auth", () => {
    const options = parseArgs(["https://example.com", "-a", "bearer:mytoken"]);
    const config = buildConfig(options);

    expect(config.auth).toEqual({ type: "bearer", token: "mytoken" });
  });

  test("uses requests instead of duration when specified", () => {
    const options = parseArgs(["https://example.com", "-n", "1000"]);
    const config = buildConfig(options);

    expect(config.totalRequests).toBe(1000);
    expect(config.durationMs).toBeUndefined();
  });

  test("configures QPS", () => {
    const options = parseArgs(["https://example.com", "-q", "100"]);
    const config = buildConfig(options);

    expect(config.qps).toBe(100);
  });

  test("configures warmup", () => {
    const options = parseArgs(["https://example.com", "-w", "20"]);
    const config = buildConfig(options);

    expect(config.warmupRequests).toBe(20);
  });

  test("configures insecure and latency correction", () => {
    const options = parseArgs(["https://example.com", "-k", "--latency-correction"]);
    const config = buildConfig(options);

    expect(config.insecure).toBe(true);
    expect(config.latencyCorrection).toBe(true);
  });
});
