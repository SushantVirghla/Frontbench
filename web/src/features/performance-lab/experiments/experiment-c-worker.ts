import { generateDataset, DATASET_COLUMNS } from '../../../lib/dataset-generator';
import { computeAllStats } from '../../../lib/analytics';
import { workerClient } from '../../../services/worker-client';
import type { BenchmarkSample } from '../../../types';

export interface ExperimentCRunOptions {
  rowCount: number;
  seed: number;
  warmupRuns: number;
  measuredRuns: number;
  onProgress?: (progress: { current: number; total: number; status: string }) => void;
  shouldCancel?: () => boolean;
}

/**
 * Experiment C: Measures total time and main-thread blocking time for heavy calculations on the main thread vs Web Worker.
 */
export async function runExperimentC(
  options: ExperimentCRunOptions
): Promise<BenchmarkSample[]> {
  const { rowCount, seed, warmupRuns, measuredRuns, onProgress, shouldCancel } = options;
  const samples: BenchmarkSample[] = [];

  const dataset = generateDataset(seed, rowCount);
  const totalRuns = (warmupRuns + measuredRuns) * 2;
  let currentRun = 0;

  // 1. BASELINE: Main-Thread Computation
  for (let i = 0; i < warmupRuns + measuredRuns; i++) {
    if (shouldCancel?.()) throw new Error('Benchmark cancelled by user.');
    currentRun++;
    onProgress?.({
      current: currentRun,
      total: totalRuns,
      status: i < warmupRuns ? `Baseline warmup (${i + 1}/${warmupRuns})` : `Baseline main-thread trial (${i - warmupRuns + 1}/${measuredRuns})`,
    });

    const t0 = performance.now();
    computeAllStats(dataset, DATASET_COLUMNS);
    const t1 = performance.now();
    const duration = t1 - t0;

    if (i >= warmupRuns) {
      const sampleIndex = i - warmupRuns;
      samples.push({
        scenarioKey: 'experiment_c_worker',
        implementation: 'baseline',
        metricKey: 'total_duration',
        metricValue: duration,
        unit: 'ms',
        sampleIndex,
        recordedAt: new Date().toISOString(),
      });
      samples.push({
        scenarioKey: 'experiment_c_worker',
        implementation: 'baseline',
        metricKey: 'main_thread_blocking',
        metricValue: duration, // Main thread is fully blocked
        unit: 'ms',
        sampleIndex,
        recordedAt: new Date().toISOString(),
      });
    }

    await new Promise((r) => setTimeout(r, 16));
  }

  // 2. OPTIMIZED: Web Worker Computation
  for (let i = 0; i < warmupRuns + measuredRuns; i++) {
    if (shouldCancel?.()) throw new Error('Benchmark cancelled by user.');
    currentRun++;
    onProgress?.({
      current: currentRun,
      total: totalRuns,
      status: i < warmupRuns ? `Optimized warmup (${i + 1}/${warmupRuns})` : `Optimized Web Worker trial (${i - warmupRuns + 1}/${measuredRuns})`,
    });

    // Measure time spent blocking the main thread while dispatching to worker
    const dispatchStart = performance.now();
    const workerPromise = workerClient.computeAnalytics(dataset, DATASET_COLUMNS);
    const dispatchEnd = performance.now();
    const mainThreadBlock = dispatchEnd - dispatchStart;

    const t0 = performance.now();
    await workerPromise;
    const t1 = performance.now();
    const totalDuration = t1 - t0;

    if (i >= warmupRuns) {
      const sampleIndex = i - warmupRuns;
      samples.push({
        scenarioKey: 'experiment_c_worker',
        implementation: 'optimized',
        metricKey: 'total_duration',
        metricValue: totalDuration,
        unit: 'ms',
        sampleIndex,
        recordedAt: new Date().toISOString(),
      });
      samples.push({
        scenarioKey: 'experiment_c_worker',
        implementation: 'optimized',
        metricKey: 'main_thread_blocking',
        metricValue: mainThreadBlock, // Near zero main-thread block
        unit: 'ms',
        sampleIndex,
        recordedAt: new Date().toISOString(),
      });
    }

    await new Promise((r) => setTimeout(r, 16));
  }

  return samples;
}
