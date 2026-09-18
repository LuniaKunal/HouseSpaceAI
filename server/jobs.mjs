import { mkdir, readdir, readFile, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';
import { PgBoss } from 'pg-boss';
import { databaseOptions } from './database.mjs';

const expiredMessage = 'Generation was interrupted. The API outcome is unknown; this request will not be resubmitted.';
export const problem = (message, status = 400) => Object.assign(new Error(message), { status });
function checkAdmission(jobs, job, limit, userLimit) {
  const existing = jobs.find(item => item.id === job.id);
  if (existing) {
    if (existing.owner !== job.owner) throw problem('Generation request not found.', 404);
    if (existing.fingerprint !== job.fingerprint) throw problem('This request ID was already used with different inputs.', 409);
    return existing;
  }
  if (jobs.some(item => item.owner === job.owner && ['queued', 'running'].includes(item.status))) throw problem('One image is already generating. Wait for it to finish.', 409);
  const today = jobs.filter(item => item.createdAt.slice(0, 10) === job.createdAt.slice(0, 10));
  if (today.length >= limit || today.filter(item => item.owner === job.owner).length >= userLimit) throw problem('Daily image-attempt limit reached. It resets at midnight UTC.', 429);
}

// Both implementations reserve an attempt before dispatch. Postgres writes the
// reservation and pg-boss message in one transaction; local mode uses atomic files.
export async function createJobs({ directory, databaseUrl, dailyLimit, userLimit, queueName = 'photo-generation' }) {
  const queue = queueName;
  let handler;
  if (databaseUrl) {
    const connection = databaseOptions(databaseUrl);
    const pool = new pg.Pool({ ...connection, max: 4, connectionTimeoutMillis: 10000 });
    pool.on('error', () => console.error('Photo database connection interrupted.'));
    const boss = new PgBoss({ ...connection, max: 2 });
    boss.on('error', () => console.error('Photo queue error; check database connectivity.'));
    try { await pool.query('select 1 from private.photo_jobs limit 0'); await boss.start(); await boss.createQueue(queue, { retryLimit: 2, expireInSeconds: 300 }); }
    catch (error) { await boss.stop().catch(() => {}); await pool.end(); throw error; }
    return {
      mode: 'postgres',
      async get(id) { return (await pool.query('select data from private.photo_jobs where id=$1', [id])).rows[0]?.data; },
      async list(owner) { return (await pool.query('select data from private.photo_jobs where owner_id=$1 order by created_at desc limit 100', [owner])).rows.map(row => row.data); },
      async count(owner) { return Number((await pool.query("select count(*) from private.photo_jobs where owner_id=$1 and created_at >= date_trunc('day', now() at time zone 'UTC') at time zone 'UTC'", [owner])).rows[0].count); },
      async save(job) { await pool.query('update private.photo_jobs set data=$2 where id=$1', [job.id, job]); },
      async reserve(job) {
        const client = await pool.connect();
        try {
          await client.query('begin');
          await client.query('select pg_advisory_xact_lock(741937)');
          const rows = await client.query("select data from private.photo_jobs where id=$1 or created_at >= date_trunc('day', now() at time zone 'UTC') at time zone 'UTC' or (owner_id=$2 and data->>'status' in ('queued','running'))", [job.id, job.owner]);
          const existing = checkAdmission(rows.rows.map(row => row.data), job, dailyLimit, userLimit);
          if (existing) { await client.query('commit'); return { job: existing, created: false }; }
          await client.query('insert into private.photo_jobs(id,owner_id,created_at,data) values($1,$2,$3,$4)', [job.id, job.owner, job.createdAt, job]);
          // Retrying queue delivery is safe: claim() never dispatches a provider
          // call twice. A job already claimed stays running/unknown, never queued.
          await boss.send(queue, { id: job.id }, { retryLimit: 2, expireInSeconds: 300, db: { executeSql: (sql, values) => client.query(sql, values) } });
          await client.query('commit'); return { job, created: true };
        } catch (error) { await client.query('rollback'); throw error; } finally { client.release(); }
      },
      async claim(id) {
        return (await pool.query("update private.photo_jobs set data=data || jsonb_build_object('status','running','startedAt',now()) where id=$1 and data->>'status'='queued' returning data", [id])).rows[0]?.data;
      },
      async recover() {
        await pool.query("update private.photo_jobs set data=data || jsonb_build_object('status','unknown','error',$1::text) where data->>'status'='running' and (data->>'startedAt')::timestamptz < now() - interval '6 minutes'", [expiredMessage]);
      },
      async start(work) { handler = work; await boss.work(queue, { batchSize: 1, pollingIntervalSeconds: 1 }, async jobs => { for (const job of jobs) await handler(job.data.id); }); },
      async close() { await boss.stop({ graceful: true, timeout: 260000 }); await pool.end(); },
    };
  }
  await mkdir(directory, { recursive: true });
  const jobs = new Map(); let pending = Promise.resolve(); let working = Promise.resolve(); let closed = false;
  const save = async job => { const file = path.join(directory, `${job.id}.json`); await writeFile(`${file}.tmp`, JSON.stringify(job)); await rename(`${file}.tmp`, file); jobs.set(job.id, structuredClone(job)); };
  for (const name of await readdir(directory)) {
    if (!/^[a-f0-9-]{36}\.json$/i.test(name)) continue;
    const job = JSON.parse(await readFile(path.join(directory, name), 'utf8')); job.owner ||= 'local';
    if (job.status === 'running') { job.status = 'unknown'; job.error = `Server restarted. ${expiredMessage}`; await save(job); }
    jobs.set(job.id, job);
  }
  const dispatch = id => { working = working.then(() => !closed && handler(id)).catch(() => console.error('Photo worker could not persist a job.')); };
  return {
    mode: 'local', get: async id => structuredClone(jobs.get(id)), list: async owner => [...jobs.values()].filter(job => job.owner === owner).map(job => structuredClone(job)),
    count: async owner => [...jobs.values()].filter(job => job.owner === owner && job.createdAt.slice(0, 10) === new Date().toISOString().slice(0, 10)).length,
    save,
    reserve(job) {
      const result = pending.then(async () => { const existing = checkAdmission([...jobs.values()], job, dailyLimit, userLimit); if (existing) return { job: existing, created: false }; await save(job); dispatch(job.id); return { job, created: true }; });
      pending = result.catch(() => {}); return result;
    },
    async claim(id) { const job = structuredClone(jobs.get(id)); if (job?.status !== 'queued') return; job.status = 'running'; job.startedAt = new Date().toISOString(); await save(job); return job; },
    async recover() {},
    async start(work) { handler = work; for (const job of jobs.values()) if (job.status === 'queued') dispatch(job.id); },
    async close() { closed = true; await working; },
  };
}
