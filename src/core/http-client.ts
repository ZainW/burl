import type { BenchmarkConfig } from './types';
import type { RequestResult } from '../stats/types';
import { applyAuth } from './auth';

export async function makeRequest(config: BenchmarkConfig): Promise<RequestResult> {
  const startTime = Bun.nanoseconds();
  const timestamp = Date.now();

  const headers: Record<string, string> = { ...config.headers };
  
  if (config.auth) {
    applyAuth(headers, config.auth);
  }

  const fetchOptions: RequestInit = {
    method: config.method,
    headers,
    signal: AbortSignal.timeout(config.timeoutMs),
  };

  if (config.body && !['GET', 'HEAD'].includes(config.method.toUpperCase())) {
    fetchOptions.body = config.body;
  }

  try {
    const response = await fetch(config.url, fetchOptions);
    const body = await response.arrayBuffer();
    const endTime = Bun.nanoseconds();

    return {
      success: response.ok,
      statusCode: response.status,
      latencyMs: (endTime - startTime) / 1_000_000,
      bytes: body.byteLength,
      timestamp,
    };
  } catch (err) {
    const endTime = Bun.nanoseconds();
    const error = err instanceof Error ? err : new Error(String(err));

    return {
      success: false,
      latencyMs: (endTime - startTime) / 1_000_000,
      bytes: 0,
      error: categorizeError(error),
      timestamp,
    };
  }
}

function categorizeError(error: Error): string {
  const message = error.message.toLowerCase();

  if (message.includes('timeout') || error.name === 'TimeoutError') {
    return 'timeout';
  }
  if (message.includes('econnrefused') || message.includes('connection refused')) {
    return 'connection_refused';
  }
  if (message.includes('econnreset') || message.includes('connection reset')) {
    return 'connection_reset';
  }
  if (message.includes('enotfound') || message.includes('getaddrinfo')) {
    return 'dns_error';
  }
  if (message.includes('certificate') || message.includes('ssl') || message.includes('tls')) {
    return 'tls_error';
  }
  if (message.includes('socket hang up')) {
    return 'socket_hangup';
  }

  return 'unknown_error';
}
