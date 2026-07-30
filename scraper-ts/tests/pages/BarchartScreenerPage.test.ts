/**
 * BarchartScreenerPage Tests
 */

import { test, expect } from '@playwright/test';
import { BarchartScreenerPage } from '../../src/pages/BarchartScreenerPage';
import { BarchartLoginPage } from '../../src/pages/BarchartLoginPage';
import { getBarchartConfig } from '../setup';

test.describe('BarchartScreenerPage', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    const config = getBarchartConfig();
    const loginPage = new BarchartLoginPage(page, config);
    await loginPage.login();
  });

  test('should navigate to screener page', async ({ page }) => {
    const config = getBarchartConfig();

    if (!config.screenerUrl) {
      test.skip();
      return;
    }

    const screenerPage = new BarchartScreenerPage(page, {
      screenerUrl: config.screenerUrl,
    });

    await screenerPage.navigateToScreener();

    expect(page.url()).toContain('stocks-screener');
  });

  test('should click "See Results" button', async ({ page }) => {
    const config = getBarchartConfig();

    if (!config.screenerUrl) {
      test.skip();
      return;
    }

    const screenerPage = new BarchartScreenerPage(page, {
      screenerUrl: config.screenerUrl,
    });

    await screenerPage.navigateToScreener();
    await screenerPage.clickSeeResults();

    // Should wait for results
    await page.waitForTimeout(2000);

    const hasResults = await screenerPage.hasResults();
    expect(hasResults).toBe(true);
  });

  test('should extract symbols from results', async ({ page }) => {
    const config = getBarchartConfig();

    if (!config.screenerUrl) {
      test.skip();
      return;
    }

    const screenerPage = new BarchartScreenerPage(page, {
      screenerUrl: config.screenerUrl,
      screenerName: 'Base Screener-DACS3 for CALL',
    });

    await screenerPage.navigateToScreener();
    await screenerPage.clickSeeResults();

    const symbols = await screenerPage.extractSymbols();

    expect(symbols).toBeInstanceOf(Array);
    expect(symbols.length).toBeGreaterThan(0);

    // Each symbol should be a string
    symbols.forEach(symbol => {
      expect(typeof symbol).toBe('string');
      expect(symbol.length).toBeGreaterThan(0);
    });
  });

  test('should run complete screener workflow', async ({ page }) => {
    const config = getBarchartConfig();

    if (!config.screenerUrl) {
      test.skip();
      return;
    }

    const screenerPage = new BarchartScreenerPage(page, {
      screenerUrl: config.screenerUrl,
    });

    const result = await screenerPage.runScreener();

    expect(result.success).toBe(true);
    expect(result.symbols).toBeDefined();
    expect(result.symbols!.length).toBeGreaterThan(0);
    expect(result.data).toBeDefined();
  });
});
