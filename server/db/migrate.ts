import fs from 'fs';
import path from 'path';
import pg from 'pg';
import { config } from '../config/env';
import { getPool, testConnection } from './pool';

export async function runMigrations(): Promise<{ success: boolean; message: string }> {
  // First ensure target database exists if using host/user
  if (!config.db.connectionString && config.db.password) {
    try {
      const rootClient = new pg.Client({
        host: config.db.host,
        port: config.db.port,
        user: config.db.user,
        password: config.db.password,
        database: 'postgres',
      });
      await rootClient.connect();
      const checkRes = await rootClient.query(
        `SELECT 1 FROM pg_database WHERE datname = $1`,
        [config.db.database]
      );
      if (checkRes.rowCount === 0) {
        await rootClient.query(`CREATE DATABASE "${config.db.database}"`);
        console.log(`[PostgreSQL] Database "${config.db.database}" created.`);
      }
      await rootClient.end();
    } catch (err) {
      // Ignore if db already exists or lack permissions to create db
      console.warn('[PostgreSQL Root DB check note]:', (err as Error).message);
    }
  }

  const connStatus = await testConnection();
  if (!connStatus.connected) {
    return {
      success: false,
      message: `Database connection unavailable: ${connStatus.error}`,
    };
  }

  const schemaPath = path.resolve(__dirname, 'schema.sql');
  const ddl = fs.readFileSync(schemaPath, 'utf8');

  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(ddl);
    await client.query('COMMIT');
    return {
      success: true,
      message: 'PostgreSQL schema migrations applied successfully.',
    };
  } catch (err: unknown) {
    await client.query('ROLLBACK');
    const msg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      message: `Migration failed: ${msg}`,
    };
  } finally {
    client.release();
  }
}

if (process.argv[1] && process.argv[1].endsWith('migrate.ts')) {
  runMigrations().then((res) => {
    console.log(res.message);
    process.exit(res.success ? 0 : 1);
  });
}
