/**
 * Options Chain Page Object
 *
 * Represents a generic options chain page with common operations.
 */

import { Page } from 'playwright';
import { BasePage } from './BasePage';
import { PageConfig, StockInfo } from '../types';
import { createObjectCsvWriter } from 'csv-writer';
import * as fs from 'fs';
import * as path from 'path';

export class OptionsChainPage extends BasePage {
  private config: PageConfig;

  constructor(page: Page, config: PageConfig) {
    super(page, config.timeout);
    this.config = config;
  }

  /**
   * Load options data for a specific symbol
   */
  async loadSymbol(symbol: string): Promise<void> {
    const url = this.config.urlTemplate.replace('{symbol}', symbol.toUpperCase());
    await this.navigate(url);

    // Wait for main content
    const waitFor = this.config.waitFor || this.config.selectors.optionsTable;
    await this.waitForSelector(waitFor);

    // Wait for loading indicator to disappear
    const loadingIndicator = this.config.selectors.loadingIndicator;
    if (loadingIndicator && (await this.isVisible(loadingIndicator))) {
      await this.waitForSelector(loadingIndicator, { state: 'hidden' });
    }

    // Additional wait for JavaScript
    await this.sleep(2000);
  }

  /**
   * Get all available expiration dates
   */
  async getExpirationDates(): Promise<Array<{ value: string; text: string }>> {
    const dropdown = this.config.selectors.expirationDropdown;
    if (!dropdown) return [];

    return await this.page.$$eval(`${dropdown} option`, options =>
      options.map(option => ({
        value: option.getAttribute('value') || '',
        text: option.textContent?.trim() || '',
      }))
    );
  }

  /**
   * Select an expiration date
   */
  async selectExpiration(expirationValue: string): Promise<void> {
    const dropdown = this.config.selectors.expirationDropdown;
    if (!dropdown) {
      throw new Error('Expiration dropdown selector not configured');
    }

    await this.selectOption(dropdown, expirationValue);
    await this.sleep(1000); // Wait for table to update
  }

  /**
   * Extract options table data
   */
  async extractOptionsTable(): Promise<string[][]> {
    const tableSelector = this.config.selectors.optionsTable;
    return await this.extractTableData(tableSelector, true);
  }

  /**
   * Extract data for all expiration dates
   */
  async extractAllExpirations(): Promise<Record<string, string[][]>> {
    const expirations = await this.getExpirationDates();
    const allData: Record<string, string[][]> = {};

    for (const exp of expirations) {
      await this.selectExpiration(exp.value);
      const data = await this.extractOptionsTable();
      allData[exp.text] = data;
    }

    return allData;
  }

  /**
   * Click download button and get file path
   */
  async clickDownload(downloadDir: string): Promise<string> {
    const downloadButton = this.config.selectors.downloadButton;
    if (!downloadButton) {
      throw new Error('Download button selector not configured');
    }

    // Ensure download directory exists
    if (!fs.existsSync(downloadDir)) {
      fs.mkdirSync(downloadDir, { recursive: true });
    }

    // Wait for download
    const [download] = await Promise.all([
      this.page.waitForEvent('download', { timeout: this.timeout }),
      this.click(downloadButton),
    ]);

    // Save file
    const filename = download.suggestedFilename();
    const filepath = path.join(downloadDir, filename);
    await download.saveAs(filepath);

    return filepath;
  }

  /**
   * Extract stock information from page
   */
  async getStockInfo(): Promise<StockInfo> {
    const info: StockInfo = {
      symbol: '',
    };

    // TODO: Customize selectors based on your page
    try {
      const symbolSelector = '.stock-symbol';
      const priceSelector = '.stock-price';
      const changeSelector = '.stock-change';
      const volumeSelector = '.stock-volume';

      if (await this.isVisible(symbolSelector)) {
        info.symbol = await this.getText(symbolSelector);
      }

      if (await this.isVisible(priceSelector)) {
        const priceText = await this.getText(priceSelector);
        info.price = parseFloat(priceText.replace(/[^0-9.-]/g, ''));
      }

      if (await this.isVisible(changeSelector)) {
        const changeText = await this.getText(changeSelector);
        info.change = parseFloat(changeText.replace(/[^0-9.-]/g, ''));
      }

      if (await this.isVisible(volumeSelector)) {
        const volumeText = await this.getText(volumeSelector);
        info.volume = parseInt(volumeText.replace(/[^0-9]/g, ''));
      }
    } catch (error) {
      // Ignore errors in stock info extraction
    }

    return info;
  }

  /**
   * Save table data to CSV file
   */
  async saveTableToCSV(data: string[][], outputPath: string): Promise<void> {
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Create CSV content
    const csvContent = data.map(row => row.join(',')).join('\n');

    // Write to file
    fs.writeFileSync(outputPath, csvContent, 'utf-8');
  }
}
