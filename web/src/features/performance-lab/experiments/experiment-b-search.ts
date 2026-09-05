import { generateDataset, BENCHMARK_SEARCH_TERMS } from '../../../lib/dataset-generator';
import { baselineSearch, buildSearchIndex, optimizedSearch } from '../../../lib/search';
import type { BenchmarkSample } from '../../../types';

export interface ExperimentBRunOptions {
  rowCount: number;
  seed: number;
  warmupRuns: number;
  measuredRuns: number;
  onProgress?: (progress: { current: number; total: number; status: string }) => void;
  shouldCancel?: () => boolean;
}

/**
 * Experiment B: Measures search computation duration for full scan vs pre-normalized index.
 */
export async function runExperimentB(
  options: ExperimentBRunOptions
): Promise<BenchmarkSample[]> {
  const { rowCount, seed, warmupRuns, measuredRuns, onProgress, shouldCancel } = options;
  const samples: BenchmarkSample[] = [];

  // Generate dataset outside timing
  const dataset = generateDataset(seed, rowCount);

  // Pre-build index for the optimized variant
  const searchIndex = buildSearchIndex(dataset);

  const queryTerms = [...BENCHMARK_SEARCH_TERMS];
  const totalRuns = (warmupRuns + measuredRuns) * 2;
  let currentRun = 0;

  // 1. BASELINE: Full Scan
  for (let i = 0; i < warmupRuns + measuredRuns; i++) {
    if (shouldCancel?.()) throw new Error('Benchmark cancelled by user.');
    currentRun++;
    onProgress?.({
      current: currentRun,
      total: totalRuns,
      status: i < warmupRuns ? `Baseline warmup (${i + 1}/${warmupRuns})` : `Baseline search trial (${i - warmupRuns + 1}/${measuredRuns})`,
    });

    const query = queryTerms[i % queryTerms.length];

    const t0 = performance.now();
    const results = baselineSearch(dataset, query);
    const t1 = performance.now();

    if (i >= warmupRuns) {
      const sampleIndex = i - warmupRuns;
      samples.push({
        scenarioKey: 'experiment_b_search',
        implementation: 'baseline',
        metricKey: 'search_duration',
        metricValue: t1 - t0,
        unit: 'ms',
        sampleIndex,
        recordedAt: new Date().toISOString(),
      });
      samples.push({
        scenarioKey: 'experiment_b_search',
        implementation: 'baseline',
        metricKey: 'matches_found',
        metricValue: results.length,
        unit: 'count',
        sampleIndex,
        recordedAt: new Date().toISOString(),
      });
    }

    await new Promise((r) => setTimeout(r, 8));
  }

  // 2. OPTIMIZED: Pre-indexed Search
  for (let i = 0; i < warmupRuns + measuredRuns; i++) {
    if (shouldCancel?.()) throw new Error('Benchmark cancelled by user.');
    currentRun++;
    onProgress?.({
      current: currentRun,
      total: totalRuns,
      status: i < warmupRuns ? `Optimized warmup (${i + 1}/${warmupRuns})` : `Optimized search trial (${i - warmupRuns + 1}/${measuredRuns})`,
    });

    const query = queryTerms[i % queryTerms.length];

    const t0 = performance.now();
    const results = optimizedSearch(dataset, searchIndex, query);
    const t1 = performance.now();

    if (i >= warmupRuns) {
      const sampleIndex = i - warmupRuns;
      samples.push({
        scenarioKey: 'experiment_b_search',
        implementation: 'optimized',
        metricKey: 'search_duration',
        metricValue: t1 - t0,
        unit: 'ms',
        sampleIndex,
        recordedAt: new Date().toISOString(),
      });
      samples.push({
        scenarioKey: 'experiment_b_search',
        implementation: 'optimized',
        metricKey: 'matches_found',
        metricValue: results.length,
        unit: 'count',
        sampleIndex,
        recordedAt: new Date().toISOString(),
      });
    }

    await new Promise((r) => setTimeout(r, 8));
  }

  return samples;
}
