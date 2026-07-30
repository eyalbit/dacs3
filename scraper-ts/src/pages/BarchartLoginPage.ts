/**
 * Barchart Login Page Object
 *
 * Handles login functionality for Barchart.com
 */

import { Page } from 'playwright';
import { BasePage } from './BasePage';

export interface BarchartLoginConfig {
  loginUrl: string;
  email: string;
  password: string;
}

export class BarchartLoginPage extends BasePage {
  private readonly config: BarchartLoginConfig;

  // Selectors
  private readonly selectors = {
    emailInput: 'input[type="email"], input[name="email"], #email',
    passwordInput: 'input[type="password"], input[name="password"], #password',
    submitButton: 'button[type="submit"], input[type="submit"], button:has-text("Log In"), button:has-text("Sign In")',
    successIndicator: '.user-menu, .account-menu, [data-testid="user-menu"]',
    errorMessage: '.error, .alert-danger, [role="alert"]',
  };

  constructor(page: Page, config: BarchartLoginConfig, timeout?: number) {
    super(page, timeout);
    this.config = config;
  }

  /**
   * Navigate to login page
   */
  async navigateToLogin(): Promise<void> {
    await this.navigate(this.config.loginUrl);
    await this.waitForLoadState('domcontentloaded');
  }

  /**
   * Fill login form
   */
  async fillLoginForm(): Promise<void> {
    // Wait for email input
    await this.waitForSelector(this.selectors.emailInput);

    // Fill email
    await this.fill(this.selectors.emailInput, this.config.email);

    // Fill password
    await this.fill(this.selectors.passwordInput, this.config.password);
  }

  /**
   * Submit login form
   */
  async submitLogin(): Promise<void> {
    await this.click(this.selectors.submitButton);

    // Wait for navigation or success indicator
    await Promise.race([
      this.waitForLoadState('networkidle'),
      this.waitForSelector(this.selectors.successIndicator, { timeout: 15000 }).catch(() => {}),
    ]);
  }

  /**
   * Check if login was successful
   */
  async isLoginSuccessful(): Promise<boolean> {
    try {
      // Check for success indicators
      const hasSuccessIndicator = await this.isVisible(this.selectors.successIndicator);

      // Check URL changed from login page
      const currentUrl = this.getCurrentUrl();
      const isOnLoginPage = currentUrl.includes('/login');

      // Check for error messages
      const hasError = await this.isVisible(this.selectors.errorMessage);

      return hasSuccessIndicator || (!isOnLoginPage && !hasError);
    } catch (error) {
      return false;
    }
  }

  /**
   * Get error message if login failed
   */
  async getErrorMessage(): Promise<string | null> {
    try {
      if (await this.isVisible(this.selectors.errorMessage)) {
        return await this.getText(this.selectors.errorMessage);
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Perform complete login flow
   */
  async login(): Promise<{ success: boolean; error?: string }> {
    try {
      await this.navigateToLogin();
      await this.fillLoginForm();
      await this.submitLogin();

      // Check if login was successful
      const success = await this.isLoginSuccessful();

      if (!success) {
        const error = await this.getErrorMessage();
        return { success: false, error: error || 'Login failed - unknown error' };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Login failed with unexpected error',
      };
    }
  }
}
