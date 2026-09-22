import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { desc, lt } from 'drizzle-orm';
import { db } from '../db/client.js';
import { datasetProfiles } from '../db/schema.js';

const columnSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['string', 'number', 'date', 'boolean']),
  nullable: z.boolean(),
});

const createProfileSchema = z
  .object({
    name: z.string().min(1).max(255),
    sourceType: z.enum(['synthetic', 'local_csv']),
    rowCount: z.number().int().nonnegative(),
    columns: z.array(columnSchema).min(1),
    byteSize: z.number().int().nonnegative().nullable().optional(),
    // Privacy protection: explicitly forbid raw row payloads
    rows: z.never().optional(),
    data: z.never().optional(),
    records: z.never().optional(),
    content: z.never().optional(),
    file: z.never().optional(),
  })
  .strict();

export const datasetProfileRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/dataset-profiles
  fastify.get('/api/dataset-profiles', async (req, reply) => {
    const querySchema = z.object({
      limit: z.coerce.number().int().min(1).max(50).default(20),
      cursor: z.string().datetime().optional(),
    });

    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'VALIDATION_ERROR',
        message: 'Invalid query parameters',
        details: parsed.error.format(),
      });
    }

    const { limit, cursor } = parsed.data;

    try {
      const query = db
        .select()
        .from(datasetProfiles)
        .orderBy(desc(datasetProfiles.createdAt))
        .limit(limit + 1);

      const items = cursor
        ? await query.where(lt(datasetProfiles.createdAt, new Date(cursor)))
        : await query;

      const hasNextPage = items.length > limit;
      const results = hasNextPage ? items.slice(0, limit) : items;
      const nextCursor = hasNextPage ? results[results.length - 1].createdAt.toISOString() : null;

      return reply.status(200).send({
        items: results,
        nextCursor,
        hasNextPage,
      });
    } catch (err: unknown) {
      req.log.error(err, 'Failed to fetch dataset profiles');
      return reply.status(500).send({
        error: 'DATABASE_ERROR',
        message: 'Failed to retrieve dataset profiles from database',
      });
    }
  });

  // POST /api/dataset-profiles
  fastify.post('/api/dataset-profiles', async (req, reply) => {
    // Check if raw payload was sent
    const body = req.body as Record<string, unknown> | null;
    if (body && ('rows' in body || 'records' in body || 'content' in body || 'data' in body)) {
      return reply.status(400).send({
        error: 'PRIVACY_VIOLATION',
        message:
          'Raw dataset rows or file contents are strictly prohibited. FrontBench stores records exclusively in browser IndexedDB.',
      });
    }

    const parsed = createProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'VALIDATION_ERROR',
        message: 'Invalid dataset profile payload',
        details: parsed.error.format(),
      });
    }

    const { name, sourceType, rowCount, columns, byteSize } = parsed.data;

    try {
      const [inserted] = await db
        .insert(datasetProfiles)
        .values({
          name,
          sourceType,
          rowCount,
          columns,
          byteSize: byteSize ?? null,
        })
        .returning();

      return reply.status(201).send(inserted);
    } catch (err: unknown) {
      req.log.error(err, 'Failed to insert dataset profile');
      return reply.status(500).send({
        error: 'DATABASE_ERROR',
        message: 'Failed to persist dataset profile',
      });
    }
  });
};
