import pg from 'pg';
import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { databaseOptions } from './database.mjs';

if (!process.env.DATABASE_URL) throw new Error('Set DATABASE_URL in .env.local first.');
const client = new pg.Client({ ...databaseOptions(process.env.DATABASE_URL), connectionTimeoutMillis: 10000 });
try {
  await client.connect();
  await client.query('begin');
  await client.query('select pg_advisory_xact_lock(741936)');
  await client.query('create schema if not exists private');
  await client.query('revoke all on schema private from public, anon, authenticated');
  await client.query('create table if not exists private.app_migrations(name text primary key, sha256 text not null, applied_at timestamptz not null default now())');
  const directory = new URL('../supabase/migrations/', import.meta.url);
  for (const name of (await readdir(directory)).filter(name => name.endsWith('.sql')).sort()) {
    const sql = await readFile(new URL(name, directory), 'utf8');
    const hash = createHash('sha256').update(sql).digest('hex');
    const previous = (await client.query('select sha256 from private.app_migrations where name=$1', [name])).rows[0];
    if (previous) { if (previous.sha256 !== hash) throw new Error(`Applied migration changed: ${name}`); continue; }
    await client.query(sql);
    await client.query('insert into private.app_migrations(name,sha256) values($1,$2)', [name, hash]);
    console.log(`Applied ${name}`);
  }
  await client.query('commit'); console.log('Database migrations are up to date.');
} catch (error) {
  await client.query('rollback').catch(() => {});
  console.error(`Migration failed (${error.code || 'configuration/connection error'}). No partial migration was committed.`);
  process.exitCode = 1;
} finally { await client.end(); }
