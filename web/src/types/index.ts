// Core data types for FrontBench

export interface ColumnSchema {
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean';
  nullable: boolean;
}

export interface DatasetProfile {
  id: string;
  name: string;
  sourceType: 'synthetic' | 'local_csv';
  rowCount: number;
  columns: ColumnSchema[];
  byteSize: number | null;
  createdAt: string;
}

export interface DataRecord {
  id: string;
  [key: string]: unknown;
}

export interface ImportProgress {
  phase: 'reading' | 'parsing' | 'storing' | 'complete' | 'error' | 'cancelled';
  rowsParsed: number;
  totalRows: number | null;
  percentage: number;
  error?: string;
}

export interface FilterConfig {
  column: string;
  operator: 'equals' | 'contains' | 'gt' | 'lt' | 'gte' | 'lte';
  value: string;
}

export interface SortConfig {
  column: string;
  direction: 'asc' | 'desc';
}

export interface SearchConfig {
  query: string;
  sequenceId: number;
}

// Benchmark types
export type Implementation = 'baseline' | 'optimized';

export interface BenchmarkSample {
  scenarioKey: string;
  implementation: Implementation;
  metricKey: string;
  metricValue: number;
  unit: string;
  sampleIndex: number;
  recordedAt: string;
}

export interface BenchmarkRunConfig {
  suiteKey: string;
  rowCount: number;
  randomSeed: number;
  warmupRuns: number;
  measuredRuns: number;
}

export interface BenchmarkEnvironment {
  browserName: string;
  browserVersion: string;
  viewport: { width: number; height: number };
  userAgent: string;
  hardwareConcurrency: number;
  deviceMemoryGb: number | null;
  buildType: 'development' | 'production';
  timestamp: string;
}

export interface BenchmarkRun {
  id: string;
  suiteKey: string;
  datasetProfileId: string | null;
  datasetName?: string | null;
  source?: 'local' | 'api';
  rowCount: number;
  randomSeed: number | null;
  buildId: string | null;
  environment: BenchmarkEnvironment;
  startedAt: string;
  createdAt: string;
  methodologyVersion: string;
  samples: BenchmarkSample[];
}

export interface MetricSummary {
  metricKey: string;
  unit: string;
  sampleCount: number;
  mean: number;
  median: number;
  p95: number;
  min: number;
  max: number;
}

export interface ComparisonResult {
  metricKey: string;
  unit: string;
  baseline: MetricSummary;
  optimized: MetricSummary;
  absoluteDifference: number;
  percentageChange: number | null;
  speedupRatio: number | null;
  direction: 'improvement' | 'regression' | 'neutral';
  warning?: string;
}

export interface ColumnStats {
  column: string;
  type: ColumnSchema['type'];
  count: number;
  missing: number;
  unique: number;
  min?: number;
  max?: number;
  mean?: number;
  topValues?: Array<{ value: string; count: number }>;
}

export type MethodologyBadge = 'measured_locally' | 'sample_fixture' | 'benchmark_incomplete';
