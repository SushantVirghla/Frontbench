import {
  pgTable,
  uuid,
  text,
  bigint,
  jsonb,
  timestamp,
  doublePrecision,
  integer,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const datasetProfiles = pgTable('dataset_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  sourceType: text('source_type').notNull(), // 'synthetic' | 'local_csv'
  rowCount: bigint('row_count', { mode: 'number' }).notNull(),
  columns: jsonb('columns').notNull(), // ColumnSchema[] snapshot
  byteSize: bigint('byte_size', { mode: 'number' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const benchmarkRuns = pgTable(
  'benchmark_runs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    suiteKey: text('suite_key').notNull(),
    datasetProfileId: uuid('dataset_profile_id').references(() => datasetProfiles.id, {
      onDelete: 'set null',
    }),
    rowCount: bigint('row_count', { mode: 'number' }).notNull(),
    randomSeed: bigint('random_seed', { mode: 'number' }),
    buildId: text('build_id'),
    browserName: text('browser_name'),
    browserVersion: text('browser_version'),
    viewport: jsonb('viewport'),
    environment: jsonb('environment').notNull().default({}),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    methodologyVersion: text('methodology_version').notNull(),
  },
  (table) => [
    index('idx_benchmark_runs_suite_created').on(table.suiteKey, table.createdAt),
  ]
);

export const benchmarkSamples = pgTable(
  'benchmark_samples',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    runId: uuid('run_id')
      .notNull()
      .references(() => benchmarkRuns.id, { onDelete: 'cascade' }),
    scenarioKey: text('scenario_key').notNull(),
    implementation: text('implementation').notNull(), // 'baseline' | 'optimized'
    metricKey: text('metric_key').notNull(),
    metricValue: doublePrecision('metric_value').notNull(),
    unit: text('unit').notNull(),
    sampleIndex: integer('sample_index').notNull(),
    recordedAt: timestamp('recorded_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('idx_samples_run_scenario_impl_metric_idx').on(
      table.runId,
      table.scenarioKey,
      table.implementation,
      table.metricKey,
      table.sampleIndex
    ),
    index('idx_samples_run_lookup').on(
      table.runId,
      table.scenarioKey,
      table.implementation,
      table.metricKey
    ),
  ]
);

export const datasetProfilesRelations = relations(datasetProfiles, ({ many }) => ({
  benchmarkRuns: many(benchmarkRuns),
}));

export const benchmarkRunsRelations = relations(benchmarkRuns, ({ one, many }) => ({
  datasetProfile: one(datasetProfiles, {
    fields: [benchmarkRuns.datasetProfileId],
    references: [datasetProfiles.id],
  }),
  samples: many(benchmarkSamples),
}));

export const benchmarkSamplesRelations = relations(benchmarkSamples, ({ one }) => ({
  run: one(benchmarkRuns, {
    fields: [benchmarkSamples.runId],
    references: [benchmarkRuns.id],
  }),
}));
