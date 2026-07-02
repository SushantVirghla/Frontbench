/**
 * Statistics module for benchmark calculations.
 * All summary statistics are computed from raw sample arrays.
 * No values are hardcoded or fabricated.
 */

import type { MetricSummary, ComparisonResult, BenchmarkSample } from '../types';

function sortedAsc(values: number[]): number[] {
  return [...values].sort((a, b) => a - b);
}

export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = sortedAsc(values);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

export function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  if (values.length === 1) return values[0];
  const sorted = sortedAsc(values);
  const rank = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(rank);
  const upper = Math.ceil(rank);
  if (lower === upper) return sorted[lower];
  const fraction = rank - lower;
  return sorted[lower] + fraction * (sorted[upper] - sorted[lower]);
}

export function p95(values: number[]): number {
  return percentile(values, 95);
}

export function computeSummary(
  metricKey: string,
  unit: string,
  values: number[]
): MetricSummary {
  const sorted = sortedAsc(values);
  return {
    metricKey,
    unit,
    sampleCount: values.length,
    mean: mean(values),
    median: median(values),
    p95: p95(values),
    min: sorted.length > 0 ? sorted[0] : 0,
    max: sorted.length > 0 ? sorted[sorted.length - 1] : 0,
  };
}

export function compareMetrics(
  baseline: MetricSummary,
  optimized: MetricSummary
): ComparisonResult {
  const diff = baseline.median - optimized.median;

  let percentageChange: number | null = null;
  if (baseline.median > 0) {
    percentageChange = (diff / baseline.median) * 100;
  }

  let speedupRatio: number | null = null;
  if (optimized.median > 0) {
    speedupRatio = baseline.median / optimized.median;
  }

  let direction: ComparisonResult['direction'] = 'neutral';
  if (percentageChange !== null) {
    if (percentageChange > 5) direction = 'improvement';
    else if (percentageChange < -5) direction = 'regression';
  }

  let warning: string | undefined;
  if (baseline.sampleCount < 5 || optimized.sampleCount < 5) {
    warning = `Low sample count (baseline: ${baseline.sampleCount}, optimized: ${optimized.sampleCount}). Results may not be statistically meaningful.`;
  }
  if (baseline.unit !== optimized.unit) {
    warning = `Unit mismatch: baseline uses '${baseline.unit}', optimized uses '${optimized.unit}'. Comparison may be invalid.`;
    percentageChange = null;
    speedupRatio = null;
  }

  return {
    metricKey: baseline.metricKey,
    unit: baseline.unit,
    baseline,
    optimized,
    absoluteDifference: diff,
    percentageChange,
    speedupRatio,
    direction,
    warning,
  };
}

export function extractMetricValues(
  samples: BenchmarkSample[],
  scenarioKey: string,
  implementation: 'baseline' | 'optimized',
  metricKey: string
): number[] {
  return samples
    .filter(
      (s) =>
        s.scenarioKey === scenarioKey &&
        s.implementation === implementation &&
        s.metricKey === metricKey
    )
    .sort((a, b) => a.sampleIndex - b.sampleIndex)
    .map((s) => s.metricValue);
}

export function formatMetric(value: number, unit: string): string {
  if (unit === 'ms') {
    return value < 1 ? `${value.toFixed(3)} ms` : `${value.toFixed(1)} ms`;
  }
  if (unit === 'count') {
    return Math.round(value).toLocaleString();
  }
  if (unit === 'bytes' || unit === 'KB' || unit === 'MB') {
    return `${value.toFixed(1)} ${unit}`;
  }
  return `${value.toFixed(2)} ${unit}`;
}

export function formatPercentageChange(value: number | null): string {
  if (value === null) return 'N/A';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}
