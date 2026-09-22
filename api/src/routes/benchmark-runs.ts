import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { eq, desc, lt, and } from 'drizzle-orm';
import crypto from 'node:crypto';
import { db } from '../db/client.js';
import { benchmarkRuns, benchmarkSamples } from '../db/schema.js';

const sampleSchema = z.object({
  scenarioKey: z.string().min(1),
  implementation: z.enum(['baseline', 'optimized']),
  metricKey: z.string().min(1),
  metricValue: z.number().nonnegative(),
  unit: z.string().min(1),
  sampleIndex: z.number().int().nonnegative(),
  recordedAt: z.string().datetime().optional(),
});

const createRunSchema = z.object({
  suiteKey: z.string().min(1),
  datasetProfileId: z.string().uuid().nullable().optional(),
  rowCount: z.number().int().nonnegative(),
  randomSeed: z.number().int().nullable().optional(),
  buildId: z.string().nullable().optional(),
  browserName: z.string().nullable().optional(),
  browserVersion: z.string().nullable().optional(),
  viewport: z.object({ width: z.number(), height: z.number() }).nullable().optional(),
  environment: z.record(z.unknown()).default({}),
  startedAt: z.string().datetime(),
  methodologyVersion: z.string().default('1.0.0'),
  samples: z.array(sampleSchema).min(1).max(2000), // Cap payload size
});

