/**
 * Barchart Screener Page Object
 *
 * Handles interaction with Barchart stock screener
 */

import { Page, Download } from 'playwright';
import { BasePage } from './BasePage';

export interface BarchartScreenerConfig {
  screenerUrl: string;
  screenerName?: string;
}

export class BarchartScreenerPage extends BasePage {
  private readonly config: BarchartScreenerConfig;

  // Selectors
  private readonly selectors = {
    seeResultsButton: 'a.bc-screener__see-results-button, a:has-text("See Results"), button:has-text("SEE RESULTS"), button:has-text("See Results"), [data-testid="see-results"]',
    resultsGrid: 'div#_grid, div._grid',
    resultsTable: 'table.screener-table, table.results-table, .bc-table table, table',
    symbolLinks: 'div._cell.symbol a',
    downloadButton: 'a.toolbar-button.download[data-bc-download-button], a:has(i.bc-glyph-download), button:has(i.bc-glyph-download)',
    loadingIndicator: '.loading, .spinner, [data-loading="true"]',
    noResultsMessage: '.no-results, .empty-state',
  };

  constructor(page: Page, config: BarchartScreenerConfig, timeout?: number) {
    super(page, timeout);
    this.config = config;
  }

  /**
   * Navigate to screener page
   */
  async navigateToScreener(): Promise<void> {
    await this.navigate(this.config.screenerUrl);
    await this.waitForLoadState('networkidle');

    // Extra wait for Angular app to initialize
    await this.sleep(3000);
  }

  /**
   * Click "See Results" button (or skip if results already visible)
   */
  async clickSeeResults(): Promise<void> {
    try {
      // Check if "See Results" button exists
      console.log('Looking for "See Results" button...');
      await this.waitForSelector(this.selectors.seeResultsButton, { timeout: 10000 });
      console.log('Found "See Results" button, clicking...');
      await this.click(this.selectors.seeResultsButton);
      console.log('Clicked "See Results" button');
    } catch (error) {
      // Button not found - results might already be visible
      console.log('No "See Results" button found - results may already be visible');
      console.log('Error:', error instanceof Error ? error.message : error);
    }

    // Wait for loading to complete
    await this.waitForResultsToLoad();
  }

  /**
   * Wait for results table/grid to load
   */
  async waitForResultsToLoad(): Promise<void> {
    // Wait for loading indicator to disappear
    try {
      await this.waitForSelector(this.selectors.loadingIndicator, { state: 'hidden', timeout: 5000 });
    } catch {
      // Loading indicator might not exist, that's okay
    }

    // Wait for network to be idle (Angular loading)
    await this.waitForLoadState('networkidle');

    // Extra wait for Angular/dynamic content to fully populate
    await this.sleep(5000);

    // Check if symbol links are visible
    const symbolsVisible = await this.isVisible(this.selectors.symbolLinks);

    if (!symbolsVisible) {
      console.log('Symbols not immediately visible, waiting longer...');
      await this.sleep(5000);
    }
  }

  /**
   * Check if "No symbols found" message is displayed
   */
  async hasNoSymbolsMessage(): Promise<boolean> {
    try {
      const pageContent = await this.page.content();
      return pageContent.includes('No symbols found that match the requirements');
    } catch {
      return false;
    }
  }

  /**
   * Check if results are available
   */
  async hasResults(): Promise<boolean> {
    // First check for explicit "no symbols" message
    if (await this.hasNoSymbolsMessage()) {
      return false;
    }

    const hasGrid = await this.isVisible(this.selectors.resultsGrid);
    const hasTable = await this.isVisible(this.selectors.resultsTable);
    const hasNoResultsMsg = await this.isVisible(this.selectors.noResultsMessage);

    return (hasGrid || hasTable) && !hasNoResultsMsg;
  }

  /**
   * Extract table data from results
   */
  async extractResults(): Promise<string[][]> {
    if (!(await this.hasResults())) {
      return [];
    }

    return await this.extractTableData(this.selectors.resultsTable, true);
  }

