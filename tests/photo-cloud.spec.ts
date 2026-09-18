import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';

test('cloud sign-in, upload, persistence, sign-out and account isolation', async ({ page }) => {
  test.skip(process.env.RUN_SUPABASE_TESTS !== '1', 'Explicit live-test opt-in required.');
  const admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
  const accounts: { id: string; email: string; password: string }[] = [];
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  try {
    for (let i = 0; i < 2; i++) {
      const email = `photo-browser-${randomUUID()}@example.com`; const password = `${randomUUID()}Aa1!`;
      const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
      if (error) throw error; accounts.push({ id: data.user!.id, email, password });
    }
    await page.goto('/photos');
    await expect(page.getByRole('heading', { name: 'Your room ideas, together.' })).toBeVisible();
    const login = async (account: typeof accounts[number]) => {
      await page.getByLabel('Email', { exact: true }).fill(account.email);
      await page.getByLabel('Password', { exact: true }).fill(account.password);
      await page.getByRole('button', { name: 'Sign in', exact: true }).click();
      await expect(page.getByRole('heading', { name: 'A fresh perspective on your room.' })).toBeVisible();
    };
    await login(accounts[0]);
    const buffer = await sharp({ create: { width: 640, height: 480, channels: 3, background: '#cbbbaa' } }).png().toBuffer();
    await page.getByLabel('Upload a room photo', { exact: true }).setInputFiles({ name: 'Cloud test room.png', mimeType: 'image/png', buffer });
    await expect(page.getByText('640 × 480', { exact: false })).toBeVisible();
    await page.getByLabel('What would you like to change?').fill('Keep the windows.');
    await page.getByRole('button', { name: 'Save settings', exact: true }).click();
    await expect(page.getByText('Design settings saved.', { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByLabel('What would you like to change?')).toHaveValue('Keep the windows.');
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: '.photo-design-data/qa/cloud-mobile.png', fullPage: true });
    await page.getByRole('button', { name: 'Sign out', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Your room ideas, together.' })).toBeVisible();
    await login(accounts[1]);
    await expect(page.getByRole('heading', { name: 'Your room is the starting point.', exact: true })).toBeVisible();
    await expect(page.getByText('640 × 480', { exact: false })).toHaveCount(0);
    await expect(page.getByLabel('What would you like to change?')).toHaveValue('');
    expect(errors).toEqual([]);
  } finally {
    for (const account of accounts) {
      const { data: designs } = await admin.from('photo_designs').select('id,document').eq('owner_id', account.id);
      for (const design of designs || []) {
        const assets = [design.document.source, ...design.document.results.map((result: { asset: { id: string } }) => result.asset)];
        await admin.storage.from('photo-library').remove(assets.map(asset => `${account.id}/${design.id}/${asset.id}`));
      }
      await admin.auth.admin.deleteUser(account.id);
    }
  }
});
