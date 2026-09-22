import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { env } from '../config/env.js';
import * as schema from './schema.js';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 3000,
});

export const db = drizzle(pool, { schema });

export async function checkDatabaseConnection(): Promise<{ connected: boolean; error?: string }> {
  try {
    const client = await pool.connect();
    try {
      await client.query('SELECT 1');
      return { connected: true };
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { connected: false, error: msg };
  }
}
