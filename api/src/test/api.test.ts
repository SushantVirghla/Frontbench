import { describe, it, expect } from 'vitest';
import { buildApp } from '../app.js';

describe('Fastify REST API endpoints', () => {
  const app = buildApp();

  it('GET /api/health returns service status without leaking credentials', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/health',
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.status).toBe('ok');
    expect(body.service).toBe('frontbench-api');
    expect(body.timestamp).toBeDefined();
    expect(body.database).toBeDefined();
    expect(body.database.connected).toBeDefined();
    // Verify no secret variables leaked
    expect(body).not.toHaveProperty('DATABASE_URL');
    expect(body).not.toHaveProperty('password');
  });

  it('POST /api/dataset-profiles strictly rejects requests with raw row data', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/dataset-profiles',
      payload: {
        name: 'Violating Dataset',
        sourceType: 'local_csv',
        rowCount: 10,
        columns: [{ name: 'id', type: 'string', nullable: false }],
        rows: [{ id: '1', secret: 'leaked cell value' }], // Forbidden!
      },
    });

    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body.error).toBe('PRIVACY_VIOLATION');
    expect(body.message).toContain('strictly prohibited');
  });

  it('POST /api/dataset-profiles rejects negative row counts', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/dataset-profiles',
      payload: {
        name: 'Negative Count',
        sourceType: 'synthetic',
        rowCount: -5,
        columns: [{ name: 'id', type: 'string', nullable: false }],
      },
    });

    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body.error).toBe('VALIDATION_ERROR');
  });

  it('POST /api/benchmark-runs rejects empty sample arrays', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/benchmark-runs',
      payload: {
        suiteKey: 'experiment_a',
        rowCount: 1000,
        startedAt: new Date().toISOString(),
        samples: [], // At least 1 required
      },
    });

    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body.error).toBe('VALIDATION_ERROR');
  });
});
