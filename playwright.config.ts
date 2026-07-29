import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  fullyParallel: false,
  use: {
    baseURL: 'http://127.0.0.1:5173',
    browserName: 'chromium',
    channel: 'chrome',
    headless: true
  },
  webServer: [
    {
      command: 'pnpm dev:signal',
      url: 'http://127.0.0.1:8787/health',
      reuseExistingServer: true,
      timeout: 30_000
    },
    {
      command: 'pnpm dev:web',
      url: 'http://127.0.0.1:5173',
      reuseExistingServer: true,
      timeout: 30_000
    }
  ]
});
