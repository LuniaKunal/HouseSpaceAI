import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { normalizeImage } from '../server/images.mjs';

test('server strips EXIF, applies orientation, bounds dimensions and creates small thumbnails', async () => {
  const source = await sharp({ create: { width: 3000, height: 1600, channels: 3, background: '#afa28f' } }).withMetadata({ orientation: 6 }).jpeg().toBuffer();
  const normalized = await normalizeImage(source);
  assert.equal(normalized.height, 2048); assert.ok(normalized.width < normalized.height);
  const metadata = await sharp(normalized.bytes).metadata();
  assert.equal(metadata.exif, undefined); assert.equal(metadata.orientation, undefined);
  const thumbnail = await normalizeImage(normalized.bytes, 480);
  assert.equal(thumbnail.height, 480); assert.ok(thumbnail.bytes.length < normalized.bytes.length);
});

test('server rejects invalid files, oversized decoded images and unsupported formats', async () => {
  await assert.rejects(normalizeImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>')));
  const large = await sharp({ create: { width: 5001, height: 5000, channels: 3, background: 'white' } }).png().toBuffer();
  await assert.rejects(normalizeImage(large));
  await assert.rejects(normalizeImage(Buffer.from('not an image')));
  await assert.rejects(normalizeImage(Buffer.alloc(12 * 1024 * 1024 + 1)));
});
