/**
 * CBOE Option Chain Page Object
 *
 * Handles interaction with CBOE delayed quotes option chain
 */

import { Page, Download } from 'playwright';
import { BasePage } from './BasePage';

export interface CboeOptionChainConfig {
  symbol: string;
  baseAssetsPath?: string;
}

export class CboeOptionChainPage extends BasePage {
  private readonly config: CboeOptionChainConfig;
  private readonly baseUrl = 'https://www.cboe.com/delayed_quotes';

  // Selectors
  private readonly selectors = {
    cookieAcceptButton: '#onetrust-accept-btn-handler, button:has-text("Accept All Cookies")',
    // The 3rd ReactSelect dropdown is the Options Range (0-indexed, so nth(2))
    optionsRangeDropdown: '.ReactSelect__control >> nth=2',
    dropdownInput: '.ReactSelect__input input',
    allOption: 'div[id*="react-select"][id*="option"]:has-text("All")',
    viewChainButton: 'button:has-text("View Chain")',
    downloadButton: 'a[download*="_quotedata.csv"]:has-text("Download CSV")',
    monthButtons: 'button.Button__StyledButton-cui__sc-1c5gtgp-2',
    loadingIndicator: '.loading, .spinner',
  };

  constructor(page: Page, config: CboeOptionChainConfig, timeout?: number) {
    super(page, timeout);
    this.config = config;
  }

  /**
   * Get URL for symbol's option chain
   */
  private getUrl(): string {
    return `${this.baseUrl}/${this.config.symbol}/quote_table`;
  }

  /**
   * Navigate to option chain page
   */
  async navigateToOptionChain(): Promise<void> {
    const url = this.getUrl();
    console.log(`   Navigating to: ${url}`);
    await this.navigate(url);
    await this.waitForLoadState('networkidle');
    await this.sleep(2000);

    // Handle cookie consent banner
    await this.dismissCookieBanner();
    console.log('✓ Page loaded');
  }

  /**
   * Dismiss cookie consent banner if present
   */
  async dismissCookieBanner(): Promise<void> {
    try {
      const cookieButton = await this.page.$(this.selectors.cookieAcceptButton);
      if (cookieButton) {
        await cookieButton.click();
        await this.sleep(1000);
      }
    } catch {
      // Cookie banner not present or already dismissed
    }
  }

  /**
   * Select "All" from Options Range dropdown
   */
  async selectAllOptions(): Promise<void> {
    try {
      console.log('🔄 Selecting "All" in Options Range dropdown...');

      // Wait for dropdown to be ready
      await this.waitForSelector(this.selectors.optionsRangeDropdown, { timeout: 10000 });
      await this.sleep(3000); // Extra wait for React to initialize

      // Check current value
      let dropdownText = await this.page.textContent(this.selectors.optionsRangeDropdown);
      console.log(`   Current dropdown value: "${dropdownText?.trim()}"`);

      // Method 1: Try clicking directly on "All" option in the menu
      console.log('   Opening dropdown menu...');
      await this.page.click(this.selectors.optionsRangeDropdown, { force: true });
      await this.sleep(2000);

      // Look for "All" option in the dropdown menu
      console.log('   Looking for "All" option in menu...');
      const allOptionExists = await this.page.locator(this.selectors.allOption).count();
      console.log(`   Found ${allOptionExists} "All" options`);

      if (allOptionExists > 0) {
        console.log('   Clicking on "All" option...');
        await this.page.locator(this.selectors.allOption).first().click();
        await this.sleep(2000);
      } else {
        // Fallback: Use keyboard to select
        console.log('   "All" option not found in menu, using keyboard...');
        await this.page.keyboard.type('All', { delay: 150 });
        await this.sleep(1000);
        await this.page.keyboard.press('Enter');
        await this.sleep(2000);
      }

      // Verify selection
      dropdownText = await this.page.textContent(this.selectors.optionsRangeDropdown);
      console.log(`   Dropdown value after selection: "${dropdownText?.trim()}"`);

      if (dropdownText && dropdownText.includes('All')) {
        console.log('✓ Successfully selected "All" in Options Range');
      } else {
        throw new Error(`Failed to select "All" - dropdown shows: "${dropdownText}"`);
      }
    } catch (error) {
      console.error('Error selecting All options:', error);
      throw error;
    }
  }

