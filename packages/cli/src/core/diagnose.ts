import type { BenchmarkConfig } from "./types";
import { applyAuth } from "./auth";

export interface TimingBreakdown {
  dnsLookupMs: number;
  tcpTlsConnectMs: number;
  ttfbMs: number;
  contentTransferMs: number;
  totalMs: number;
}

export interface ConnectionDetails {
  remoteAddress: string;
  protocol: string;
  tlsVersion?: string;
  serverHeader?: string;
  contentType?: string;
  contentLength?: number;
}

export interface DiagnosticResult {
  cold: TimingBreakdown;
  warm: TimingBreakdown;
  details: ConnectionDetails;
  statusCode: number;
  responseSize: number;
}

async function resolveDns(hostname: string): Promise<{ address: string; timeMs: number }> {
  const dns = await import("node:dns");
  const start = Bun.nanoseconds();

  return new Promise((resolve, reject) => {
    dns.lookup(hostname, { family: 4 }, (err, address) => {
      const end = Bun.nanoseconds();
      const timeMs = (end - start) / 1_000_000;

      if (err) {
        reject(err);
      } else {
        resolve({ address, timeMs });
      }
    });
  });
}

async function measureWithFetch(
  url: URL,
  method: string,
  headers: Record<string, string>,
  body: string | ArrayBuffer | undefined,
  skipDns: boolean,
): Promise<{
  timing: TimingBreakdown;
  details: ConnectionDetails;
  statusCode: number;
  responseSize: number;
}> {
  let dnsTimeMs = 0;
  let remoteAddress = url.hostname;

  if (!skipDns) {
    try {
      const dnsResult = await resolveDns(url.hostname);
      dnsTimeMs = dnsResult.timeMs;
      remoteAddress = dnsResult.address;
    } catch {
      dnsTimeMs = 0;
    }
  }

  const fetchOptions: RequestInit = {
    method,
    headers,
    signal: AbortSignal.timeout(30000),
  };

  if (body && !["GET", "HEAD"].includes(method.toUpperCase())) {
    fetchOptions.body = body;
  }

  const connectStart = Bun.nanoseconds();
  const response = await fetch(url.toString(), fetchOptions);

  const ttfbTime = Bun.nanoseconds();
  const responseBuffer = await response.arrayBuffer();
  const transferEnd = Bun.nanoseconds();

  const tcpTlsConnectMs = (ttfbTime - connectStart) / 1_000_000;
  const ttfbMs = 0;
  const contentTransferMs = (transferEnd - ttfbTime) / 1_000_000;

  const serverHeader = response.headers.get("server") ?? undefined;
  const contentType = response.headers.get("content-type") ?? undefined;

  const timing: TimingBreakdown = {
    dnsLookupMs: dnsTimeMs,
    tcpTlsConnectMs,
    ttfbMs,
    contentTransferMs,
    totalMs: dnsTimeMs + tcpTlsConnectMs + ttfbMs + contentTransferMs,
  };

  const details: ConnectionDetails = {
    remoteAddress,
    protocol: "HTTP/1.1",
    tlsVersion: url.protocol === "https:" ? "TLS" : undefined,
    serverHeader,
    contentType,
    contentLength: responseBuffer.byteLength,
  };

  return {
    timing,
    details,
    statusCode: response.status,
    responseSize: responseBuffer.byteLength,
  };
}

export async function runDiagnostics(config: BenchmarkConfig): Promise<DiagnosticResult> {
  const url = new URL(config.url);
  const headers: Record<string, string> = { ...config.headers };

  if (config.auth) {
    applyAuth(headers, config.auth);
  }

  const coldResult = await measureWithFetch(url, config.method, headers, config.body, false);

  const warmResult = await measureWithFetch(url, config.method, headers, config.body, true);

  return {
    cold: coldResult.timing,
    warm: warmResult.timing,
    details: coldResult.details,
    statusCode: coldResult.statusCode,
    responseSize: coldResult.responseSize,
  };
}
