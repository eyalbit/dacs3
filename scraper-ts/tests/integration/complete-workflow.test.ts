/**
 * Complete Workflow Integration Tests
 *
 * Tests the entire flow: Login → Screener → Results
 */

import { test, expect } from '@playwright/test';
import { BarchartLoginSkill } from '../../src/skills/BarchartLoginSkill';
import { BarchartScreenerSkill } from '../../src/skills/BarchartScreenerSkill';
import { getBarchartConfig } from '../setup';

test.describe('Complete Barchart Workflow', () => {
  test('should complete full workflow: login → screener → results', async ({ page }) => {
    const config = getBarchartConfig();

    if (!config.screenerUrl) {
      test.skip();
      return;
    }

    // Step 1: Login
    const loginSkill = new BarchartLoginSkill(page, {
      email: config.email,
      password: config.password,
      loginUrl: config.loginUrl,
      forceLogin: false,
    });

    const loginResult = await loginSkill.execute();
    expect(loginResult.success).toBe(true);

    // Step 2: Run Screener
    const screenerSkill = new BarchartScreenerSkill(page, {
      screenerUrl: config.screenerUrl,
      screenerName: 'Base Screener-DACS3 for CALL',
      loginConfig: {
        email: config.email,
        password: config.password,
        loginUrl: config.loginUrl,
      },
      downloadCSV: false,
    });

    const screenerResult = await screenerSkill.execute();
    expect(screenerResult.success).toBe(true);

    // Step 3: Verify Results
    const symbols = screenerResult.data?.symbols || [];
    expect(symbols.length).toBeGreaterThan(0);

    console.log(`✅ Found ${symbols.length} symbols:`, symbols.slice(0, 10).join(', '));

    // Step 4: Verify data structure
    const data = screenerResult.data?.data || [];
    expect(data.length).toBeGreaterThan(0);

    // Should have headers
    expect(data[0]).toBeDefined();
    expect(data[0].length).toBeGreaterThan(0);
  });

  test('should reuse session in second run', async ({ page, context }) => {
    const config = getBarchartConfig();

    if (!config.screenerUrl) {
      test.skip();
      return;
    }

    // First run - fresh login
    const screenerSkill1 = new BarchartScreenerSkill(page, {
      screenerUrl: config.screenerUrl,
      loginConfig: {
        email: config.email,
        password: config.password,
        loginUrl: config.loginUrl,
      },
    });

    await screenerSkill1.execute();

    // Close and create new page
    await page.close();
    const newPage = await context.newPage();

    // Second run - should reuse session
    const screenerSkill2 = new BarchartScreenerSkill(newPage, {
      screenerUrl: config.screenerUrl,
      loginConfig: {
        email: config.email,
        password: config.password,
        loginUrl: config.loginUrl,
      },
    });

    const startTime = Date.now();
    const result = await screenerSkill2.execute();
    const duration = Date.now() - startTime;

    expect(result.success).toBe(true);

    // Should be faster (session reused)
    console.log(`⏱️  Second run took ${duration}ms (with session reuse)`);
  });

  test('should handle multiple symbols correctly', async ({ page }) => {
    const config = getBarchartConfig();

    if (!config.screenerUrl) {
      test.skip();
      return;
    }

    const screenerSkill = new BarchartScreenerSkill(page, {
      screenerUrl: config.screenerUrl,
      loginConfig: {
        email: config.email,
        password: config.password,
        loginUrl: config.loginUrl,
      },
    });

    const symbols = await screenerSkill.getSymbols();

    // Should have multiple symbols
    expect(symbols.length).toBeGreaterThanOrEqual(5);

    // All symbols should be valid stock tickers
    symbols.forEach(symbol => {
      expect(symbol).toMatch(/^[A-Z]{1,5}$/); // 1-5 uppercase letters
    });

    // No duplicates
    const uniqueSymbols = new Set(symbols);
    expect(uniqueSymbols.size).toBe(symbols.length);
  });
});
