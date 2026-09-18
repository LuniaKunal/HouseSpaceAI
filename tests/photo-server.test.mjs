import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import http from 'node:http';
import sharp from 'sharp';
import { createPhotoServer } from '../server/photo-design.mjs';

const png = (await sharp({ create: { width: 12, height: 8, channels: 3, background: '#ccbbaa' } }).png().toBuffer()).toString('base64');
function input() { return { requestId: randomUUID(), designId: randomUUID(), sourceDataUrl: `data:image/png;base64,${png}`, settings: { roomType: 'Living room', styleId: 'warm', instruction: '' }, confirmApiCost: true }; }
async function setup(t, options = {}) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'housespace-photo-test-'));
  const server = await createPhotoServer({ directory, apiKey: 'test-only-key', ...options });
  await server.listen({ port: 0, host: '127.0.0.1' });
  t.after(async () => { await await server.close(); await rm(directory, { recursive: true, force: true }); });
  const origin = `http://127.0.0.1:${server.server.address().port}`;
  return { directory, request: (route, value, headers = {}, method = value ? 'POST' : 'GET') => new Promise((resolve, reject) => {
    const req = http.request(origin + '/api/photo-design' + route, { method, headers: { Host: 'localhost:4173', Origin: 'http://localhost:4173', 'x-housespace-photo': '1', ...(value ? { 'Content-Type': 'application/json' } : {}), ...headers } }, res => {
      const chunks = []; res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(new Response(Buffer.concat(chunks), { status: res.statusCode, headers: res.headers })));
    });
    req.on('error', reject); req.end(value ? JSON.stringify(value) : undefined);
  }) };
}
async function waitFor(request, id, status) {
  for (let i = 0; i < 100; i++) {
    const result = await (await request(`/jobs/${id}`)).json();
    if (result.status === status) return result;
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  assert.fail(`Job did not reach ${status}`);
}

test('OpenAI edit contract, duplicate protection, output persistence and deletion', async t => {
  let calls = 0;
  const { request, directory } = await setup(t, { fetchImpl: async (url, options) => {
    calls++; assert.equal(url, 'https://api.openai.com/v1/images/edits');
    assert.equal(options.body.get('model'), 'gpt-image-1-mini'); assert.equal(options.body.get('quality'), 'low');
    assert.equal(options.body.get('n'), '1'); assert.equal(options.body.get('output_format'), 'jpeg');
    assert.ok(options.body.get('image[]') instanceof Blob); assert.match(options.body.get('prompt'), /Preserve the camera/);
    return new Response(JSON.stringify({ data: [{ b64_json: png }], usage: { input_tokens: 10 } }), { headers: { 'x-request-id': 'upstream-test' } });
  } });
  const value = input(); assert.equal((await request('/jobs', value)).status, 202);
  await waitFor(request, value.requestId, 'succeeded');
  assert.equal((await request('/jobs', value)).status, 200); assert.equal(calls, 1);
  assert.equal((await request('/jobs', { ...value, settings: { ...value.settings, instruction: 'Different' } })).status, 409);
  const image = await request(`/jobs/${value.requestId}/image`); assert.equal(image.status, 200); assert.equal(image.headers.get('content-type'), 'image/jpeg');
  assert.equal((await sharp(Buffer.from(await image.arrayBuffer())).metadata()).width, 12);
  const stored = await readFile(path.join(directory, `${value.requestId}.json`), 'utf8');
  assert.ok(!stored.includes('test-only-key')); assert.ok(!stored.includes(png));
  assert.equal((await request(`/jobs/${value.requestId}`, undefined, {}, 'DELETE')).status, 200);
  assert.equal((await request(`/jobs/${value.requestId}/image`)).status, 409);
  assert.equal((await (await request('/jobs', value)).json()).status, 'deleted'); assert.equal(calls, 1);
});

test('one active request, consent, daily limits and unsafe origins', async t => {
  let finish; const held = new Promise(resolve => { finish = resolve; });
  const { request } = await setup(t, { dailyLimit: 1, fetchImpl: () => held });
  assert.equal((await request('/config', undefined, { Origin: 'https://untrusted.example' })).status, 403);
  assert.equal((await request('/config', undefined, { Host: 'attacker.example:4173' })).status, 403);
  assert.equal((await request('/jobs', { ...input(), confirmApiCost: false })).status, 400);
  assert.equal((await request('/jobs', { ...input(), sourceDataUrl: 'https://example.com/image.png' })).status, 400);
  const value = input(); assert.equal((await request('/jobs', value)).status, 202);
  assert.equal((await request('/jobs', input())).status, 409);
  assert.equal((await request(`/jobs/${value.requestId}`, undefined, {}, 'DELETE')).status, 409);
  finish(new Response(JSON.stringify({ data: [{ b64_json: png }] })));
  await waitFor(request, value.requestId, 'succeeded');
  assert.equal((await request('/jobs', input())).status, 429);
});

test('missing key, rejected credentials and ambiguous transport do not fake success', async t => {
  const missing = await setup(t, { apiKey: '' });
  assert.equal((await (await missing.request('/config')).json()).configured, false);
  assert.equal((await missing.request('/jobs', input())).status, 503);
  const denied = await setup(t, { fetchImpl: async () => new Response('{}', { status: 401 }) });
  const value = input(); await denied.request('/jobs', value); const failed = await waitFor(denied.request, value.requestId, 'failed'); assert.match(failed.error, /API key/);
  let calls = 0;
  const interrupted = await setup(t, { fetchImpl: async () => { calls++; throw new Error('timeout'); } });
  const ambiguous = input(); await interrupted.request('/jobs', ambiguous);
  await waitFor(interrupted.request, ambiguous.requestId, 'unknown');
  await interrupted.request('/jobs', ambiguous); assert.equal(calls, 1);
});

test('startup preserves unknown outcome instead of regenerating paid work', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'housespace-photo-restart-'));
  const id = randomUUID(); await writeFile(path.join(directory, `${id}.json`), JSON.stringify({ id, status: 'running', createdAt: new Date().toISOString() }));
  const server = await createPhotoServer({ directory, apiKey: '', fetchImpl: async () => { assert.fail('Must not resubmit'); } });
  t.after(async () => { await server.close(); await rm(directory, { recursive: true, force: true }); });
  const recovered = JSON.parse(await readFile(path.join(directory, `${id}.json`), 'utf8'));
  assert.equal(recovered.status, 'unknown'); assert.match(recovered.error, /restarted/);
});
