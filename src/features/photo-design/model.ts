export const ROOM_TYPES = ['Living room', 'Bedroom', 'Kitchen', 'Dining room', 'Bathroom', 'Home office', 'Balcony'] as const;
export const PHOTO_STYLES = [
  { id: 'warm', name: 'Warm contemporary', colors: ['#d7c3a3', '#9a7152', '#eee8dc'], brief: 'warm oak, soft cream fabrics, comfortable contemporary furniture and layered warm lighting' },
  { id: 'minimal', name: 'Minimalist', colors: ['#ecece5', '#a9afa9', '#555e57'], brief: 'restrained furnishings, uncluttered surfaces, neutral materials and generous negative space' },
  { id: 'japandi', name: 'Japandi', colors: ['#d3c8b2', '#797e66', '#383d35'], brief: 'low natural-wood furniture, tactile linen, muted earthy colors and Japanese-Scandinavian simplicity' },
  { id: 'scandinavian', name: 'Scandinavian', colors: ['#e4d7be', '#dfe6e7', '#789198'], brief: 'pale wood, soft textiles, airy neutral colors and functional Scandinavian furnishings' },
  { id: 'industrial', name: 'Industrial', colors: ['#727771', '#93674c', '#34393c'], brief: 'metal accents, textured masonry, warm leather and practical industrial-inspired furnishings' },
  { id: 'indian', name: 'Indian contemporary', colors: ['#a36b46', '#c1a355', '#65745b'], brief: 'contemporary furniture with Indian craft details, warm wood, woven textiles and restrained brass accents' },
] as const;

export interface PhotoSettings {
  roomType: typeof ROOM_TYPES[number];
  styleId: typeof PHOTO_STYLES[number]['id'];
  instruction: string;
}
export interface PhotoAsset {
  id: string;
  blob: Blob;
  width: number;
  height: number;
  name: string;
}
export interface PhotoRequest {
  id: string;
  createdAt: number;
  settings: PhotoSettings;
  prompt: string;
  generation?: { status: 'submitting' | 'queued' | 'running' | 'succeeded' | 'failed' | 'unknown'; error?: string };
}
export interface PhotoResult {
  id: string;
  requestId: string;
  asset: PhotoAsset;
  createdAt: number;
  favorite: boolean;
  origin: 'imported' | 'openai';
  model?: string;
}
export interface PhotoDesign {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  revision: number;
  source: PhotoAsset;
  settings: PhotoSettings;
  requests: PhotoRequest[];
  results: PhotoResult[];
}

export function validateSettings(value: unknown): PhotoSettings {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Design settings are required.');
  const s = value as Record<string, unknown>;
  if (Object.keys(s).some(key => !['roomType', 'styleId', 'instruction'].includes(key))) throw new Error('Unknown design setting.');
  if (!ROOM_TYPES.some(room => room === s.roomType)) throw new Error('Choose a supported room type.');
  if (!PHOTO_STYLES.some(style => style.id === s.styleId)) throw new Error('Choose a supported style.');
  if (typeof s.instruction !== 'string' || s.instruction.length > 1500) throw new Error('Design instructions must be at most 1,500 characters.');
  return { roomType: s.roomType as PhotoSettings['roomType'], styleId: s.styleId as PhotoSettings['styleId'], instruction: s.instruction.trim() };
}

export function designPrompt(settings: PhotoSettings): string {
  const checked = validateSettings(settings);
  const style = PHOTO_STYLES.find(s => s.id === checked.styleId)!;
  return `Use the attached room photo as the source for a realistic ${checked.roomType.toLowerCase()} concept.\nStyle: ${style.name}; ${style.brief}.\nPreserve the camera perspective, room envelope, door and window positions. Keep the original image aspect ratio. Do not add openings, people, logos or text.\n${checked.instruction ? `Additional design preferences: ${checked.instruction}\n` : ''}This is a visual concept, not a measured architectural plan.`;
}

export function photoMetadata(design: PhotoDesign) {
  return {
    id: design.id, name: design.name, createdAt: design.createdAt, updatedAt: design.updatedAt,
    revision: design.revision, settings: { ...design.settings },
    source: { id: design.source.id, width: design.source.width, height: design.source.height, name: design.source.name },
    requests: design.requests.map(request => ({ ...request, settings: { ...request.settings }, status: design.results.some(r => r.requestId === request.id) ? 'ready' : request.generation?.status || 'brief_ready' })),
    results: design.results.map(({ asset, ...result }) => ({ ...result, asset: { id: asset.id, width: asset.width, height: asset.height } })),
    provider: 'openai',
    costNotice: 'OpenAI bills API usage. Preparing a brief is free; generation sends your photo to OpenAI.',
  };
}
