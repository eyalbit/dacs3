/**
 * BarchartScreenerSkill Tests
 */

import { test, expect } from '@playwright/test';
import { BarchartScreenerSkill } from '../../src/skills/BarchartScreenerSkill';
import { getBarchartConfig } from '../setup';

test.describe('BarchartScreenerSkill', () => {
  test('should run screener with auto-login', async ({ page }) => {
    const config = getBarchartConfig();

    if (!config.screenerUrl) {
      test.skip();
      return;
    }

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

    const result = await screenerSkill.execute();

    expect(result.success).toBe(true);
    expect(result.data?.symbols).toBeDefined();
    expect(result.data?.symbols.length).toBeGreaterThan(0);
    expect(result.data?.data).toBeDefined();
  });

  test('should use getSymbols() shortcut', async ({ page }) => {
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

    expect(symbols).toBeInstanceOf(Array);
    expect(symbols.length).toBeGreaterThan(0);

    // Verify symbols are valid strings
    symbols.forEach(symbol => {
      expect(typeof symbol).toBe('string');
      expect(symbol.length).toBeGreaterThan(0);
      expect(symbol).toMatch(/^[A-Z]+$/); // Only uppercase letters
    });
  });

  test('should handle missing screener URL', async ({ page }) => {
    const config = getBarchartConfig();

    const screenerSkill = new BarchartScreenerSkill(page, {
      screenerUrl: '', // Invalid
      loginConfig: {
        email: config.email,
        password: config.password,
        loginUrl: config.loginUrl,
      },
    });

    await expect(async () => {
      await screenerSkill.execute();
    }).rejects.toThrow();
  });
});
