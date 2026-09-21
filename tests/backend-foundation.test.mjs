import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { buildApp } from '../server/app.mjs';
import { createPhotoServer } from '../server/photo-design.mjs';
import { listen } from '../server/runtime.mjs';

test('app construction is compatible, does not listen, and exposes liveness without secrets', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'housespace-foundation-'));
  const before = process.listenerCount('SIGTERM');
  const app = await buildApp({ directory, apiKey: '', databaseUrl: '', supabaseUrl: '', serviceKey: '', serveWeb: false });
  t.after(async () => { await app.close(); await rm(directory, { recursive: true, force: true }); });
  assert.equal(createPhotoServer, buildApp);
  assert.equal(app.server.listening, false);
  assert.equal(process.listenerCount('SIGTERM'), before);
  const health = await app.inject('/health');
  assert.equal(health.statusCode, 200);
  assert.deepEqual(health.json(), { status: 'ok' });
  assert.equal((await app.inject('/api/photo-design/jobs')).statusCode, 403);
  await listen(app, { port: 0 });
  assert.equal(app.server.listening, true);
  assert.equal(process.listenerCount('SIGTERM'), before + 1);
  await app.close();
  assert.equal(process.listenerCount('SIGTERM'), before);
});
