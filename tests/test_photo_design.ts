import assert from 'node:assert/strict';
import { PhotoDesignService } from '../src/features/photo-design/service';
import { PhotoDesign, PhotoAsset, designPrompt } from '../src/features/photo-design/model';
import { inspectPhoto, photoFromDataUrl } from '../src/features/photo-design/images';
import { PhotoRepository } from '../src/features/photo-design/storage';
import { ALL_TOOLS, validateToolDefinition, executeWebMCPTool } from '../src/webmcp/registry';
import { agentStore } from '../src/state/agentStore';
import { uiStore } from '../src/state/uiStore';

const map = new Map<string, PhotoDesign>();
const repository: PhotoRepository = {
  list: async () => [...map.values()].map(item => structuredClone(item)),
  get: async id => map.has(id) ? structuredClone(map.get(id)) : undefined,
  put: async value => { map.set(value.id, structuredClone(value)); },
  remove: async id => { map.delete(id); },
};
const normalize = async (blob: Blob, name = 'Photo'): Promise<PhotoAsset> => ({ blob, name, id: crypto.randomUUID(), width: 800, height: 600 });
const photos = new PhotoDesignService(repository, normalize);
const blob = new Blob(['test fixture']);

async function run() {
  const a = await photos.create(blob, 'Living room');
  const b = await photos.create(blob, 'Bedroom');
  const updated = await photos.configure(a.id, { roomType: 'Bedroom', styleId: 'japandi', instruction: 'Keep the windows' }, a.revision);
  await assert.rejects(photos.configure(a.id, a.settings, a.revision), /changed/);
  await assert.rejects(photos.configure(a.id, { ...a.settings, styleId: 'bogus' as any }, updated.revision), /style/);
  const request = await photos.prepare(a.id);
  assert.match(request.prompt, /Keep the windows/);
  assert.equal((await photos.prepare(a.id)).id, request.id);
  await assert.rejects(photos.importResult(b.id, request.id, blob), /Prepare/);
  await photos.importResult(a.id, request.id, blob);
  assert.equal((await photos.get(a.id)).results[0].origin, 'imported');
  await assert.rejects(photos.importResult(a.id, request.id, blob), /already/);
  const result = (await photos.get(a.id)).results[0];
  await photos.favorite(a.id, result.id, true);
  assert.equal((await photos.get(a.id)).results[0].favorite, true);
  await assert.rejects(photos.asset(b.id, result.asset.id), /belong/);
  assert.notEqual((await photos.prepare(a.id)).id, request.id);
  assert.equal((await photos.get(a.id)).requests[0].settings.roomType, 'Bedroom');
  await assert.rejects(photos.generate(a.id, request.id, false), /Confirm/);
  await photos.remove(a.id); await assert.rejects(photos.get(a.id), /not found/);
  assert.equal((await photos.list()).length, 1);
  assert.throws(() => photoFromDataUrl('https://example.com/room.png'), /data URLs/);
  assert.throws(() => photoFromDataUrl('data:image/svg+xml;base64,AAAA'), /data URLs/);
  assert.throws(() => inspectPhoto(new Uint8Array([0, 1, 2])), /valid/);
  const png = new Uint8Array(24); png.set([137, 80, 78, 71]); png.set([73, 72, 68, 82], 12);
  new DataView(png.buffer).setUint32(16, 50000); new DataView(png.buffer).setUint32(20, 50000);
  assert.throws(() => inspectPhoto(png), /too large/);
  assert.match(designPrompt(updated.settings), /door and window/);
  const tools = Object.values(ALL_TOOLS).filter(tool => tool.name.includes('photo_design'));
  assert.equal(tools.length, 13);
  for (const tool of tools) assert.equal(validateToolDefinition(tool).valid, true, tool.name);
  await assert.rejects(ALL_TOOLS.configure_photo_design.execute({ designId: b.id, revision: '1', roomType: 'Living room', styleId: 'warm', instruction: '' }), /revision/);
  await assert.rejects(ALL_TOOLS.create_photo_design.execute({ name: 'Test', dataUrl: 'data:image/svg+xml;base64,AAAA' }), /data URLs/);
  // Chargeable tools require in-page approval even if generic confirmation is off.
  agentStore.setRequireConfirmation(false, ['generate_photo_design']);
  const pending = executeWebMCPTool('generate_photo_design', { designId: b.id, requestId: request.id, confirmApiCost: true });
  const rejected = assert.rejects(pending, /rejected/);
  assert.ok(uiStore.getState().confirmationRequest);
  uiStore.getState().confirmationRequest!.resolve(false);
  await rejected;
  agentStore.setRequireConfirmation(true);
  console.log('Photo domain: revision conflicts, immutable briefs, isolation, validation, deletion and 13 WebMCP schemas passed.');
}
run().catch(error => { console.error(error); process.exitCode = 1; });
