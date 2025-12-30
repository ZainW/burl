import { describe, test, expect } from "bun:test";
import { formatBytes, formatThroughput, parseBytes } from "../../src/utils/bytes";

describe("formatBytes", () => {
  test("formats zero bytes", () => {
    expect(formatBytes(0)).toBe("0 B");
  });

  test("formats bytes", () => {
    expect(formatBytes(1)).toBe("1 B");
    expect(formatBytes(100)).toBe("100 B");
    expect(formatBytes(1023)).toBe("1023 B");
  });

  test("formats kilobytes", () => {
    expect(formatBytes(1024)).toBe("1.00 KB");
    expect(formatBytes(1536)).toBe("1.50 KB");
    expect(formatBytes(10240)).toBe("10.00 KB");
  });

  test("formats megabytes", () => {
    expect(formatBytes(1048576)).toBe("1.00 MB");
    expect(formatBytes(1572864)).toBe("1.50 MB");
    expect(formatBytes(10485760)).toBe("10.00 MB");
  });

  test("formats gigabytes", () => {
    expect(formatBytes(1073741824)).toBe("1.00 GB");
    expect(formatBytes(1610612736)).toBe("1.50 GB");
  });

  test("formats terabytes", () => {
    expect(formatBytes(1099511627776)).toBe("1.00 TB");
  });
});

describe("formatThroughput", () => {
  test("formats bytes per second", () => {
    expect(formatThroughput(1024)).toBe("1.00 KB/s");
    expect(formatThroughput(1048576)).toBe("1.00 MB/s");
    expect(formatThroughput(10485760)).toBe("10.00 MB/s");
  });
});

describe("parseBytes", () => {
  test("parses bytes", () => {
    expect(parseBytes("100")).toBe(100);
    expect(parseBytes("100B")).toBe(100);
    expect(parseBytes("100 B")).toBe(100);
  });

  test("parses kilobytes", () => {
    expect(parseBytes("1KB")).toBe(1024);
    expect(parseBytes("10KB")).toBe(10240);
    expect(parseBytes("1.5KB")).toBe(1536);
  });

  test("parses megabytes", () => {
    expect(parseBytes("1MB")).toBe(1048576);
    expect(parseBytes("10MB")).toBe(10485760);
  });

  test("parses gigabytes", () => {
    expect(parseBytes("1GB")).toBe(1073741824);
  });

  test("parses terabytes", () => {
    expect(parseBytes("1TB")).toBe(1099511627776);
  });

  test("is case insensitive", () => {
    expect(parseBytes("1kb")).toBe(1024);
    expect(parseBytes("1Kb")).toBe(1024);
    expect(parseBytes("1KB")).toBe(1024);
  });

  test("handles whitespace", () => {
    expect(parseBytes("  1KB  ")).toBe(1024);
    expect(parseBytes("1 KB")).toBe(1024);
  });

  test("throws on invalid format", () => {
    expect(() => parseBytes("abc")).toThrow();
    expect(() => parseBytes("")).toThrow();
    expect(() => parseBytes("1XB")).toThrow();
  });
});
