import { supabase, requirePhotoUser } from '../auth/client';
import { PhotoDesign, PhotoAsset } from './model';
import type { PhotoRepository } from './storage';

type AssetRecord = Omit<PhotoAsset, 'blob'> & { mime: string };
type DesignRecord = Omit<PhotoDesign, 'source' | 'results'> & { source: AssetRecord; results: (Omit<PhotoDesign['results'][number], 'asset'> & { asset: AssetRecord })[] };
const describe = ({ blob, ...asset }: PhotoAsset): AssetRecord => ({ ...asset, mime: blob.type });
const key = (owner: string, design: string, asset: string) => `${owner}/${design}/${asset}`;

export class CloudPhotoRepository implements PhotoRepository {
  private blobs = new Map<string, Blob>();
  // Only the selected design downloads full images. Listing reads metadata.
  private async hydrate(record: DesignRecord, owner: string, download: boolean): Promise<PhotoDesign> {
    const asset = async ({ mime, ...value }: AssetRecord): Promise<PhotoAsset> => {
      if (!download) return { ...value, blob: new Blob([], { type: mime }) };
      const assetKey = key(owner, record.id, value.id);
      const cached = this.blobs.get(assetKey);
      if (cached) return { ...value, blob: cached };
      const { data, error } = await supabase!.storage.from('photo-library').download(assetKey);
      if (error) throw error;
      if (this.blobs.size >= 8) this.blobs.delete(this.blobs.keys().next().value!);
      this.blobs.set(assetKey, data);
      return { ...value, blob: data };
    };
    return { ...record, source: await asset(record.source), results: await Promise.all(record.results.map(async result => ({ ...result, asset: await asset(result.asset) }))) };
  }
  async list() {
    const owner = await requirePhotoUser();
    const { data, error } = await supabase!.from('photo_designs').select('document').eq('owner_id', owner).order('updated_at', { ascending: false });
    if (error) throw error;
    return Promise.all(data.map(row => this.hydrate(row.document as DesignRecord, owner, false)));
  }
  async get(id: string) {
    const owner = await requirePhotoUser();
    const { data, error } = await supabase!.from('photo_designs').select('document').eq('id', id).eq('owner_id', owner).maybeSingle();
    if (error) throw error;
    return data ? this.hydrate(data.document as DesignRecord, owner, true) : undefined;
  }
  async put(design: PhotoDesign) {
    const owner = await requirePhotoUser();
    const { data: previous, error: readError } = await supabase!.from('photo_designs').select('document').eq('id', design.id).maybeSingle();
    if (readError) throw readError;
    const old = previous?.document as DesignRecord | undefined;
    const known = new Set(old ? [old.source.id, ...old.results.map(result => result.asset.id)] : []);
    try {
      for (const asset of [design.source, ...design.results.map(result => result.asset)]) {
        if (known.has(asset.id)) continue;
        const assetKey = key(owner, design.id, asset.id);
        const { error } = await supabase!.storage.from('photo-library').upload(assetKey, asset.blob, { contentType: asset.blob.type, upsert: false });
        if (error && error.message !== 'The resource already exists') throw error;
      }
      const document: DesignRecord = { ...design, source: describe(design.source), results: design.results.map(result => ({ ...result, asset: describe(result.asset) })) };
      const { error } = await supabase!.rpc('save_photo_design', { design_id: design.id, document, expected_revision: design.revision - 1 });
      if (error) throw error;
    } catch (error) {
      // Do not remove uploads after an ambiguous RPC result: it may have committed.
      // Unreferenced uploads can be removed by the documented maintenance task.
      throw error;
    }
  }
  async remove(id: string) {
    const owner = await requirePhotoUser();
    const { data, error } = await supabase!.from('photo_designs').select('document').eq('id', id).eq('owner_id', owner).maybeSingle();
    if (error) throw error; if (!data) return;
    const record = data.document as DesignRecord;
    for (const assetKey of this.blobs.keys()) if (assetKey.startsWith(`${owner}/${id}/`)) this.blobs.delete(assetKey);
    const { error: storageError } = await supabase!.storage.from('photo-library').remove([record.source, ...record.results.map(result => result.asset)].map(asset => key(owner, id, asset.id)));
    if (storageError) throw storageError;
    const { error: deleteError } = await supabase!.from('photo_designs').delete().eq('id', id).eq('owner_id', owner);
    if (deleteError) throw deleteError;
  }
}
