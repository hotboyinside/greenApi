import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',

  workers: 1,
  retries: 0,

  webServer: {
    command: 'pnpm dev:e2e',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: false,
    timeout: 30_000,
  },

  use: {
    browserName: 'chromium',
    baseURL: 'http://127.0.0.1:4173',
    viewport: {
      width: 1280,
      height: 800,
    },
  },
})
