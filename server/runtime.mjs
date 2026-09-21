// Own process signals only when listening, never when constructing a test app.
export async function listen(app, { port = Number(process.env.PORT || 4174), host = process.env.HOST || '127.0.0.1' } = {}) {
  const shutdown = () => { void app.close().catch(() => { process.exitCode = 1; }); };
  app.server.once('close', () => {
    for (const signal of ['SIGINT', 'SIGTERM']) process.removeListener(signal, shutdown);
  });
  try {
    await app.listen({ port, host });
  } catch (error) {
    await app.close();
    throw error;
  }
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, shutdown);
  console.log('HouseSpace API and photo worker are ready.');
  return app;
}
