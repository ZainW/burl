import { describe, expect, it } from "bun:test";
import { renderDiagnostics } from "../../src/output/ansi/diagnose";
import type { DiagnosticResult } from "../../src/core/diagnose";

describe("diagnose", () => {
  describe("renderDiagnostics", () => {
    it("should render diagnostic output with cold and warm timing", () => {
      const mockResult: DiagnosticResult = {
        cold: {
          dnsLookupMs: 5.5,
          tcpTlsConnectMs: 45.2,
          ttfbMs: 12.3,
          contentTransferMs: 2.1,
          totalMs: 65.1,
        },
        warm: {
          dnsLookupMs: 0,
          tcpTlsConnectMs: 0,
          ttfbMs: 8.5,
          contentTransferMs: 1.8,
          totalMs: 10.3,
        },
        details: {
          remoteAddress: "93.184.216.34",
          protocol: "HTTP/1.1",
          tlsVersion: "TLS",
          serverHeader: "nginx/1.24.0",
          contentType: "text/html",
          contentLength: 1256,
        },
        statusCode: 200,
        responseSize: 1256,
      };

      const output = renderDiagnostics(mockResult, "https://example.com", "GET");

      expect(output).toContain("Connection Diagnostics");
      expect(output).toContain("Cold Connection");
      expect(output).toContain("Warm Connection");
      expect(output).toContain("DNS Lookup");
      expect(output).toContain("TCP + TLS");
      expect(output).toContain("TTFB");
      expect(output).toContain("Transfer");
      expect(output).toContain("93.184.216.34");
      expect(output).toContain("HTTP/1.1");
      expect(output).toContain("nginx/1.24.0");
      expect(output).toContain("200");
    });

    it("should show (cached) for warm DNS lookup when 0", () => {
      const mockResult: DiagnosticResult = {
        cold: {
          dnsLookupMs: 5.5,
          tcpTlsConnectMs: 45.2,
          ttfbMs: 0,
          contentTransferMs: 2.1,
          totalMs: 52.8,
        },
        warm: {
          dnsLookupMs: 0,
          tcpTlsConnectMs: 0,
          ttfbMs: 0,
          contentTransferMs: 1.8,
          totalMs: 1.8,
        },
        details: {
          remoteAddress: "127.0.0.1",
          protocol: "HTTP/1.1",
        },
        statusCode: 200,
        responseSize: 100,
      };

      const output = renderDiagnostics(mockResult, "http://localhost", "GET");

      expect(output).toContain("(cached)");
      expect(output).toContain("(keep-alive)");
    });

    it("should handle missing optional fields", () => {
      const mockResult: DiagnosticResult = {
        cold: {
          dnsLookupMs: 1.0,
          tcpTlsConnectMs: 10.0,
          ttfbMs: 5.0,
          contentTransferMs: 2.0,
          totalMs: 18.0,
        },
        warm: {
          dnsLookupMs: 0,
          tcpTlsConnectMs: 0,
          ttfbMs: 4.0,
          contentTransferMs: 1.5,
          totalMs: 5.5,
        },
        details: {
          remoteAddress: "10.0.0.1",
          protocol: "HTTP/1.1",
        },
        statusCode: 200,
        responseSize: 50,
      };

      const output = renderDiagnostics(mockResult, "http://internal", "POST");

      expect(output).toContain("POST");
      expect(output).toContain("http://internal");
      expect(output).not.toContain("TLS:");
      expect(output).not.toContain("Server:");
    });
  });
});
