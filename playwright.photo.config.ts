import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests', testMatch: 'photo-design.spec.ts', workers: 1,
  outputDir: '.photo-design-data/test-results',
  webServer: { command: 'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4175 --mode test', url: 'http://127.0.0.1:4175', reuseExistingServer: false, env: { VITE_SUPABASE_URL: '', VITE_SUPABASE_PUBLISHABLE_KEY: '' } },
  use: { baseURL: 'http://127.0.0.1:4175', channel: 'chrome', headless: true, viewport: { width: 1440, height: 1050 } },
});
