import { normalizeImage } from '../images.mjs';

// A claimed request is never automatically resubmitted after an ambiguous outcome.
export function createPhotoGenerationWorker({ jobs, assets, apiKey, fetchImpl, maxBody, onStorageError }) {
  return async id => {
    const job = await jobs.claim(id); if (!job) return;
    let submitted = false;
    try {
      if (!apiKey) throw new Error('Image generation is not configured.');
      const source = await normalizeImage(await assets.get(job.sourceKey));
      const form = new FormData();
      form.append('model', job.model); form.append('prompt', job.prompt);
      form.append('image[]', new Blob([source.bytes], { type: source.mime }), 'room.jpg');
      form.append('quality', 'low'); form.append('n', '1'); form.append('output_format', 'jpeg');
      form.append('size', source.width / source.height > 1.2 ? '1536x1024' : source.height / source.width > 1.2 ? '1024x1536' : '1024x1024');
      submitted = true;
      const response = await fetchImpl('https://api.openai.com/v1/images/edits', { method: 'POST', headers: { Authorization: `Bearer ${apiKey}` }, body: form, signal: AbortSignal.timeout(240000) });
      job.providerRequestId = response.headers.get('x-request-id') || undefined;
      if (!response.ok) {
        job.status = response.status >= 500 ? 'unknown' : 'failed';
        job.error = response.status === 401 ? 'OpenAI rejected the server API key.' : response.status === 429 ? 'OpenAI usage or rate limit reached.' : response.status >= 500 ? 'OpenAI returned a server error. Billing outcome may be unknown; no automatic retry was made.' : 'OpenAI rejected the image request.';
      } else {
        const data = await response.json(); const encoded = data.data?.[0]?.b64_json;
        if (typeof encoded !== 'string' || encoded.length > maxBody || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) throw new Error('Invalid provider image.');
        const image = await normalizeImage(Buffer.from(encoded, 'base64'));
        job.resultKey = `${job.owner}/${job.id}/result.jpg`; job.thumbnailKey = `${job.owner}/${job.id}/thumbnail.jpg`;
        await assets.put(job.resultKey, image.bytes);
        await assets.put(job.thumbnailKey, (await normalizeImage(image.bytes, 480)).bytes);
        job.status = 'succeeded'; job.mime = image.mime; job.usage = data.usage;
      }
    } catch {
      job.status = submitted ? 'unknown' : 'failed';
      job.error = submitted ? 'Generation was interrupted or could not be saved. It may have been billed. No automatic retry was made.' : 'The source photo could not be read. No API request was sent.';
    }
    try { await jobs.save(job); await assets.remove([job.sourceKey]); }
    catch { onStorageError(); }
  };
}
