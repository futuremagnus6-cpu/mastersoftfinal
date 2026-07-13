// @ts-check
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [
    ['list'],
    ['json', { outputFile: 'test-results/api-test-results.json' }],
  ],
  use: {
    baseURL: 'http://localhost:5000/api',
    extraHTTPHeaders: {
      'Content-Type': 'application/json',
    },
    // Collect trace on first retry
    trace: 'on-first-retry',
  },
  timeout: 30000,
  expect: {
    timeout: 10000,
  },
});
