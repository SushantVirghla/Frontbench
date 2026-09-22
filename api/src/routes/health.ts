import type { FastifyPluginAsync } from 'fastify';
import { checkDatabaseConnection } from '../db/client.js';

export const healthRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/api/health', async (_req, reply) => {
    const dbStatus = await checkDatabaseConnection();
    return reply.status(200).send({
      status: 'ok',
      service: 'frontbench-api',
      timestamp: new Date().toISOString(),
      database: {
        connected: dbStatus.connected,
      },
    });
  });
};
