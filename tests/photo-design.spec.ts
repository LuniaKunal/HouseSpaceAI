import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

test('photo upload → OpenAI workflow → compare → reload → WebMCP → delete, without paid requests', async ({ page }) => {
  const pageErrors: string[] = []; page.on('pageerror', error => pageErrors.push(error.message));
  let configured = false, submitCount = 0;
  const jobs = new Map<string, Record<string, unknown>>();
  let output = Buffer.alloc(0);
  await page.route('**/api/photo-design/**', async route => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname.endsWith('/config')) { await route.fulfill({ json: { configured, model: 'gpt-image-1-mini', quality: 'low', dailyLimit: 10, attemptsToday: submitCount } }); return; }
    if (pathname.endsWith('/jobs') && route.request().method() === 'POST') {
      const data = route.request().postDataJSON();
      expect(data.confirmApiCost).toBe(true); expect(data.sourceDataUrl).toMatch(/^data:image\/jpeg/);
      expect(JSON.stringify(data)).not.toContain('OPENAI_API_KEY');
      if (!jobs.has(data.requestId)) submitCount++;
      const job = { id: data.requestId, designId: data.designId, status: 'succeeded', model: 'gpt-image-1-mini' }; jobs.set(data.requestId, job);
      await route.fulfill({ status: 202, json: job }); return;
    }
    const id = pathname.split('/')[4];
    if (pathname.endsWith('/image')) { await route.fulfill({ body: output, contentType: 'image/png' }); return; }
    if (route.request().method() === 'DELETE') { jobs.delete(id); await route.fulfill({ json: { deleted: true } }); return; }
    await route.fulfill({ json: jobs.get(id) || { error: 'not found' }, status: jobs.has(id) ? 200 : 404 });
  });
  // Test fixtures drawn in-browser; they are not represented as real AI quality evidence.
  await page.goto('/photos');
  await expect(page.getByRole('heading', { name: 'A fresh perspective on your room.' })).toBeVisible();
  const sourceData = await page.evaluate(() => {
    const canvas = document.createElement('canvas'); canvas.width = 800; canvas.height = 600;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#d5d3c8'; ctx.fillRect(0, 0, 800, 390);
    ctx.fillStyle = '#938474'; ctx.fillRect(0, 390, 800, 210);
    ctx.fillStyle = '#f6f4e6'; ctx.fillRect(470, 60, 230, 230);
    ctx.fillStyle = '#a8c0c1'; ctx.fillRect(485, 75, 200, 195);
    ctx.fillStyle = '#6b776f'; ctx.fillRect(100, 310, 310, 125); ctx.fillRect(115, 280, 280, 55);
    ctx.fillStyle = '#d3bca0'; ctx.fillRect(390, 420, 190, 60);
    return canvas.toDataURL('image/png');
  });
  output = Buffer.from(sourceData.split(',')[1], 'base64');
  await page.getByLabel('Upload a room photo', { exact: true }).setInputFiles({ name: 'Living room.png', mimeType: 'image/png', buffer: output });
  await expect(page.getByText('800 × 600')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Generate one concept' })).toBeDisabled();
  await page.getByRole('button', { name: 'Japandi', exact: true }).click();
  await page.getByLabel('What would you like to change?').fill('Keep the window and add warm oak.');
  await page.getByRole('button', { name: 'Save settings', exact: true }).click();
  await expect(page.getByRole('status').first()).toContainText('Design settings saved.');
  configured = true; await page.getByRole('button', { name: 'Check connection' }).click();
  await expect(page.getByText('OpenAI is ready', { exact: true })).toBeVisible();
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Generate one concept', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Concept 1', exact: true })).toBeVisible({ timeout: 15000 });
  expect(submitCount).toBe(1);
  await page.getByRole('button', { name: 'Favorite result', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Remove favorite', exact: true })).toBeVisible();
  await page.getByRole('slider').fill('70');
  await page.reload();
  await expect(page.getByRole('button', { name: 'Remove favorite', exact: true })).toBeVisible();
  await expect(page.getByLabel('What would you like to change?')).toHaveValue('Keep the window and add warm oak.');
  const tools = await page.evaluate(() => window.housespaceAgent!.getTools().filter(tool => tool.name.includes('photo_design')).map(tool => tool.name));
  expect(tools).toHaveLength(13);
  const library = await page.evaluate(() => window.housespaceAgent!.callTool('list_photo_designs'));
  expect(library.designs).toHaveLength(1);
  const design = library.designs[0];
  const asset = await page.evaluate(input => window.housespaceAgent!.callTool('read_photo_design_asset', input), { designId: design.id, assetId: design.source.id });
  expect(asset.dataUrl).toMatch(/^data:image\/jpeg/);
  const telemetry = await page.evaluate(async () => {
    // Vite module import checks the real app telemetry, not a separate fake store.
    const modulePath = '/src/state/agentStore.ts';
    const store = await import(modulePath);
    return JSON.stringify(store.agentStore.getState());
  });
  expect(telemetry).not.toContain(asset.dataUrl);
  await mkdir('.photo-design-data/qa', { recursive: true });
  await page.screenshot({ path: '.photo-design-data/qa/photo-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: '.photo-design-data/qa/photo-mobile.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download', exact: true }).click();
  const download = await downloadPromise; expect(download.suggestedFilename()).toMatch(/concept\.jpg$/);
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Delete Living room', exact: true }).click();
  await expect(page.getByText('No photos yet. Add a room to start your library.')).toBeVisible();
  expect(jobs.size).toBe(0); expect(pageErrors).toEqual([]);
});
