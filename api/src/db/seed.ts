import { pool, db } from './client.js';
import { datasetProfiles, benchmarkRuns, benchmarkSamples } from './schema.js';

async function seed() {
  console.log('Seeding demo benchmark history (clearly labeled as sample fixtures)...');

  try {
    // 1. Insert synthetic dataset profile
    const [profile] = await db
      .insert(datasetProfiles)
      .values({
        name: 'Seed Demo: 10k Synthetic Orders',
        sourceType: 'synthetic',
        rowCount: 10000,
        columns: [
          { name: 'id', type: 'string', nullable: false },
          { name: 'name', type: 'string', nullable: false },
          { name: 'email', type: 'string', nullable: false },
          { name: 'date', type: 'date', nullable: false },
          { name: 'amount', type: 'number', nullable: false },
        ],
        byteSize: 1024 * 850,
      })
      .returning();

    // 2. Insert demo benchmark run for Experiment A (Rendering)
    const [runA] = await db
      .insert(benchmarkRuns)
      .values({
        suiteKey: 'experiment_a_render',
        datasetProfileId: profile.id,
        rowCount: 10000,
        randomSeed: 42,
        buildId: 'v1.0.0-seed',
        browserName: 'Chrome',
        browserVersion: '131.0',
        viewport: { width: 1440, height: 900 },
        environment: {
          hardwareConcurrency: 8,
          deviceMemoryGb: 16,
          buildType: 'production',
          note: 'Seed sample fixture for demonstration',
        },
        startedAt: new Date(Date.now() - 3600000),
        methodologyVersion: '1.0.0',
      })
      .returning();

    // 3. Insert samples for Run A
    const samples = [];
    // 10 baseline samples (~120ms to ~145ms)
    for (let i = 0; i < 10; i++) {
      samples.push({
        runId: runA.id,
        scenarioKey: 'experiment_a_render',
        implementation: 'baseline' as const,
        metricKey: 'render_duration',
        metricValue: 125 + Math.sin(i) * 15,
        unit: 'ms',
        sampleIndex: i,
        recordedAt: new Date(),
      });
      samples.push({
        runId: runA.id,
        scenarioKey: 'experiment_a_render',
        implementation: 'baseline' as const,
        metricKey: 'dom_nodes_count',
        metricValue: 50000,
        unit: 'count',
        sampleIndex: i,
        recordedAt: new Date(),
      });
    }

    // 10 optimized samples (~2.5ms to ~4.5ms)
    for (let i = 0; i < 10; i++) {
      samples.push({
        runId: runA.id,
        scenarioKey: 'experiment_a_render',
        implementation: 'optimized' as const,
        metricKey: 'render_duration',
        metricValue: 3.2 + Math.cos(i) * 0.8,
        unit: 'ms',
        sampleIndex: i,
        recordedAt: new Date(),
      });
      samples.push({
        runId: runA.id,
        scenarioKey: 'experiment_a_render',
        implementation: 'optimized' as const,
        metricKey: 'dom_nodes_count',
        metricValue: 240,
        unit: 'count',
        sampleIndex: i,
        recordedAt: new Date(),
      });
    }

    await db.insert(benchmarkSamples).values(samples);

    console.log(`✓ Successfully seeded profile ${profile.id} and run ${runA.id} with ${samples.length} samples.`);
  } catch (err) {
    console.error('Seed error:', err);
  } finally {
    await pool.end();
  }
}

seed();
