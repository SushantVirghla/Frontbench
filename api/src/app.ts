import fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { env } from './config/env.js';
import { healthRoutes } from './routes/health.js';
import { datasetProfileRoutes } from './routes/dataset-profiles.js';
import { benchmarkRunsRoutes } from './routes/benchmark-runs.js';

export function buildApp() {
  const app = fastify({
    logger: {
      level: env.NODE_ENV === 'test' ? 'silent' : 'info',
      redact: ['req.headers.authorization', 'req.headers.cookie'],
    },
    bodyLimit: 5 * 1024 * 1024, // 5 MB payload cap
  });

  // Security headers
  app.register(helmet, {
    contentSecurityPolicy: false, // Handled by frontend if needed
  });

  // Narrow CORS configuration
  app.register(cors, {
    origin: [env.CORS_ORIGIN, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: true,
  });

  // Rate limiting to protect write endpoints from abuse
  app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  // Global consistent error envelope
  app.setErrorHandler((error, _request, reply) => {
    app.log.error(error);
    const err = error as { statusCode?: number; name?: string; message?: string };
    const statusCode = err.statusCode || 500;
    return reply.status(statusCode).send({
      error: err.name || 'INTERNAL_SERVER_ERROR',
      message: err.message || 'An unexpected server error occurred',
      statusCode,
    });
  });

  // Register feature routes
  app.register(healthRoutes);
  app.register(datasetProfileRoutes);
  app.register(benchmarkRunsRoutes);

  return app;
}
