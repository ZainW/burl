import type { BenchmarkConfig } from './types';
import type { BenchmarkResult, StatsSnapshot } from '../stats/types';
import { StatsCollector } from '../stats/collector';
import { makeRequest } from './http-client';

export type ProgressCallback = (snapshot: StatsSnapshot, progress: number) => void;

export class BenchmarkEngine {
  private config: BenchmarkConfig;
  private collector: StatsCollector;
  private isRunning = false;
  private shouldStop = false;
  private activeWorkers = 0;
  private onProgress?: ProgressCallback;

  constructor(config: BenchmarkConfig) {
    this.config = config;
    this.collector = new StatsCollector();
  }

  setProgressCallback(callback: ProgressCallback): void {
    this.onProgress = callback;
  }

  async run(): Promise<BenchmarkResult> {
    this.isRunning = true;
    this.shouldStop = false;

    if (this.config.warmupRequests > 0) {
      await this.runWarmup();
    }

    this.collector = new StatsCollector();

    const workers: Promise<void>[] = [];
    for (let i = 0; i < this.config.connections; i++) {
      workers.push(this.runWorker());
    }

    const progressInterval = setInterval(() => {
      if (this.onProgress) {
        const snapshot = this.collector.getSnapshot();
        const progress = this.calculateProgress(snapshot);
        this.onProgress(snapshot, progress);
      }
    }, 100);

    if (this.config.durationMs) {
      setTimeout(() => {
        this.shouldStop = true;
      }, this.config.durationMs);
    }

    await Promise.all(workers);

    clearInterval(progressInterval);
    this.isRunning = false;

    return this.collector.finalize({
      url: this.config.url,
      method: this.config.method,
      connections: this.config.connections,
    });
  }

  stop(): void {
    this.shouldStop = true;
  }

  private async runWarmup(): Promise<void> {
    const warmupPromises: Promise<void>[] = [];

    for (let i = 0; i < this.config.warmupRequests; i++) {
      warmupPromises.push(
        makeRequest(this.config).then(() => {})
      );

      if (warmupPromises.length >= this.config.connections) {
        await Promise.all(warmupPromises);
        warmupPromises.length = 0;
      }
    }

    if (warmupPromises.length > 0) {
      await Promise.all(warmupPromises);
    }
  }

  private async runWorker(): Promise<void> {
    this.activeWorkers++;
    let requestCount = 0;

    while (!this.shouldStop) {
      if (this.config.totalRequests) {
        const snapshot = this.collector.getSnapshot();
        if (snapshot.totalRequests >= this.config.totalRequests) {
          break;
        }
      }

      if (this.config.qps && this.config.qps > 0) {
        const targetIntervalMs = (1000 * this.config.connections) / this.config.qps;
        await this.sleep(targetIntervalMs);
      }

      const result = await makeRequest(this.config);
      this.collector.record(result);
      requestCount++;

      if (this.config.totalRequests && requestCount >= Math.ceil(this.config.totalRequests / this.config.connections)) {
        break;
      }
    }

    this.activeWorkers--;
  }

  private calculateProgress(snapshot: StatsSnapshot): number {
    if (this.config.totalRequests) {
      return Math.min(snapshot.totalRequests / this.config.totalRequests, 1);
    }
    if (this.config.durationMs) {
      return Math.min(snapshot.elapsedMs / this.config.durationMs, 1);
    }
    return 0;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
