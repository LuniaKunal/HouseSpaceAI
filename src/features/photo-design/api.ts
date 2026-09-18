import { authHeaders } from '../auth/client';
export interface PhotoServerConfig { configured: boolean; model: string; quality: string; dailyLimit: number; attemptsToday: number; authRequired?: boolean; queue?: string }
export interface GenerationStatus { id: string; designId: string; status: 'queued' | 'running' | 'succeeded' | 'failed' | 'unknown' | 'deleted'; error?: string; model: string }
export class PhotoApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

export async function photoApi<T>(path: string, body?: unknown, method = body ? 'POST' : 'GET'): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/photo-design${path}`, { method, headers: { 'x-housespace-photo': '1', ...await authHeaders(), ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(30000) });
  } catch { throw new Error('Photo server unavailable. Start npm run dev:photos and try again.'); }
  const data = await response.json().catch(() => { throw new Error('Photo server unavailable. Start npm run dev:photos.'); });
  if (!response.ok) throw new PhotoApiError(data.error || 'Photo request failed.', response.status);
  return data as T;
}
export async function fetchGeneratedImage(requestId: string) {
  const response = await fetch(`/api/photo-design/jobs/${encodeURIComponent(requestId)}/image`, { headers: { 'x-housespace-photo': '1', ...await authHeaders() }, signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error('Could not retrieve the generated image. Refresh to retry saving it without generating again.');
  return response.blob();
}
