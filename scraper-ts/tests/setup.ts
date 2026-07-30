/**
 * Test Setup
 *
 * Global test utilities and helpers
 */

import { chromium, Browser, BrowserContext, Page } from '@playwright/test';
import * as dotenv from 'dotenv';

dotenv.config();

export interface TestContext {
  browser: Browser;
  context: BrowserContext;
  page: Page;
}

export async function createTestContext(): Promise<TestContext> {
  const browser = await chromium.launch({
    headless: process.env.TEST_HEADLESS !== 'false',
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
  });

  const page = await context.newPage();

  return { browser, context, page };
}

export async function destroyTestContext(ctx: TestContext): Promise<void> {
  await ctx.page.close();
  await ctx.context.close();
  await ctx.browser.close();
}

export function getBarchartConfig() {
  const email = process.env.BARCHART_EMAIL;
  const password = process.env.BARCHART_PASSWORD;
  const loginUrl = process.env.BARCHART_LOGIN_URL || 'https://www.barchart.com/login';
  const screenerUrl = process.env.BARCHART_SCREENER_URL;

  if (!email || !password) {
    throw new Error('BARCHART_EMAIL and BARCHART_PASSWORD must be set in .env');
  }

  return {
    email,
    password,
    loginUrl,
    screenerUrl,
  };
}
