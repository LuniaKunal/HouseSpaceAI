import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { PgBoss } from 'pg-boss';
import sharp from 'sharp';
import { createPhotoServer } from '../server/photo-design.mjs';
import { databaseOptions } from '../server/database.mjs';

test('live Supabase: private library, revision conflicts, pg-boss delivery and owner isolation', { skip: process.env.RUN_SUPABASE_TESTS !== '1', timeout: 90000 }, async t => {
  const url = process.env.SUPABASE_URL;
  const options = { auth: { persistSession: false, autoRefreshToken: false } };
  const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, options);
  const publicKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const users = []; const libraryKeys = []; const resultKeys = [];
  const queueName = `photo-test-${randomUUID()}`;
  let app;
  t.after(async () => {
    if (app) await app.close();
    const boss = new PgBoss(databaseOptions(process.env.DATABASE_URL));
    boss.on('error', () => {});
    try { await boss.start(); await boss.deleteQueue(queueName); } finally { await boss.stop(); }
    if (libraryKeys.length) await admin.storage.from('photo-library').remove(libraryKeys);
    if (resultKeys.length) await admin.storage.from('photo-designs').remove(resultKeys);
    for (const user of users) { const { error } = await admin.auth.admin.deleteUser(user.id); assert.ifError(error); }
  });
  for (let i = 0; i < 2; i++) {
    const email = `housespace-test-${randomUUID()}@example.com`; const password = `${randomUUID()}Aa1!`;
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    assert.ifError(error); users.push({ id: data.user.id });
    const client = createClient(url, publicKey, options);
    const signed = await client.auth.signInWithPassword({ email, password }); assert.ifError(signed.error);
    Object.assign(users[i], { client, token: signed.data.session.access_token });
  }
  const [alice, bob] = users; const designId = randomUUID(); const assetId = randomUUID();
  const png = await sharp({ create: { width: 32, height: 24, channels: 3, background: '#cbbbaa' } }).png().toBuffer();
  const libraryKey = `${alice.id}/${designId}/${assetId}`; libraryKeys.push(libraryKey);
  assert.ifError((await alice.client.storage.from('photo-library').upload(libraryKey, png, { contentType: 'image/png' })).error);
  assert.ok((await bob.client.storage.from('photo-library').download(libraryKey)).error);
  const document = { id: designId, name: 'Disposable integration fixture', revision: 1, createdAt: Date.now(), updatedAt: Date.now(), source: { id: assetId, name: 'Test', width: 32, height: 24, mime: 'image/png' }, settings: { roomType: 'Living room', styleId: 'warm', instruction: '' }, requests: [], results: [] };
  assert.ifError((await alice.client.rpc('save_photo_design', { design_id: designId, document, expected_revision: 0 })).error);
  assert.equal((await bob.client.from('photo_designs').select('id').eq('id', designId)).data.length, 0);
  assert.ok((await bob.client.rpc('save_photo_design', { design_id: designId, document: { ...document, revision: 2 }, expected_revision: 1 })).error);
  assert.ifError((await alice.client.rpc('save_photo_design', { design_id: designId, document: { ...document, revision: 2 }, expected_revision: 1 })).error);
  assert.ok((await alice.client.rpc('save_photo_design', { design_id: designId, document: { ...document, revision: 2 }, expected_revision: 1 })).error);
  let calls = 0;
  app = await createPhotoServer({ apiKey: 'fake-no-paid-requests', queueName, dailyLimit: 100, userLimit: 100, fetchImpl: async () => {
    calls++; return new Response(JSON.stringify({ data: [{ b64_json: png.toString('base64') }] }));
  } });
  const request = (user, method, route, payload) => app.inject({ method, url: `/api/photo-design${route}`, headers: { host: new URL(process.env.APP_ORIGIN).host, 'x-housespace-photo': '1', ...(user ? { authorization: `Bearer ${user.token}` } : {}) }, ...(payload ? { payload } : {}) });
  assert.equal((await request(null, 'GET', '/jobs')).statusCode, 401);
  const input = { requestId: randomUUID(), designId, settings: document.settings, sourceDataUrl: `data:image/png;base64,${png.toString('base64')}`, confirmApiCost: true };
  const responses = await Promise.all([request(alice, 'POST', '/jobs', input), request(alice, 'POST', '/jobs', input)]);
  assert.equal(responses.filter(response => response.statusCode === 202).length, 1);
  assert.ok(responses.every(response => [200, 202].includes(response.statusCode)));
  resultKeys.push(`${alice.id}/${input.requestId}/result.jpg`, `${alice.id}/${input.requestId}/thumbnail.jpg`);
  for (let i = 0; i < 60; i++) {
    const status = (await request(alice, 'GET', `/jobs/${input.requestId}`)).json();
    if (status.status === 'succeeded') break;
    assert.ok(['queued', 'running'].includes(status.status), JSON.stringify(status));
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  assert.equal((await request(alice, 'GET', `/jobs/${input.requestId}`)).json().status, 'succeeded');
  assert.equal(calls, 1);
  assert.equal((await request(bob, 'GET', `/jobs/${input.requestId}/image`)).statusCode, 404);
  assert.equal((await request(bob, 'DELETE', `/jobs/${input.requestId}`)).statusCode, 404);
  assert.equal((await request(alice, 'GET', `/jobs/${input.requestId}/thumbnail`)).statusCode, 200);
  assert.equal((await request(alice, 'DELETE', `/jobs/${input.requestId}`)).statusCode, 200);
  assert.equal((await request(alice, 'POST', '/jobs', input)).json().status, 'deleted');
  assert.equal(calls, 1);
});
