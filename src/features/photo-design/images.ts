import type { PhotoAsset } from './model';

export const MAX_PHOTO_BYTES = 12 * 1024 * 1024;
const MAX_PIXELS = 24_000_000;

// Inspect encoded dimensions before invoking a decoder. Uploaded files and WebMCP
// data URLs use this same path; MIME labels alone are never trusted.
export function inspectPhoto(bytes: Uint8Array): { width: number; height: number; mime: string } {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const text = (start: number, end: number) => String.fromCharCode(...bytes.slice(start, end));
  let width = 0, height = 0, mime = '';
  if (bytes.length >= 24 && bytes[0] === 137 && text(1, 4) === 'PNG' && text(12, 16) === 'IHDR') {
    width = view.getUint32(16); height = view.getUint32(20); mime = 'image/png';
  } else if (bytes.length >= 30 && text(0, 4) === 'RIFF' && text(8, 12) === 'WEBP') {
    const type = text(12, 16);
    if (type === 'VP8X') {
      if (bytes[20] & 2) throw new Error('Animated images are not supported. Choose a still photo.');
      width = 1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16);
      height = 1 + bytes[27] + (bytes[28] << 8) + (bytes[29] << 16);
    } else if (type === 'VP8 ' && bytes[23] === 0x9d && bytes[24] === 1 && bytes[25] === 0x2a) {
      width = view.getUint16(26, true) & 0x3fff; height = view.getUint16(28, true) & 0x3fff;
    } else if (type === 'VP8L' && bytes[20] === 0x2f) {
      const bits = view.getUint32(21, true);
      width = (bits & 0x3fff) + 1; height = ((bits >>> 14) & 0x3fff) + 1;
    }
    mime = 'image/webp';
  } else if (bytes.length > 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    mime = 'image/jpeg';
    let offset = 2;
    while (offset + 4 < bytes.length) {
      if (bytes[offset++] !== 0xff) break;
      while (bytes[offset] === 0xff) offset++;
      const marker = bytes[offset++];
      if (marker === 0xda || marker === 0xd9) break;
      if (marker === 1 || (marker >= 0xd0 && marker <= 0xd7)) continue;
      if (offset + 2 > bytes.length) break;
      const size = view.getUint16(offset);
      if (size < 2 || offset + size > bytes.length) break;
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker) && size >= 8) {
        height = view.getUint16(offset + 3); width = view.getUint16(offset + 5); break;
      }
      offset += size;
    }
  }
  if (!width || !height || !mime) throw new Error('Choose a valid JPEG, PNG or WebP photo. SVG, HEIC and GIF are not supported.');
  if (width * height > MAX_PIXELS || width > 16384 || height > 16384) throw new Error('This photo is too large. Resize it to 24 megapixels or less.');
  return { width, height, mime };
}

export async function normalizePhoto(blob: Blob, name = 'Room photo'): Promise<PhotoAsset> {
  if (!(blob instanceof Blob) || !blob.size || blob.size > MAX_PHOTO_BYTES) throw new Error('Choose a photo smaller than 12 MB.');
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const { mime } = inspectPhoto(bytes);
  const bitmap = await createImageBitmap(new Blob([bytes], { type: mime }), { imageOrientation: 'from-image' }).catch(() => { throw new Error('The photo could not be decoded. Try another image.'); });
  try {
    const scale = Math.min(1, 2048 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Your browser could not prepare this photo.');
    context.fillStyle = '#ffffff'; context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    // Encoding removes original EXIF/location metadata and bounds local storage use.
    const normalized = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('Unable to save the image.')), 'image/jpeg', 0.92));
    return { id: crypto.randomUUID(), blob: normalized, width: canvas.width, height: canvas.height, name: String(name).slice(0, 120) };
  } finally { bitmap.close(); }
}

export function photoFromDataUrl(dataUrl: unknown): Blob {
  if (typeof dataUrl !== 'string' || dataUrl.length > Math.ceil(MAX_PHOTO_BYTES * 4 / 3) + 64) throw new Error('Provide an image data URL smaller than 12 MB.');
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(dataUrl);
  if (!match) throw new Error('Only base64 JPEG, PNG or WebP data URLs are accepted. Remote URLs are not fetched.');
  let decoded: string;
  try { decoded = atob(match[2]); } catch { throw new Error('Invalid base64 image.'); }
  return new Blob([Uint8Array.from(decoded, char => char.charCodeAt(0))], { type: match[1] });
}

export function photoToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Unable to read the image.'));
    reader.readAsDataURL(blob);
  });
}

export function downloadPhoto(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a'); link.href = url;
  link.download = name.replace(/[^a-z0-9._ -]/gi, '-').slice(0, 160);
  link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
