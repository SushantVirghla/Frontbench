import type { WorkerMessageIn, WorkerMessageOut } from '../workers/data.worker';
import type { DataRecord, ColumnSchema, ColumnStats } from '../types';

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
  onProgress?: (progress: { phase: string; percentage: number; rowsProcessed: number }) => void;
}

class WorkerClient {
  private worker: Worker | null = null;
  private pending = new Map<string, PendingRequest>();

  private getWorker(): Worker {
    if (!this.worker) {
      this.worker = new Worker(
        new URL('../workers/data.worker.ts', import.meta.url),
        { type: 'module' }
      );

      this.worker.onmessage = (e: MessageEvent<WorkerMessageOut>) => {
        const msg = e.data;
        const req = this.pending.get(msg.requestId);
        if (!req) return;

        if (msg.type === 'PROGRESS') {
          req.onProgress?.({
            phase: msg.phase,
            percentage: msg.percentage,
            rowsProcessed: msg.rowsProcessed,
          });
        } else if (msg.type === 'PARSE_COMPLETE') {
          this.pending.delete(msg.requestId);
          req.resolve({ records: msg.records, columns: msg.columns, durationMs: msg.durationMs });
        } else if (msg.type === 'GENERATE_COMPLETE') {
          this.pending.delete(msg.requestId);
          req.resolve({ records: msg.records, columns: msg.columns, durationMs: msg.durationMs });
        } else if (msg.type === 'ANALYTICS_COMPLETE') {
          this.pending.delete(msg.requestId);
          req.resolve({ stats: msg.stats, durationMs: msg.durationMs });
        } else if (msg.type === 'SEARCH_COMPLETE') {
          this.pending.delete(msg.requestId);
          req.resolve({ resultCount: msg.resultCount, durationMs: msg.durationMs });
        } else if (msg.type === 'ERROR') {
          this.pending.delete(msg.requestId);
          req.reject(new Error(msg.error));
        } else if (msg.type === 'CANCELLED') {
          this.pending.delete(msg.requestId);
          req.reject(new Error('Operation was cancelled by user.'));
        }
      };

      this.worker.onerror = (err) => {
        console.error('Worker error:', err);
        for (const [, req] of this.pending) {
          req.reject(new Error('Worker encountered an unhandled error.'));
        }
        this.pending.clear();
      };
    }

    return this.worker;
  }

  private post<T>(
    message: WorkerMessageIn,
    onProgress?: (progress: { phase: string; percentage: number; rowsProcessed: number }) => void
  ): Promise<T> {
    const worker = this.getWorker();
    return new Promise((resolve, reject) => {
      this.pending.set(message.requestId, {
        resolve: resolve as (val: unknown) => void,
        reject,
        onProgress,
      });
      worker.postMessage(message);
    });
  }

  generateDataset(
    seed: number,
    rowCount: number,
    onProgress?: (p: { phase: string; percentage: number; rowsProcessed: number }) => void
  ): { promise: Promise<{ records: DataRecord[]; columns: ColumnSchema[]; durationMs: number }>; cancel: () => void } {
    const requestId = `gen-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const promise = this.post<{ records: DataRecord[]; columns: ColumnSchema[]; durationMs: number }>(
      { type: 'GENERATE_DATASET', requestId, seed, rowCount },
      onProgress
    );
    const cancel = () => {
      this.worker?.postMessage({ type: 'CANCEL', requestId });
    };
    return { promise, cancel };
  }

  parseCSV(
    file: File,
    onProgress?: (p: { phase: string; percentage: number; rowsProcessed: number }) => void
  ): { promise: Promise<{ records: DataRecord[]; columns: ColumnSchema[]; durationMs: number }>; cancel: () => void } {
    const requestId = `parse-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const promise = this.post<{ records: DataRecord[]; columns: ColumnSchema[]; durationMs: number }>(
      { type: 'PARSE_CSV', requestId, file },
      onProgress
    );
    const cancel = () => {
      this.worker?.postMessage({ type: 'CANCEL', requestId });
    };
    return { promise, cancel };
  }

  computeAnalytics(
    records: DataRecord[],
    columns: ColumnSchema[]
  ): Promise<{ stats: ColumnStats[]; durationMs: number }> {
    const requestId = `stats-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    return this.post<{ stats: ColumnStats[]; durationMs: number }>({
      type: 'COMPUTE_ANALYTICS',
      requestId,
      records,
      columns,
    });
  }

  benchmarkSearch(
    records: DataRecord[],
    query: string,
    variant: 'baseline' | 'optimized'
  ): Promise<{ resultCount: number; durationMs: number }> {
    const requestId = `search-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    return this.post<{ resultCount: number; durationMs: number }>({
      type: 'BENCHMARK_SEARCH',
      requestId,
      records,
      query,
      variant,
    });
  }

  terminate(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
      this.pending.clear();
    }
  }
}

export const workerClient = new WorkerClient();