export const benchmarkRunsRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/benchmark-runs
  fastify.get('/api/benchmark-runs', async (req, reply) => {
    const querySchema = z.object({
      limit: z.coerce.number().int().min(1).max(50).default(20),
      cursor: z.string().datetime().optional(),
      suite: z.string().optional(),
    });

    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'VALIDATION_ERROR',
        message: 'Invalid query parameters',
        details: parsed.error.format(),
      });
    }

    const { limit, cursor, suite } = parsed.data;

    try {
      const conditions = [];
      if (suite) {
        conditions.push(eq(benchmarkRuns.suiteKey, suite));
      }
      if (cursor) {
        conditions.push(lt(benchmarkRuns.createdAt, new Date(cursor)));
      }

      const query = db
        .select()
        .from(benchmarkRuns)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(benchmarkRuns.createdAt))
        .limit(limit + 1);

      const items = await query;
      const hasNextPage = items.length > limit;
      const results = hasNextPage ? items.slice(0, limit) : items;
      const nextCursor = hasNextPage ? results[results.length - 1].createdAt.toISOString() : null;

      const responsePayload = {
        items: results,
        nextCursor,
        hasNextPage,
      };

      // Generate ETag for conditional request caching (304 Not Modified)
      const etag = `"${crypto.createHash('sha1').update(JSON.stringify(responsePayload)).digest('hex')}"`;
      reply.header('ETag', etag);
      reply.header('Cache-Control', 'private, must-revalidate');

      if (req.headers['if-none-match'] === etag) {
        return reply.status(304).send();
      }

      return reply.status(200).send(responsePayload);
    } catch (err: unknown) {
      req.log.error(err, 'Failed to fetch benchmark runs');
      return reply.status(500).send({
        error: 'DATABASE_ERROR',
        message: 'Failed to retrieve benchmark runs',
      });
    }
  });

  // POST /api/benchmark-runs — atomic transaction
  fastify.post('/api/benchmark-runs', async (req, reply) => {
    const parsed = createRunSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'VALIDATION_ERROR',
        message: 'Invalid benchmark run payload',
        details: parsed.error.format(),
      });
    }

    const data = parsed.data;

    try {
      // Execute within an atomic transaction
      const result = await db.transaction(async (tx) => {
        const [run] = await tx
          .insert(benchmarkRuns)
          .values({
            suiteKey: data.suiteKey,
            datasetProfileId: data.datasetProfileId ?? null,
            rowCount: data.rowCount,
            randomSeed: data.randomSeed ?? null,
            buildId: data.buildId ?? null,
            browserName: data.browserName ?? null,
            browserVersion: data.browserVersion ?? null,
            viewport: data.viewport ?? null,
            environment: data.environment,
            startedAt: new Date(data.startedAt),
            methodologyVersion: data.methodologyVersion,
          })
          .returning();

        const samplesToInsert = data.samples.map((s) => ({
          runId: run.id,
          scenarioKey: s.scenarioKey,
          implementation: s.implementation,
          metricKey: s.metricKey,
          metricValue: s.metricValue,
          unit: s.unit,
          sampleIndex: s.sampleIndex,
          recordedAt: s.recordedAt ? new Date(s.recordedAt) : new Date(),
        }));

        await tx.insert(benchmarkSamples).values(samplesToInsert);

        return run;
      });

      return reply.status(201).send({
        ...result,
        sampleCount: data.samples.length,
      });
    } catch (err: unknown) {
      req.log.error(err, 'Transaction failed for benchmark run creation');
      return reply.status(500).send({
        error: 'TRANSACTION_FAILED',
        message: 'Failed to atomically persist benchmark run and samples',
      });
    }
  });

  // GET /api/benchmark-runs/:id
  fastify.get('/api/benchmark-runs/:id', async (req, reply) => {
    const paramsSchema = z.object({ id: z.string().uuid() });
    const parsedParams = paramsSchema.safeParse(req.params);
    if (!parsedParams.success) {
      return reply.status(400).send({ error: 'INVALID_ID', message: 'Invalid run UUID' });
    }

    const { id } = parsedParams.data;

    try {
      const [run] = await db.select().from(benchmarkRuns).where(eq(benchmarkRuns.id, id));
      if (!run) {
        return reply.status(404).send({ error: 'NOT_FOUND', message: 'Benchmark run not found' });
      }

      const samples = await db
        .select()
        .from(benchmarkSamples)
        .where(eq(benchmarkSamples.runId, id))
        .orderBy(benchmarkSamples.sampleIndex);

      return reply.status(200).send({
        ...run,
        samples,
      });
    } catch (err: unknown) {
      req.log.error(err, 'Failed to fetch benchmark run details');
      return reply.status(500).send({
        error: 'DATABASE_ERROR',
        message: 'Failed to retrieve benchmark run details',
      });
    }
  });

  // GET /api/benchmark-runs/:id/summary
  fastify.get('/api/benchmark-runs/:id/summary', async (req, reply) => {
    const paramsSchema = z.object({ id: z.string().uuid() });
    const parsedParams = paramsSchema.safeParse(req.params);
    if (!parsedParams.success) {
      return reply.status(400).send({ error: 'INVALID_ID', message: 'Invalid run UUID' });
    }

    const { id } = parsedParams.data;

    try {
      const [run] = await db.select().from(benchmarkRuns).where(eq(benchmarkRuns.id, id));
      if (!run) {
        return reply.status(404).send({ error: 'NOT_FOUND', message: 'Benchmark run not found' });
      }

      const samples = await db
        .select()
        .from(benchmarkSamples)
        .where(eq(benchmarkSamples.runId, id));

      // Calculate statistical aggregations
      const summaries: Record<string, { baseline: number[]; optimized: number[]; unit: string }> = {};

      for (const s of samples) {
        const key = `${s.scenarioKey}:${s.metricKey}`;
        if (!summaries[key]) {
          summaries[key] = { baseline: [], optimized: [], unit: s.unit };
        }
        if (s.implementation === 'baseline') {
          summaries[key].baseline.push(s.metricValue);
        } else {
          summaries[key].optimized.push(s.metricValue);
        }
      }

      const calcMedian = (arr: number[]) => {
        if (arr.length === 0) return 0;
        const sorted = [...arr].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
      };

      const calcMean = (arr: number[]) => (arr.length === 0 ? 0 : arr.reduce((s, v) => s + v, 0) / arr.length);

      const metricsSummary = Object.entries(summaries).map(([key, data]) => {
        const [scenarioKey, metricKey] = key.split(':');
        const bMedian = calcMedian(data.baseline);
        const oMedian = calcMedian(data.optimized);
        const bMean = calcMean(data.baseline);
        const oMean = calcMean(data.optimized);

        const diff = bMedian - oMedian;
        const percentageReduction = bMedian > 0 ? (diff / bMedian) * 100 : null;
        const speedup = oMedian > 0 ? bMedian / oMedian : null;

        return {
          scenarioKey,
          metricKey,
          unit: data.unit,
          baseline: {
            sampleCount: data.baseline.length,
            median: bMedian,
            mean: bMean,
          },
          optimized: {
            sampleCount: data.optimized.length,
            median: oMedian,
            mean: oMean,
          },
          absoluteDifference: diff,
          percentageReduction,
          speedupRatio: speedup,
        };
      });

      return reply.status(200).send({
        runId: run.id,
        suiteKey: run.suiteKey,
        rowCount: run.rowCount,
        metrics: metricsSummary,
      });
    } catch (err: unknown) {
      req.log.error(err, 'Failed to compute run summary');
      return reply.status(500).send({
        error: 'DATABASE_ERROR',
        message: 'Failed to compute benchmark summary',
      });
    }
  });
};
