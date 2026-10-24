import pg from 'pg';
import { config } from '../config/env';

const { Pool } = pg;

export interface DbStatus {
  connected: boolean;
  database: string;
  host: string;
  port: number;
  error?: string;
}

let pool: pg.Pool | null = null;
let isConnected = false;
let lastError: string | undefined;

export function getPool(): pg.Pool {
  if (!pool) {
    if (config.db.connectionString) {
      pool = new Pool({
        connectionString: config.db.connectionString,
        ssl: config.db.ssl,
      });
    } else {
      pool = new Pool({
        host: config.db.host,
        port: config.db.port,
        user: config.db.user,
        password: config.db.password,
        database: config.db.database,
        ssl: config.db.ssl,
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 3000,
      });
    }

    pool.on('error', (err) => {
      console.warn('[PostgreSQL Pool Error]', err.message);
      isConnected = false;
      lastError = err.message;
    });
  }
  return pool;
}

export async function testConnection(): Promise<DbStatus> {
  try {
    const p = getPool();
    const client = await p.connect();
    try {
      await client.query('SELECT 1');
      isConnected = true;
      lastError = undefined;
      return {
        connected: true,
        database: config.db.database,
        host: config.db.host,
        port: config.db.port,
      };
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    isConnected = false;
    const msg = err instanceof Error ? err.message : String(err);
    lastError = msg;
    return {
      connected: false,
      database: config.db.database,
      host: config.db.host,
      port: config.db.port,
      error: msg,
    };
  }
}

export function isDbConnected(): boolean {
  return isConnected;
}

export function getLastError(): string | undefined {
  return lastError;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    isConnected = false;
  }
}
