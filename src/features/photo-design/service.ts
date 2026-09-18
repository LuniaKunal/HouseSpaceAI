import { PhotoDesign, PhotoSettings, PhotoAsset, designPrompt, photoMetadata, validateSettings } from './model';
import { normalizePhoto } from './images';
import { photoToDataUrl } from './images';
import { photoApi, fetchGeneratedImage, GenerationStatus, PhotoServerConfig, PhotoApiError } from './api';
import { BrowserPhotoRepository, PhotoRepository } from './storage';
import { CloudPhotoRepository } from './cloud-storage';
import { supabase } from '../auth/client';

export class PhotoDesignService {
  private listeners = new Set<() => void>();
  private version = 0;
  private pending: Promise<unknown> = Promise.resolve();
  constructor(private repository: PhotoRepository, private normalize = normalizePhoto) {}
  subscribe = (callback: () => void) => { this.listeners.add(callback); return () => { this.listeners.delete(callback); }; };
  getVersion = () => this.version;
  private notify() { this.version++; this.listeners.forEach(callback => callback()); }
  private serial<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.pending.then(operation);
    this.pending = result.catch(() => undefined);
    return result;
  }
  async list() { return (await this.repository.list()).sort((a, b) => b.updatedAt - a.updatedAt).map(photoMetadata); }
  async get(id: string) {
    if (typeof id !== 'string' || !id) throw new Error('A photo design ID is required.');
    const design = await this.repository.get(id);
    if (!design) throw new Error('Photo design not found. It may have been deleted.');
    return design;
  }
  async create(blob: Blob, name: string) {
    if (typeof name !== 'string' || !name.trim() || name.length > 120) throw new Error('Photo name must contain 1–120 characters.');
    const source = await this.normalize(blob, name.trim());
    return this.serial(async () => {
      const now = Date.now();
      const design: PhotoDesign = { id: crypto.randomUUID(), name: source.name || 'Room photo', source, createdAt: now, updatedAt: now, revision: 1, settings: { roomType: 'Living room', styleId: 'warm', instruction: '' }, requests: [], results: [] };
      await this.repository.put(design); this.notify(); return photoMetadata(design);
    });
  }
  private mutate<T>(id: string, operation: (design: PhotoDesign) => T | Promise<T>, expectedRevision?: number): Promise<T> {
    return this.serial(async () => {
      const work = async () => {
        const design = await this.get(id);
        if (expectedRevision !== undefined && expectedRevision !== design.revision) throw new Error('This design changed in another view. Reload it before saving.');
        const result = await operation(design);
        design.revision++; design.updatedAt = Date.now();
        await this.repository.put(design); this.notify(); return result;
      };
      // Web Locks serialize the read/modify/write sequence across browser tabs too.
      if (typeof navigator !== 'undefined' && navigator.locks) return navigator.locks.request(`housespace-photo-${id}`, work);
      return work();
    });
  }
  async configure(id: string, settings: PhotoSettings, revision: number) {
    if (!Number.isInteger(revision) || revision < 1) throw new Error('Provide the current positive integer revision.');
    const checked = validateSettings(settings);
    await this.mutate(id, design => { design.settings = checked; }, revision);
    return photoMetadata(await this.get(id));
  }
  prepare(id: string, newVariation = false) {
    return this.mutate(id, design => {
      // Same brief reuses its request, making repeat agent calls harmless.
      const prompt = designPrompt(design.settings);
      const existing = [...design.requests].reverse().find(request => request.prompt === prompt && !design.results.some(result => result.requestId === request.id));
      if (existing && !newVariation) return existing;
      const request = { id: crypto.randomUUID(), createdAt: Date.now(), settings: { ...design.settings }, prompt };
      design.requests.push(request); return request;
    });
  }
  async config() {
    const config = await photoApi<PhotoServerConfig>('/config');
    if (config.authRequired && !supabase) return { ...config, configured: false };
    if (config.authRequired) Object.assign(config, await photoApi('/usage'));
    return config;
  }
  async generate(id: string, requestId: string, confirmApiCost: boolean) {
    if (confirmApiCost !== true) throw new Error('Confirm that generation sends the photo to OpenAI and incurs API charges.');
    const design = await this.get(id);
    const request = design.requests.find(r => r.id === requestId);
    if (!request) throw new Error('Prepare the photo design before generating it.');
    if (design.results.some(r => r.requestId === requestId)) return this.refreshGeneration(id, requestId);
    await this.mutate(id, current => {
      current.requests.find(r => r.id === requestId)!.generation = { status: 'submitting' };
    });
    try {
      const job = await photoApi<GenerationStatus>('/jobs', { designId: id, requestId, sourceDataUrl: await photoToDataUrl(design.source.blob), settings: request.settings, confirmApiCost });
      await this.mutate(id, current => { current.requests.find(r => r.id === requestId)!.generation = { status: job.status === 'deleted' ? 'failed' : job.status, error: job.error }; });
      return job;
    } catch (error) {
      await this.mutate(id, current => { current.requests.find(r => r.id === requestId)!.generation = { status: 'unknown', error: `${error instanceof Error ? error.message : 'Request failed.'} Recheck this request before generating again.` }; });
      throw error;
    }
  }
  async refreshGeneration(id: string, requestId: string) {
    const before = await this.get(id);
    if (!before.requests.some(r => r.id === requestId)) throw new Error('Design request not found.');
    const job = await photoApi<GenerationStatus>(`/jobs/${encodeURIComponent(requestId)}`);
    if (job.designId !== id) throw new Error('The generation belongs to a different photo design.');
    let asset: PhotoAsset | undefined;
    if (job.status === 'succeeded' && !before.results.some(r => r.requestId === requestId)) {
      asset = await this.normalize(await fetchGeneratedImage(requestId), 'AI room concept');
    }
    const previous = before.requests.find(r => r.id === requestId)!.generation;
    const nextStatus = job.status === 'deleted' ? 'failed' : job.status;
    if (!asset && previous?.status === nextStatus && previous.error === job.error) return job;
    await this.mutate(id, current => {
      current.requests.find(r => r.id === requestId)!.generation = { status: job.status === 'deleted' ? 'failed' : job.status, error: job.error };
      if (asset && !current.results.some(r => r.requestId === requestId)) current.results.push({ id: crypto.randomUUID(), requestId, asset, createdAt: Date.now(), favorite: false, origin: 'openai', model: job.model });
    });
    return job;
  }
  async importResult(id: string, requestId: string, blob: Blob) {
    const before = await this.get(id);
    if (!before.requests.some(request => request.id === requestId)) throw new Error('Prepare a design brief before attaching its result.');
    if (before.requests.find(request => request.id === requestId)?.generation) throw new Error('This brief is linked to an API generation. Prepare a new variation before importing a concept.');
    const previous = before.results.find(result => result.requestId === requestId);
    if (previous) throw new Error('This brief already has a result. Create a different brief for another version.');
    const asset = await this.normalize(blob, 'Imported concept');
    await this.mutate(id, design => {
      if (!design.requests.some(request => request.id === requestId)) throw new Error('The design brief no longer exists.');
      if (design.requests.find(request => request.id === requestId)?.generation) throw new Error('This brief is linked to an API generation. Prepare a new variation before importing a concept.');
      if (design.results.some(result => result.requestId === requestId)) throw new Error('This brief already has a result.');
      // Aspect ratio must match for a meaningful before/after overlay.
      if (Math.abs(asset.width / asset.height / (design.source.width / design.source.height) - 1) > 0.02) throw new Error('The result must have the same aspect ratio as the source photo. Export it without cropping.');
      design.results.push({ id: crypto.randomUUID(), requestId, asset, createdAt: Date.now(), favorite: false, origin: 'imported' });
    });
    return photoMetadata(await this.get(id));
  }
  async favorite(id: string, resultId: string, favorite: boolean) {
    if (typeof favorite !== 'boolean') throw new Error('Favorite must be true or false.');
    await this.mutate(id, design => {
      const result = design.results.find(item => item.id === resultId);
      if (!result) throw new Error('Photo result not found.');
      result.favorite = favorite;
    });
    return photoMetadata(await this.get(id));
  }
  async asset(id: string, assetId: string): Promise<PhotoAsset> {
    const design = await this.get(id);
    const asset = [design.source, ...design.results.map(result => result.asset)].find(asset => asset.id === assetId);
    if (!asset) throw new Error('This image does not belong to the photo design.');
    return asset;
  }
  remove(id: string) {
    return this.serial(async () => {
      const work = async () => {
        const design = await this.get(id);
        for (const request of design.requests.filter(r => r.generation)) {
          // A server outage must not silently leave generated files behind.
          await photoApi(`/jobs/${encodeURIComponent(request.id)}`, undefined, 'DELETE').catch(error => {
            if (!(error instanceof PhotoApiError) || error.status !== 404) throw error;
          });
        }
        await this.repository.remove(id); this.notify();
      };
      if (typeof navigator !== 'undefined' && navigator.locks) await navigator.locks.request(`housespace-photo-${id}`, work);
      else await work();
      return { deleted: true, id };
    });
  }
}
export const photoDesignService = new PhotoDesignService(supabase ? new CloudPhotoRepository() : new BrowserPhotoRepository());
