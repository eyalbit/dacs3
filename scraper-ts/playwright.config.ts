/**
 * Playwright Test Configuration
 *
 * For Barchart integration tests
 */

import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export default defineConfig({
  testDir: './tests',
  fullyParallel: false, // Run tests sequentially to avoid session conflicts
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker to avoid session conflicts
  reporter: [
    ['html'],
    ['list'],
  ],
  use: {
    baseURL: 'https://www.barchart.com',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Test timeout
  timeout: 60000,
  expect: {
    timeout: 10000,
  },
});
