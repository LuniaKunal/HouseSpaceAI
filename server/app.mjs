import Fastify from 'fastify';
import rateLimit from '@fastify/rate-limit';
import { createClient } from '@supabase/supabase-js';
import { createHash, randomUUID } from 'node:crypto';
import { readFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { createPhotoGenerationWorker } from './workers/photo-generation.mjs';
import { designPrompt, validateSettings } from '../src/features/photo-design/model.ts';
import { normalizeImage } from './images.mjs';
import { createAssets } from './assets.mjs';
import { createJobs, problem } from './jobs.mjs';

const ID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const MAX_BODY = 17 * 1024 * 1024;
const publicJob = job => ({ id: job.id, designId: job.designId, status: job.status, error: job.error, model: job.model, createdAt: job.createdAt });

export async function buildApp({
  directory = path.resolve('.photo-design-data'), apiKey = process.env.OPENAI_API_KEY,
  model = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1-mini',
  dailyLimit = Number(process.env.PHOTO_DAILY_LIMIT || 10), userLimit = Number(process.env.PHOTO_USER_DAILY_LIMIT || 3),
  databaseUrl = process.env.DATABASE_URL, supabaseUrl = process.env.SUPABASE_URL, serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY,
  appOrigin = process.env.APP_ORIGIN || 'http://127.0.0.1:4173', fetchImpl = fetch,
  queueName = 'photo-generation',
  serveWeb = process.env.SERVE_WEB === '1',
} = {}) {
  if (!['gpt-image-1-mini', 'gpt-image-1.5', 'gpt-image-2.5-sunburst', 'gpt-image-2.5-flare'].includes(model)) throw new Error('Unsupported OPENAI_IMAGE_MODEL.');
  if (![dailyLimit, userLimit].every(limit => Number.isInteger(limit) && limit >= 1 && limit <= 100)) throw new Error('Daily limits must be 1-100.');
  const cloud = Boolean(supabaseUrl || serviceKey || databaseUrl);
  if (cloud && !(supabaseUrl && serviceKey && databaseUrl)) throw new Error('Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and DATABASE_URL together.');
  if (!cloud && !['localhost', '127.0.0.1'].includes(new URL(appOrigin).hostname)) throw new Error('Public access requires Supabase authentication and PostgreSQL.');
  const supabase = cloud ? createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } }) : undefined;
  const assets = createAssets(directory, supabase);
  const jobs = await createJobs({ directory, databaseUrl, dailyLimit, userLimit: cloud ? userLimit : dailyLimit, queueName });
  const app = Fastify({ bodyLimit: MAX_BODY, requestTimeout: 30000, logger: false });
  await app.register(rateLimit, { max: 120, timeWindow: '1 minute' });
  const localOrigin = ['localhost', '127.0.0.1'].includes(new URL(appOrigin).hostname);
  const origins = new Set(localOrigin ? ['http://localhost:4173', 'http://127.0.0.1:4173'] : [new URL(appOrigin).origin]);
  const hosts = new Set(localOrigin ? ['localhost:4173', '127.0.0.1:4173', 'localhost:4174', '127.0.0.1:4174'] : [new URL(appOrigin).host]);
  let fatalStorageError = false;
  const authorizedJob = async (id, owner) => { if (!ID.test(id)) throw problem('Generation request not found.', 404); const job = await jobs.get(id); if (!job || job.owner !== owner) throw problem('Generation request not found.', 404); return job; };
  app.decorateRequest('owner', '');
  app.addHook('onRequest', async (request, reply) => {
    reply.header('Cache-Control', request.url.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-store').header('X-Content-Type-Options', 'nosniff');
    reply.header('Permissions-Policy', 'tools=(self)').header('Origin-Agent-Cluster', '?1');
    if (!request.url.startsWith('/api/photo-design')) return;
    if (!cloud && !['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(request.ip)) throw problem('Local photo mode is available on this computer only.', 403);
    if (!hosts.has(request.headers.host) || (request.headers.origin && !origins.has(request.headers.origin)) || request.headers['x-housespace-photo'] !== '1') throw problem('Use the HouseSpace application to access photos.', 403);
    request.owner = 'local';
    if (supabase && request.url !== '/api/photo-design/config') {
      const token = /^Bearer (.+)$/.exec(request.headers.authorization || '')?.[1];
      if (!token) throw problem('Sign in to access your photos.', 401);
      const { data, error } = await supabase.auth.getUser(token);
      if (error || !data.user) throw problem('Your session expired. Sign in again.', 401);
      request.owner = data.user.id;
    }
  });
  if (serveWeb) {
    const { default: staticFiles } = await import('@fastify/static');
    await app.register(staticFiles, { root: path.resolve('dist'), index: 'index.html' });
    app.setNotFoundHandler((request, reply) => {
      if (request.method === 'GET' && !request.url.startsWith('/api/') && !path.extname(request.url.split('?')[0])) return reply.type('text/html').sendFile('index.html');
      return reply.code(404).send({ error: 'Not found.' });
    });
  }
  app.setErrorHandler((error, _request, reply) => {
    const status = error.status || error.statusCode || 400;
    reply.code(status).send({ error: error.status ? error.message : status === 413 ? 'Photo request is too large.' : 'Unable to process this request. Check the image format and server configuration.' });
  });
  app.get('/health', async () => ({ status: 'ok' }));
  app.get('/api/photo-design/config', async () => ({ configured: Boolean(apiKey) && !fatalStorageError, model, quality: 'low', dailyLimit: cloud ? userLimit : dailyLimit, attemptsToday: cloud ? 0 : await jobs.count('local'), authRequired: cloud, queue: jobs.mode }));
  app.get('/api/photo-design/usage', async request => ({ attemptsToday: await jobs.count(request.owner), dailyLimit: cloud ? userLimit : dailyLimit }));
  app.get('/api/photo-design/jobs', async request => (await jobs.list(request.owner)).filter(job => job.status !== 'deleted').map(publicJob));
  app.get('/api/photo-design/jobs/:id', async request => { await jobs.recover(); return publicJob(await authorizedJob(request.params.id, request.owner)); });
  app.get('/api/photo-design/jobs/:id/image', async (request, reply) => {
    const job = await authorizedJob(request.params.id, request.owner);
    if (job.status !== 'succeeded') throw problem('The result image is not available.', 409);
    const bytes = job.resultKey ? await assets.get(job.resultKey) : await readFile(path.join(directory, `${job.id}.image`));
    return reply.type(job.mime).send(bytes);
  });
  app.get('/api/photo-design/jobs/:id/thumbnail', async (request, reply) => {
    const job = await authorizedJob(request.params.id, request.owner);
    if (job.status !== 'succeeded' || !job.thumbnailKey) throw problem('Thumbnail is not available.', 404);
    return reply.type('image/jpeg').send(await assets.get(job.thumbnailKey));
  });
  app.delete('/api/photo-design/jobs/:id', async request => {
    const job = await authorizedJob(request.params.id, request.owner);
    if (['queued', 'running'].includes(job.status)) throw problem('Wait for generation to finish before deleting this photo.', 409);
    await assets.remove([job.sourceKey, job.resultKey, job.thumbnailKey].filter(Boolean));
    if (!job.resultKey && !cloud) await unlink(path.join(directory, `${job.id}.image`)).catch(error => { if (error.code !== 'ENOENT') throw error; });
    job.status = 'deleted'; delete job.usage; delete job.error; delete job.prompt; delete job.settings;
    await jobs.save(job); return { deleted: true };
  });
  app.post('/api/photo-design/jobs', async (request, reply) => {
    await jobs.recover();
    const input = request.body;
    if (!ID.test(input?.requestId) || !ID.test(input?.designId) || input?.confirmApiCost !== true) throw problem('Request/design IDs and explicit API cost consent are required.');
    const settings = validateSettings(input.settings); const prompt = designPrompt(settings);
    if (typeof input.sourceDataUrl !== 'string') throw problem('Provide a JPEG, PNG or WebP data URL.');
    const match = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(input.sourceDataUrl);
    if (!match) throw problem('Provide a JPEG, PNG or WebP data URL.');
    const original = Buffer.from(match[2], 'base64');
    const source = await normalizeImage(original);
    const fingerprint = createHash('sha256').update(input.designId).update(prompt).update(original).digest('hex');
    const existing = await jobs.get(input.requestId);
    if (existing) {
      if (existing.owner !== request.owner) throw problem('Generation request not found.', 404);
      if (existing.fingerprint !== fingerprint) throw problem('This request ID was already used with different inputs.', 409);
      return publicJob(existing);
    }
    if (!apiKey) throw problem('Image generation is not configured yet.', 503);
    if (fatalStorageError) throw problem('Photo storage is unavailable. Please try later.', 503);
    // A unique source key prevents a concurrent duplicate from deleting the accepted source.
    const sourceKey = `${request.owner}/${input.requestId}/${randomUUID()}.jpg`;
    await assets.put(sourceKey, source.bytes);
    const job = { id: input.requestId, designId: input.designId, owner: request.owner, fingerprint, createdAt: new Date().toISOString(), status: 'queued', model, prompt, settings, sourceKey };
    let reserved;
    try { reserved = await jobs.reserve(job); }
    catch (error) { await assets.remove([sourceKey]); throw error; }
    if (!reserved.created) await assets.remove([sourceKey]);
    return reply.code(reserved.created ? 202 : 200).send(publicJob(reserved.job));
  });
  await jobs.start(createPhotoGenerationWorker({ jobs, assets, apiKey, fetchImpl, maxBody: MAX_BODY, onStorageError: () => { fatalStorageError = true; } }));
  const recovery = setInterval(() => { void jobs.recover().catch(() => { fatalStorageError = true; }); }, 60000);
  recovery.unref();
  app.addHook('onClose', async () => { clearInterval(recovery); await jobs.close(); });
  await app.ready(); return app;
}