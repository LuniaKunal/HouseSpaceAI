import sharp from 'sharp';

// Decode on the server even when the browser has already checked the file.
// Sharp drops metadata by default; EXIF orientation is applied before resizing.
export async function normalizeImage(bytes, maxEdge = 2048) {
  if (!Buffer.isBuffer(bytes) || bytes.length > 12 * 1024 * 1024) throw new Error('Image exceeds 12 MB.');
  const image = sharp(bytes, { limitInputPixels: 24_000_000, failOn: 'warning' });
  const metadata = await image.metadata();
  if (!['jpeg', 'png', 'webp'].includes(metadata.format) || (metadata.pages || 1) > 1) throw new Error('Use a still JPEG, PNG or WebP photo.');
  const { data, info } = await image.rotate().resize({ width: maxEdge, height: maxEdge, fit: 'inside', withoutEnlargement: true })
    .flatten({ background: '#ffffff' }).jpeg({ quality: 88, mozjpeg: true }).toBuffer({ resolveWithObject: true });
  return { bytes: data, mime: 'image/jpeg', width: info.width, height: info.height };
}
