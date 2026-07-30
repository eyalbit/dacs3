/**
 * BarchartLoginSkill Tests
 */

import { test, expect } from '@playwright/test';
import { BarchartLoginSkill } from '../../src/skills/BarchartLoginSkill';
import { getBarchartConfig } from '../setup';
import * as path from 'path';
import * as fs from 'fs';

const TEST_SESSION_FILE = path.join(__dirname, '../../.auth/test-session.json');

test.describe('BarchartLoginSkill', () => {
  test.afterEach(() => {
    // Cleanup test session file
    if (fs.existsSync(TEST_SESSION_FILE)) {
      fs.unlinkSync(TEST_SESSION_FILE);
    }
  });

  test('should perform login and save session', async ({ page }) => {
    const config = getBarchartConfig();
    const loginSkill = new BarchartLoginSkill(page, {
      ...config,
      sessionFile: TEST_SESSION_FILE,
      forceLogin: true,
    });

    const result = await loginSkill.execute();

    expect(result.success).toBe(true);
    expect(result.data?.loggedIn).toBe(true);
    expect(result.data?.usedExistingSession).toBe(false);

    // Session file should be created
    expect(fs.existsSync(TEST_SESSION_FILE)).toBe(true);
  });

  test('should reuse existing session', async ({ page, context }) => {
    const config = getBarchartConfig();

    // First login
    const loginSkill1 = new BarchartLoginSkill(page, {
      ...config,
      sessionFile: TEST_SESSION_FILE,
      forceLogin: true,
    });

    await loginSkill1.execute();

    // Close and create new page
    await page.close();
    const newPage = await context.newPage();

    // Second login should reuse session
    const loginSkill2 = new BarchartLoginSkill(newPage, {
      ...config,
      sessionFile: TEST_SESSION_FILE,
      forceLogin: false,
    });

    const result = await loginSkill2.execute();

    expect(result.success).toBe(true);
    expect(result.data?.loggedIn).toBe(true);
    expect(result.data?.usedExistingSession).toBe(true);
  });

  test('should force fresh login when requested', async ({ page }) => {
    const config = getBarchartConfig();

    // Create a dummy session file
    const sessionDir = path.dirname(TEST_SESSION_FILE);
    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir, { recursive: true });
    }
    fs.writeFileSync(TEST_SESSION_FILE, JSON.stringify({ cookies: [], localStorage: {} }));

    const loginSkill = new BarchartLoginSkill(page, {
      ...config,
      sessionFile: TEST_SESSION_FILE,
      forceLogin: true, // Force fresh login
    });

    const result = await loginSkill.execute();

    expect(result.success).toBe(true);
    expect(result.data?.usedExistingSession).toBe(false);
  });

  test('should clear session', () => {
    // Create a dummy session file
    const sessionDir = path.dirname(TEST_SESSION_FILE);
    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir, { recursive: true });
    }
    fs.writeFileSync(TEST_SESSION_FILE, JSON.stringify({ test: 'data' }));

    expect(fs.existsSync(TEST_SESSION_FILE)).toBe(true);

    BarchartLoginSkill.clearSession(TEST_SESSION_FILE);

    expect(fs.existsSync(TEST_SESSION_FILE)).toBe(false);
  });
});
