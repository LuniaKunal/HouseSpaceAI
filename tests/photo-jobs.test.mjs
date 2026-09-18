import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { createJobs } from '../server/jobs.mjs';

const job = (owner = 'local') => ({ id: randomUUID(), owner, createdAt: new Date().toISOString(), status: 'queued', fingerprint: 'same-photo' });
test('parallel reservations preserve idempotency, owner isolation and the daily ledger', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'photo-queue-'));
  const jobs = await createJobs({ directory, dailyLimit: 2, userLimit: 1 });
  t.after(async () => { await jobs.close(); await rm(directory, { recursive: true, force: true }); });
  await jobs.start(async () => {});
  const first = job();
  const attempts = await Promise.all(Array.from({ length: 8 }, () => jobs.reserve(first)));
  assert.equal(attempts.filter(result => result.created).length, 1);
  await assert.rejects(jobs.reserve({ ...first, owner: 'someone-else' }), { status: 404 });
  await assert.rejects(jobs.reserve({ ...first, fingerprint: 'different-photo' }), { status: 409 });
  assert.equal((await jobs.claim(first.id)).status, 'running');
  assert.equal(await jobs.claim(first.id), undefined);
  await jobs.save({ ...first, status: 'deleted' });
  await assert.rejects(jobs.reserve(job()), { status: 429 });
  assert.equal(await jobs.count('local'), 1);
});

test('queued work resumes after restart; claimed work is never sent twice', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'photo-recovery-'));
  let jobs = await createJobs({ directory, dailyLimit: 10, userLimit: 10 });
  await jobs.start(async () => {});
  const queued = job('one'); const running = job('two');
  await jobs.reserve(queued); await jobs.reserve(running); await jobs.claim(running.id); await jobs.close();
  jobs = await createJobs({ directory, dailyLimit: 10, userLimit: 10 });
  t.after(async () => { await jobs.close(); await rm(directory, { recursive: true, force: true }); });
  const recovered = await jobs.get(running.id); assert.equal(recovered.status, 'unknown');
  const observed = new Promise(resolve => { void jobs.start(async id => { resolve(id); }); });
  assert.equal(await observed, queued.id);
  assert.equal(await jobs.claim(running.id), undefined);
});
