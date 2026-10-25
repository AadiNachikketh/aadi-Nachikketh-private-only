import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.ts';

declare global {
  var _postgresPool: Pool | undefined;
}

export const createPool = () => {
  if (!global._postgresPool) {
    global._postgresPool = new Pool({
      host: process.env.SQL_HOST,
      user: process.env.SQL_USER,
      password: process.env.SQL_PASSWORD,
      database: process.env.SQL_DB_NAME,
      max: 5,
      idleTimeoutMillis: 8000,
      connectionTimeoutMillis: 20000,
      keepAlive: true,
      allowExitOnIdle: true,
    });

    global._postgresPool.on('error', () => {
      // Cloud SQL proxy may close idle connections during scale-to-zero or idle periods.
      // pg.Pool automatically evicts the closed idle client and creates a fresh connection on next query.
    });
  }
  return global._postgresPool;
};

const pool = createPool();

export const db = drizzle(pool, { schema });

export async function withDbRetry<T>(operation: () => Promise<T>, retries = 2): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await operation();
    } catch (err: unknown) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      const isTransient =
        msg.includes('Connection terminated') ||
        msg.includes('ECONNRESET') ||
        msg.includes('ETIMEDOUT') ||
        msg.includes('connection error') ||
        msg.includes('terminating connection');
      if (!isTransient || attempt === retries) {
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
    }
  }
  throw lastError;
}
