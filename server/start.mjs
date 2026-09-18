process.env.SERVE_WEB = '1';
const { createPhotoServer } = await import('./photo-design.mjs');
const app = await createPhotoServer();
await app.listen({ port: Number(process.env.PORT || 4173), host: process.env.HOST || '127.0.0.1' });
console.log('HouseSpace website, photo API and queue worker are ready.');
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => { void app.close(); });
