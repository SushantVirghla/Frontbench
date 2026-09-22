import { pool } from './client.js';

const MIGRATION_SQL = `
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table 1: dataset_profiles (metadata only, no raw rows)
CREATE TABLE IF NOT EXISTS dataset_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('synthetic', 'local_csv')),
  row_count BIGINT NOT NULL CHECK (row_count >= 0),
  columns JSONB NOT NULL,
  byte_size BIGINT NULL CHECK (byte_size IS NULL OR byte_size >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table 2: benchmark_runs
CREATE TABLE IF NOT EXISTS benchmark_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  suite_key TEXT NOT NULL,
  dataset_profile_id UUID NULL REFERENCES dataset_profiles(id) ON DELETE SET NULL,
  row_count BIGINT NOT NULL CHECK (row_count >= 0),
  random_seed BIGINT NULL,
  build_id TEXT NULL,
  browser_name TEXT NULL,
  browser_version TEXT NULL,
  viewport JSONB NULL,
  environment JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  methodology_version TEXT NOT NULL
);

-- Index for history listing queries
CREATE INDEX IF NOT EXISTS idx_benchmark_runs_suite_created
  ON benchmark_runs (suite_key, created_at DESC);

-- Table 3: benchmark_samples
CREATE TABLE IF NOT EXISTS benchmark_samples (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  run_id UUID NOT NULL REFERENCES benchmark_runs(id) ON DELETE CASCADE,
  scenario_key TEXT NOT NULL,
  implementation TEXT NOT NULL CHECK (implementation IN ('baseline', 'optimized')),
  metric_key TEXT NOT NULL,
  metric_value DOUBLE PRECISION NOT NULL CHECK (metric_value >= 0),
  unit TEXT NOT NULL,
  sample_index INTEGER NOT NULL CHECK (sample_index >= 0),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_sample_unique UNIQUE (run_id, scenario_key, implementation, metric_key, sample_index)
);

-- Index for lookup and aggregations per run
CREATE INDEX IF NOT EXISTS idx_samples_run_lookup
  ON benchmark_samples (run_id, scenario_key, implementation, metric_key);
`;

export async function runMigrations() {
  console.log('Running database migrations...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(MIGRATION_SQL);
    await client.query('COMMIT');
    console.log('✓ Database migrations applied successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err);
    throw err;
  } finally {
    client.release();
  }
}

if (process.argv[1]?.endsWith('migrate.ts') || process.argv[1]?.endsWith('migrate.js')) {
  runMigrations()
    .then(() => pool.end())
    .catch(() => process.exit(1));
}