  /**
   * Download results as CSV for a specific symbol
   */
  async downloadCSV(
    symbol: string,
    baseAssetsPath: string = '../assets'
  ): Promise<{ success: boolean; filePath?: string; error?: string }> {
    try {
      // Check if download button exists
      console.log('Looking for download button...');
      await this.waitForSelector(this.selectors.downloadButton, { timeout: 10000 });

      const hasDownloadButton = await this.isVisible(this.selectors.downloadButton);

      if (!hasDownloadButton) {
        return { success: false, error: 'Download button not found' };
      }

      console.log('Found download button, clicking...');

      // Create symbol directory if it doesn't exist
      const fs = require('fs');
      const path = require('path');
      const symbolDir = path.resolve(baseAssetsPath, symbol);

      if (!fs.existsSync(symbolDir)) {
        fs.mkdirSync(symbolDir, { recursive: true });
        console.log(`Created directory: ${symbolDir}`);
      }

      // Start download
      const downloadPromise = this.page.waitForEvent('download', { timeout: 30000 });

      await this.click(this.selectors.downloadButton);

      const download: Download = await downloadPromise;

      // Save to symbol directory with standard name
      const fileName = 'screener.csv';
      const fullPath = path.join(symbolDir, fileName);

      await download.saveAs(fullPath);

      console.log(`Saved CSV to: ${fullPath}`);

      return { success: true, filePath: fullPath };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Download failed',
      };
    }
  }

  /**
   * Extract stock symbols from results
   */
  async extractSymbols(): Promise<string[]> {
    try {
      console.log('Attempting to extract symbols...');
      console.log('Using selector:', this.selectors.symbolLinks);

      // Try to extract from custom grid (Barchart's Angular component)
      const symbolLinks = await this.page.$$(this.selectors.symbolLinks);
      console.log(`Found ${symbolLinks.length} symbol links with primary selector`);

      if (symbolLinks.length > 0) {
        const symbols: string[] = [];

        for (const link of symbolLinks) {
          // Extract symbol from href: /stocks/quotes/SPY/overview → SPY
          const href = await link.getAttribute('href');
          if (href) {
            const match = href.match(/\/quotes\/([^\/]+)/);
            if (match && match[1]) {
              symbols.push(match[1]);
            }
          }
        }

        if (symbols.length > 0) {
          return symbols;
        }
      }

      // Fallback: Try traditional table extraction
      console.log('Trying fallback: traditional table extraction...');
      const results = await this.extractResults();
      console.log(`Extracted ${results.length} rows from table`);

      if (results.length === 0) {
        console.log('No results found in table, trying alternative selectors...');

        // Try alternative symbol selectors
        const altSelectors = [
          'a[href*="/quotes/"]',
          'table td:first-child a',
          '.symbol a',
          'td.symbol a'
        ];

        for (const selector of altSelectors) {
          console.log(`Trying selector: ${selector}`);
          const links = await this.page.$$(selector);
          console.log(`Found ${links.length} elements`);

          if (links.length > 0) {
            const symbols: string[] = [];
            for (const link of links.slice(0, 20)) { // Limit to 20 to avoid too many
              const href = await link.getAttribute('href');
              if (href && href.includes('/quotes/')) {
                const match = href.match(/\/quotes\/([^\/]+)/);
                if (match && match[1]) {
                  symbols.push(match[1]);
                }
              }
            }
            if (symbols.length > 0) {
              console.log(`Successfully extracted ${symbols.length} symbols with selector: ${selector}`);
              return symbols;
            }
          }
        }

        return [];
      }

      // Skip header row, get first column
      const symbols = results.slice(1).map((row) => row[0]).filter((symbol) => symbol && symbol.length > 0);

      return symbols;
    } catch (error) {
      console.error('Error extracting symbols:', error);
      return [];
    }
  }

  /**
   * Run screener and get results
   */
  async runScreener(): Promise<{
    success: boolean;
    symbols?: string[];
    data?: string[][];
    error?: string;
    noSymbolsFound?: boolean;
  }> {
    try {
      await this.navigateToScreener();
      await this.clickSeeResults();

      // Check for "No symbols found" message first
      const hasNoSymbols = await this.hasNoSymbolsMessage();
      if (hasNoSymbols) {
        return {
          success: false,
          error: 'No symbols found that match the requirements',
          noSymbolsFound: true,
          symbols: [],
          data: []
        };
      }

      if (!(await this.hasResults())) {
        return { success: false, error: 'No results found' };
      }

      const symbols = await this.extractSymbols();
      const data = await this.extractResults();

      return {
        success: true,
        symbols,
        data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Screener run failed',
      };
    }
  }
}