  /**
   * Click "View Chain" button
   */
  async clickViewChain(): Promise<void> {
    console.log('🔍 Clicking "View Chain" button...');
    await this.waitForSelector(this.selectors.viewChainButton, { timeout: 10000 });
    await this.click(this.selectors.viewChainButton);

    // Wait for results to load
    console.log('   Waiting for option chain data to load...');
    await this.waitForLoadState('networkidle');
    await this.sleep(3000);
    console.log('✓ Option chain loaded');
  }

  /**
   * Get available expiration months
   */
  async getExpirationMonths(): Promise<string[]> {
    try {
      const buttons = await this.page.$$(this.selectors.monthButtons);
      const months: string[] = [];

      for (const button of buttons) {
        const text = await button.textContent();
        if (text) {
          const trimmed = text.trim();
          // Filter out non-month buttons (must contain year like "2026" or "2027")
          if (trimmed.match(/\d{4}/)) {
            months.push(trimmed);
          }
        }
      }

      return months;
    } catch (error) {
      console.error('Error getting expiration months:', error);
      return [];
    }
  }

  /**
   * Click on a specific month button
   */
  async selectMonth(monthText: string): Promise<void> {
    const button = await this.page.$(`button:has-text("${monthText}")`);
    if (button) {
      await button.click();
      await this.sleep(2000);
    } else {
      throw new Error(`Month button "${monthText}" not found`);
    }
  }

  /**
   * Download option chain CSV with month suffix
   */
  async downloadOptionChainCSV(monthSuffix: string = ''): Promise<{ success: boolean; filePath?: string; error?: string }> {
    try {
      // Wait for download button to appear
      await this.waitForSelector(this.selectors.downloadButton, { timeout: 10000 });

      const hasDownloadButton = await this.isVisible(this.selectors.downloadButton);

      if (!hasDownloadButton) {
        return { success: false, error: 'Download button not found' };
      }

      // Create symbol directory if it doesn't exist
      const fs = require('fs');
      const path = require('path');
      const assetsPath = this.config.baseAssetsPath || '../assets';
      const symbolDir = path.resolve(assetsPath, this.config.symbol);

      if (!fs.existsSync(symbolDir)) {
        fs.mkdirSync(symbolDir, { recursive: true });
      }

      // Start download
      const downloadPromise = this.page.waitForEvent('download', { timeout: 30000 });

      await this.click(this.selectors.downloadButton);

      const download: Download = await downloadPromise;

      // Save with month suffix if provided
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const suffix = monthSuffix ? `_${monthSuffix}` : '';
      const fileName = `${this.config.symbol}_quotedata${suffix}_${timestamp}.csv`;
      const fullPath = path.join(symbolDir, fileName);

      await download.saveAs(fullPath);

      return { success: true, filePath: fullPath };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Download failed',
      };
    }
  }

  /**
   * Run complete option chain extraction workflow for current and next month
   */
  async extractOptionChain(): Promise<{ success: boolean; filePaths?: string[]; error?: string }> {
    try {
      console.log(`\n📊 Starting option chain extraction for ${this.config.symbol}...`);

      await this.navigateToOptionChain();
      await this.selectAllOptions(); // This MUST complete before View Chain
      await this.clickViewChain();

      // Get available months
      const months = await this.getExpirationMonths();

      const filePaths: string[] = [];

      // Download first month (current month)
      if (months.length > 0) {
        const result1 = await this.downloadOptionChainCSV(months[0].replace(/\s+/g, '_'));
        if (result1.success && result1.filePath) {
          filePaths.push(result1.filePath);
        }
      }

      // Download second month (next month)
      if (months.length > 1) {
        await this.sleep(1000);
        await this.selectMonth(months[1]);
        await this.sleep(2000);

        const result2 = await this.downloadOptionChainCSV(months[1].replace(/\s+/g, '_'));
        if (result2.success && result2.filePath) {
          filePaths.push(result2.filePath);
        }
      }

      return {
        success: filePaths.length > 0,
        filePaths,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Option chain extraction failed',
      };
    }
  }
}
