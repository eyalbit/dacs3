/**
 * Barchart Login Skill
 *
 * Handles authentication for Barchart.com with session persistence
 */

import { Page, BrowserContext } from 'playwright';
import { BaseSkill } from './BaseSkill';
import { BarchartLoginPage, BarchartLoginConfig } from '../pages/BarchartLoginPage';
import * as fs from 'fs';
import * as path from 'path';

export interface LoginSkillConfig extends BarchartLoginConfig {
  sessionFile?: string;
  forceLogin?: boolean;
}

export interface LoginResult {
  loggedIn: boolean;
  usedExistingSession: boolean;
  error?: string;
}

export class BarchartLoginSkill extends BaseSkill<LoginSkillConfig, LoginResult> {
  private readonly defaultSessionFile = path.join(__dirname, '../../.auth/barchart-session.json');

  constructor(page: Page, config: LoginSkillConfig) {
    super(page, config);
  }

  /**
   * Get session file path
   */
  private getSessionFilePath(): string {
    return this.config.sessionFile || this.defaultSessionFile;
  }

  /**
   * Check if session file exists
   */
  private sessionFileExists(): boolean {
    const sessionPath = this.getSessionFilePath();
    return fs.existsSync(sessionPath);
  }

  /**
   * Load session from file
   */
  private async loadSession(): Promise<boolean> {
    try {
      const sessionPath = this.getSessionFilePath();

      if (!this.sessionFileExists()) {
        return false;
      }

      const sessionData = fs.readFileSync(sessionPath, 'utf-8');
      const { cookies, localStorage } = JSON.parse(sessionData);

      // Get browser context
      const context = this.page.context();

      // Load cookies
      if (cookies && cookies.length > 0) {
        await context.addCookies(cookies);
      }

      // Load localStorage (navigate to page first)
      if (localStorage && Object.keys(localStorage).length > 0) {
        await this.page.goto(this.config.loginUrl.replace('/login', ''));
        await this.page.evaluate((storage: Record<string, string>) => {
          for (const [key, value] of Object.entries(storage)) {
            (window as any).localStorage.setItem(key, value);
          }
        }, localStorage);
      }

      return true;
    } catch (error) {
      console.error('Failed to load session:', error);
      return false;
    }
  }

  /**
   * Save session to file
   */
  private async saveSession(): Promise<void> {
    try {
      const sessionPath = this.getSessionFilePath();
      const sessionDir = path.dirname(sessionPath);

      // Create .auth directory if it doesn't exist
      if (!fs.existsSync(sessionDir)) {
        fs.mkdirSync(sessionDir, { recursive: true });
      }

      // Get browser context
      const context = this.page.context();

      // Save cookies
      const cookies = await context.cookies();

      // Save localStorage
      const localStorage = await this.page.evaluate(() => {
        const items: Record<string, string> = {};
        for (let i = 0; i < (window as any).localStorage.length; i++) {
          const key = (window as any).localStorage.key(i);
          if (key) {
            items[key] = (window as any).localStorage.getItem(key) || '';
          }
        }
        return items;
      });

      // Write to file
      const sessionData = {
        timestamp: new Date().toISOString(),
        cookies,
        localStorage,
      };

      fs.writeFileSync(sessionPath, JSON.stringify(sessionData, null, 2), 'utf-8');

      console.log(`Session saved to: ${sessionPath}`);
    } catch (error) {
      console.error('Failed to save session:', error);
    }
  }

  /**
   * Verify if current session is valid
   */
  private async isSessionValid(): Promise<boolean> {
    try {
      // Navigate to a protected page
      await this.page.goto(this.config.loginUrl.replace('/login', '/my/watchlist'));

      // Check if we're redirected to login
      await this.page.waitForLoadState('domcontentloaded');

      const currentUrl = this.page.url();
      const isOnLoginPage = currentUrl.includes('/login');

      return !isOnLoginPage;
    } catch {
      return false;
    }
  }

  /**
   * Perform login
   */
  private async performLogin(): Promise<{ success: boolean; error?: string }> {
    const loginPage = new BarchartLoginPage(this.page, this.config);
    return await loginPage.login();
  }

  /**
   * Execute login skill
   */
  async execute(): Promise<{ success: boolean; data?: LoginResult; error?: string }> {
    try {
      // Check if we should try to use existing session
      if (!this.config.forceLogin && this.sessionFileExists()) {
        console.log('Loading existing session...');

        const loaded = await this.loadSession();

        if (loaded) {
          const isValid = await this.isSessionValid();

          if (isValid) {
            console.log('Existing session is valid');
            return this.success({
              loggedIn: true,
              usedExistingSession: true,
            });
          }

          console.log('Existing session is invalid, logging in again...');
        }
      }

      // Perform fresh login
      console.log('Performing fresh login...');
      const loginResult = await this.performLogin();

      if (!loginResult.success) {
        return this.error(loginResult.error || 'Login failed');
      }

      // Save session
      await this.saveSession();

      return this.success({
        loggedIn: true,
        usedExistingSession: false,
      });
    } catch (error) {
      return this.error(error instanceof Error ? error.message : 'Login skill failed');
    }
  }

  /**
   * Clear saved session
   */
  static clearSession(sessionFile?: string): void {
    const sessionPath = sessionFile || path.join(__dirname, '../../.auth/barchart-session.json');

    if (fs.existsSync(sessionPath)) {
      fs.unlinkSync(sessionPath);
      console.log('Session cleared');
    }
  }
}
