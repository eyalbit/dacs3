/**
 * BarchartLoginPage Tests
 */

import { test, expect } from '@playwright/test';
import { BarchartLoginPage } from '../../src/pages/BarchartLoginPage';
import { getBarchartConfig } from '../setup';

test.describe('BarchartLoginPage', () => {
  test('should navigate to login page', async ({ page }) => {
    const config = getBarchartConfig();
    const loginPage = new BarchartLoginPage(page, config);

    await loginPage.navigateToLogin();

    expect(page.url()).toContain('/login');
  });

  test('should perform complete login flow', async ({ page }) => {
    const config = getBarchartConfig();
    const loginPage = new BarchartLoginPage(page, config);

    const result = await loginPage.login();

    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();

    // Check if redirected away from login page
    const currentUrl = page.url();
    expect(currentUrl).not.toContain('/login');
  });

  test('should detect successful login', async ({ page }) => {
    const config = getBarchartConfig();
    const loginPage = new BarchartLoginPage(page, config);

    await loginPage.login();

    const isSuccess = await loginPage.isLoginSuccessful();
    expect(isSuccess).toBe(true);
  });

  test('should handle invalid credentials gracefully', async ({ page }) => {
    const config = getBarchartConfig();
    const loginPage = new BarchartLoginPage(page, {
      ...config,
      password: 'invalid-password-12345',
    });

    const result = await loginPage.login();

    // Should fail with invalid credentials
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
