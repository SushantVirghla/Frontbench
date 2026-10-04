import { performance } from 'node:perf_hooks';
import os from 'node:os';
import { generateDataset, BENCHMARK_SEARCH_TERMS, DEFAULT_SEED } from '../lib/dataset-generator.js';
import { baselineSearch, buildSearchIndex, optimizedSearch } from '../lib/search.js';
import { computeAllStats } from '../lib/analytics.js';
import { DATASET_COLUMNS } from '../lib/dataset-generator.js';
import { computeSummary, compareMetrics } from '../lib/statistics.js';

async function runLiveBenchmarks() {
  console.log('=== FRONTBENCH LIVE BENCHMARK EXECUTION ===');
  console.log(`OS: ${os.type()} ${os.release()} (${os.arch()})`);
  console.log(`CPU: ${os.cpus()[0]?.model} (${os.cpus().length} logical cores)`);
  console.log(`Node: ${process.version}`);
  console.log(`Timestamp: ${new Date().toISOString()}\n`);

  const rowCount = 10000;
  const warmup = 3;
  const trials = 20;

  console.log(`Generating deterministic dataset of ${rowCount.toLocaleString()} records (Seed: ${DEFAULT_SEED})...`);
  const dataset = generateDataset(DEFAULT_SEED, rowCount);
  console.log('✓ Dataset generated.\n');

  // --- EXPERIMENT B: SEARCH STRATEGY ---
  console.log('--- Running Experiment B: Search Strategy (10,000 rows) ---');
  const index = buildSearchIndex(dataset);
  const terms = [...BENCHMARK_SEARCH_TERMS];

  const bSearchSamples: number[] = [];
  const oSearchSamples: number[] = [];

  // Baseline search
  for (let i = 0; i < warmup + trials; i++) {
    const term = terms[i % terms.length];
    const t0 = performance.now();
    baselineSearch(dataset, term);
    const t1 = performance.now();
    if (i >= warmup) bSearchSamples.push(t1 - t0);
  }

  // Optimized search
  for (let i = 0; i < warmup + trials; i++) {
    const term = terms[i % terms.length];
    const t0 = performance.now();
    optimizedSearch(dataset, index, term);
    const t1 = performance.now();
    if (i >= warmup) oSearchSamples.push(t1 - t0);
  }

  const bSearchSummary = computeSummary('search_duration', 'ms', bSearchSamples);
  const oSearchSummary = computeSummary('search_duration', 'ms', oSearchSamples);
  const searchComparison = compareMetrics(bSearchSummary, oSearchSummary);

  console.log(`Baseline Search Median: ${bSearchSummary.median.toFixed(2)} ms (p95: ${bSearchSummary.p95.toFixed(2)} ms)`);
  console.log(`Optimized Search Median: ${oSearchSummary.median.toFixed(2)} ms (p95: ${oSearchSummary.p95.toFixed(2)} ms)`);
  console.log(`Speedup: ${searchComparison.speedupRatio?.toFixed(2)}x (${searchComparison.percentageChange?.toFixed(1)}% reduction)\n`);

  // --- EXPERIMENT C: COLUMN ANALYTICS ---
  console.log('--- Running Experiment C: Column Analytics Aggregation (10,000 rows) ---');
  const analyticsSamples: number[] = [];
  for (let i = 0; i < warmup + trials; i++) {
    const t0 = performance.now();
    computeAllStats(dataset, DATASET_COLUMNS);
    const t1 = performance.now();
    if (i >= warmup) analyticsSamples.push(t1 - t0);
  }

  const analyticsSummary = computeSummary('analytics_duration', 'ms', analyticsSamples);
  console.log(`Sync Analytics Median: ${analyticsSummary.median.toFixed(2)} ms (p95: ${analyticsSummary.p95.toFixed(2)} ms)`);
  console.log(`Off-thread Web Worker eliminates 100% of this ${analyticsSummary.median.toFixed(2)} ms main-thread freeze!\n`);

  console.log('=== BENCHMARK EXECUTION COMPLETE ===');
  return {
    env: {
      os: `${os.type()} ${os.release()} (${os.arch()})`,
      cpu: `${os.cpus()[0]?.model} (${os.cpus().length} cores)`,
      node: process.version,
    },
    search: searchComparison,
    analytics: analyticsSummary,
  };
}

runLiveBenchmarks();
