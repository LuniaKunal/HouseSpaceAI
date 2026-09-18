import { mkdir, readFile, writeFile, rename, unlink } from 'node:fs/promises';
import path from 'node:path';

export function createAssets(directory, supabase) {
  const bucket = supabase?.storage.from('photo-designs');
  const local = key => path.join(directory, 'assets', ...key.split('/'));
  return {
    async put(key, bytes) {
      if (bucket) {
        const { error } = await bucket.upload(key, bytes, { contentType: 'image/jpeg', upsert: true });
        if (error) throw error;
      } else {
        const target = local(key); await mkdir(path.dirname(target), { recursive: true });
        await writeFile(`${target}.tmp`, bytes); await rename(`${target}.tmp`, target);
      }
    },
    async get(key) {
      if (bucket) {
        const { data, error } = await bucket.download(key); if (error) throw error;
        return Buffer.from(await data.arrayBuffer());
      }
      return readFile(local(key));
    },
    async remove(keys) {
      if (bucket) { const { error } = await bucket.remove(keys); if (error) throw error; }
      else for (const key of keys) await unlink(local(key)).catch(error => { if (error.code !== 'ENOENT') throw error; });
    },
  };
}
