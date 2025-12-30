import { describe, test, expect, beforeEach } from 'bun:test';
import { StatsCollector } from '../../src/stats/collector';
import type { RequestResult } from '../../src/stats/types';

describe('StatsCollector', () => {
  let collector: StatsCollector;

  beforeEach(() => {
    collector = new StatsCollector();
  });

  function createSuccessResult(latencyMs: number, bytes: number = 100): RequestResult {
    return {
      success: true,
      statusCode: 200,
      latencyMs,
      bytes,
      timestamp: Date.now(),
    };
  }

  function createFailureResult(latencyMs: number, error: string): RequestResult {
    return {
      success: false,
      latencyMs,
      bytes: 0,
      error,
      timestamp: Date.now(),
    };
  }

  describe('record', () => {
    test('records successful requests', () => {
      collector.record(createSuccessResult(10));
      collector.record(createSuccessResult(20));
      collector.record(createSuccessResult(30));

      const snapshot = collector.getSnapshot();
      expect(snapshot.totalRequests).toBe(3);
      expect(snapshot.successfulRequests).toBe(3);
      expect(snapshot.failedRequests).toBe(0);
    });

    test('records failed requests', () => {
      collector.record(createSuccessResult(10));
      collector.record(createFailureResult(20, 'timeout'));
      collector.record(createFailureResult(30, 'connection_reset'));

      const snapshot = collector.getSnapshot();
      expect(snapshot.totalRequests).toBe(3);
      expect(snapshot.successfulRequests).toBe(1);
      expect(snapshot.failedRequests).toBe(2);
    });

    test('tracks status codes', () => {
      collector.record({ ...createSuccessResult(10), statusCode: 200 });
      collector.record({ ...createSuccessResult(10), statusCode: 200 });
      collector.record({ ...createSuccessResult(10), statusCode: 201 });
      collector.record({ ...createSuccessResult(10), statusCode: 404, success: false });

      const result = collector.finalize({ url: 'http://test', method: 'GET', connections: 1 });
      expect(result.statusCodes[200]).toBe(2);
      expect(result.statusCodes[201]).toBe(1);
      expect(result.statusCodes[404]).toBe(1);
    });

    test('tracks error types', () => {
      collector.record(createFailureResult(10, 'timeout'));
      collector.record(createFailureResult(10, 'timeout'));
      collector.record(createFailureResult(10, 'connection_reset'));

      const result = collector.finalize({ url: 'http://test', method: 'GET', connections: 1 });
      expect(result.errors['timeout']).toBe(2);
      expect(result.errors['connection_reset']).toBe(1);
    });
  });

  describe('getSnapshot', () => {
    test('returns current statistics', () => {
      collector.record(createSuccessResult(10));
      collector.record(createSuccessResult(20));
      collector.record(createSuccessResult(30));

      const snapshot = collector.getSnapshot();
      expect(snapshot.totalRequests).toBe(3);
      expect(snapshot.successfulRequests).toBe(3);
      expect(snapshot.failedRequests).toBe(0);
      expect(snapshot.elapsedMs).toBeGreaterThanOrEqual(0);
      expect(snapshot.currentRps).toBeGreaterThanOrEqual(0);
    });

    test('calculates percentiles from recent latencies', () => {
      for (let i = 1; i <= 100; i++) {
        collector.record(createSuccessResult(i));
      }

      const snapshot = collector.getSnapshot();
      expect(snapshot.latencyP50).toBeGreaterThan(0);
      expect(snapshot.latencyP99).toBeGreaterThan(snapshot.latencyP50);
    });
  });

  describe('finalize', () => {
    test('returns complete benchmark result', () => {
      for (let i = 1; i <= 100; i++) {
        collector.record(createSuccessResult(i, 100));
      }

      const result = collector.finalize({
        url: 'https://example.com',
        method: 'GET',
        connections: 10,
      });

      expect(result.url).toBe('https://example.com');
      expect(result.method).toBe('GET');
      expect(result.connections).toBe(10);
      expect(result.totalRequests).toBe(100);
      expect(result.successfulRequests).toBe(100);
      expect(result.failedRequests).toBe(0);
      expect(result.totalBytes).toBe(10000);
    });

    test('calculates latency statistics correctly', () => {
      const latencies = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
      for (const latency of latencies) {
        collector.record(createSuccessResult(latency));
      }

      const result = collector.finalize({ url: 'http://test', method: 'GET', connections: 1 });

      expect(result.latency.min).toBe(10);
      expect(result.latency.max).toBe(100);
      expect(result.latency.mean).toBe(55);
      expect(result.latency.p50).toBeGreaterThanOrEqual(50);
      expect(result.latency.p90).toBeGreaterThanOrEqual(90);
    });

    test('calculates standard deviation', () => {
      collector.record(createSuccessResult(10));
      collector.record(createSuccessResult(10));
      collector.record(createSuccessResult(10));

      const result = collector.finalize({ url: 'http://test', method: 'GET', connections: 1 });
      expect(result.latency.stddev).toBe(0);

      const collector2 = new StatsCollector();
      collector2.record(createSuccessResult(0));
      collector2.record(createSuccessResult(100));
      
      const result2 = collector2.finalize({ url: 'http://test', method: 'GET', connections: 1 });
      expect(result2.latency.stddev).toBe(50);
    });

    test('handles empty collector', () => {
      const result = collector.finalize({ url: 'http://test', method: 'GET', connections: 1 });

      expect(result.totalRequests).toBe(0);
      expect(result.latency.min).toBe(0);
      expect(result.latency.max).toBe(0);
      expect(result.latency.mean).toBe(0);
    });

    test('calculates requests per second', () => {
      for (let i = 0; i < 100; i++) {
        collector.record(createSuccessResult(10));
      }

      const result = collector.finalize({ url: 'http://test', method: 'GET', connections: 1 });
      expect(result.totalRequests).toBe(100);
      expect(result.requestsPerSecond).toBeGreaterThanOrEqual(0);
      if (result.durationMs > 0) {
        expect(result.requestsPerSecond).toBeGreaterThan(0);
      }
    });

    test('calculates bytes per second', () => {
      for (let i = 0; i < 100; i++) {
        collector.record(createSuccessResult(10, 1000));
      }

      const result = collector.finalize({ url: 'http://test', method: 'GET', connections: 1 });
      expect(result.totalBytes).toBe(100000);
      expect(result.bytesPerSecond).toBeGreaterThanOrEqual(0);
      if (result.durationMs > 0) {
        expect(result.bytesPerSecond).toBeGreaterThan(0);
      }
    });
  });
});
