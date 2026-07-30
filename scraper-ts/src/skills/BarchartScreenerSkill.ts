/**
 * Barchart Screener Skill
 *
 * Runs a saved Barchart screener and extracts results
 */

import { Page } from 'playwright';
import { BaseSkill } from './BaseSkill';
import { BarchartScreenerPage, BarchartScreenerConfig } from '../pages/BarchartScreenerPage';
import { BarchartLoginSkill } from './BarchartLoginSkill';

export interface ScreenerSkillConfig extends BarchartScreenerConfig {
  loginConfig: {
    email: string;
    password: string;
    loginUrl: string;
  };
  downloadCSV?: boolean;
  assetsBasePath?: string;
}

export interface ScreenerResult {
  symbols: string[];
  data: string[][];
  csvPaths?: { [symbol: string]: string };
  screenerName?: string;
}

export class BarchartScreenerSkill extends BaseSkill<ScreenerSkillConfig, ScreenerResult> {
  constructor(page: Page, config: ScreenerSkillConfig) {
    super(page, config);
    this.validateConfig(['screenerUrl', 'loginConfig']);
  }

  /**
   * Ensure user is logged in
   */
  private async ensureLoggedIn(): Promise<boolean> {
    try {
      const loginSkill = new BarchartLoginSkill(this.page, {
        ...this.config.loginConfig,
        forceLogin: false,
      });

      const result = await loginSkill.execute();

      if (!result.success) {
        console.error('Login failed:', result.error);
        return false;
      }

      if (result.data?.usedExistingSession) {
        console.log('Using existing session');
      } else {
        console.log('Logged in successfully');
      }

      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  }

  /**
   * Execute screener skill
   */
  async execute(): Promise<{ success: boolean; data?: ScreenerResult; error?: string }> {
    try {
      // Step 1: Ensure logged in
      console.log('Checking authentication...');
      const loggedIn = await this.ensureLoggedIn();

      if (!loggedIn) {
        return this.error('Failed to authenticate with Barchart');
      }

      // Step 2: Navigate to screener and run it
      console.log('Running screener...');
      const screenerPage = new BarchartScreenerPage(this.page, {
        screenerUrl: this.config.screenerUrl,
        screenerName: this.config.screenerName,
      });

      const runResult = await screenerPage.runScreener();

      if (!runResult.success) {
        return this.error(runResult.error || 'Failed to run screener');
      }

      console.log(`Found ${runResult.symbols?.length || 0} symbols`);

      // Step 3: Note - Barchart screener CSV contains ALL symbols, not per-symbol
      // Skipping Barchart CSV download as we'll get option chains from CBOE instead
      const csvPaths: { [symbol: string]: string } = {};

      // Step 4: Return results
      return this.success({
        symbols: runResult.symbols || [],
        data: runResult.data || [],
        csvPaths: Object.keys(csvPaths).length > 0 ? csvPaths : undefined,
        screenerName: this.config.screenerName,
      });
    } catch (error) {
      return this.error(error instanceof Error ? error.message : 'Screener skill failed');
    }
  }

  /**
   * Execute and return only symbols (simplified usage)
   */
  async getSymbols(): Promise<string[]> {
    const result = await this.execute();

    if (result.success && result.data) {
      return result.data.symbols;
    }

    return [];
  }
}
