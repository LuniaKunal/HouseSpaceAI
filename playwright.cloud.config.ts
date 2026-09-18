import { defineConfig } from '@playwright/test';
import { loadEnvFile } from 'node:process';
loadEnvFile('.env.local');
export default defineConfig({
  testDir: './tests', testMatch: 'photo-cloud.spec.ts', workers: 1, timeout: 90000,
  outputDir: '.photo-design-data/cloud-test-results',
  use: { baseURL: 'http://127.0.0.1:4173', channel: 'chrome', headless: true, viewport: { width: 1280, height: 900 } },
});
