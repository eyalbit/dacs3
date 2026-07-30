/**
 * Options Scraper
 *
 * Main scraper class that orchestrates the scraping process.
 */

import { BrowserFixture } from '../fixtures';
import { OptionsChainPage } from '../pages';
import { TableExtractionSkill, CSVDownloadSkill } from '../skills';
import { getDataSourceConfig, getOutputFolder } from '../config';
import { ensureFolderExists, generateCSVFilename, validateCSVFile, logScraperActivity } from '../utils';
import { ScrapingResult, ScraperConfig } from '../types';

export class OptionsScraper {
  private fixture: BrowserFixture;

  constructor(config?: Partial<ScraperConfig>) {
    this.fixture = new BrowserFixture(config);
  }

  /**
   * Scrape options data for a single asset
   */
  async scrapeAsset(
    asset: string,
    outputFolder?: string,
    sourceName: string = 'default'
  ): Promise<ScrapingResult> {
    const startTime = new Date();
    logScraperActivity(asset, 'START', 'Starting data scrape...');

    // Setup
    asset = asset.toUpperCase();
    if (!outputFolder) {
      outputFolder = getOutputFolder(asset);
    }
    ensureFolderExists(outputFolder);

    const sourceConfig = getDataSourceConfig(sourceName);

    try {
      // Start browser
      await this.fixture.start();
      const page = await this.fixture.newPage();

      // Load page
      const optionsPage = new OptionsChainPage(page, sourceConfig);
      logScraperActivity(asset, 'INFO', `Navigating to data source...`);
      await optionsPage.loadSymbol(asset);

      logScraperActivity(asset, 'INFO', 'Page loaded, extracting data...');

      // Strategy 1: Extract table directly
      const tableSkill = new TableExtractionSkill(page, {
        tableSelector: sourceConfig.selectors.optionsTable,
        includeHeader: true,
        outputFormat: 'csv',
      });

      const csvFilename = generateCSVFilename(asset, 'quotedata');
      const csvPath = `${outputFolder}/${csvFilename}`;

      const result = await tableSkill.execute(csvPath);

      if (!result.success) {
        throw new Error(result.error || 'Failed to extract table data');
      }

      // Validate
      const validation = validateCSVFile(result.data as string, 3);

      if (!validation.isValid) {
        throw new Error(validation.errorMessage || 'Invalid CSV');
      }

      logScraperActivity(asset, 'SUCCESS', `Saved ${validation.rowCount} rows`, result.data as string);

      return {
        symbol: asset,
        timestamp: startTime,
        data: [],
        outputPath: result.data as string,
        success: true,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logScraperActivity(asset, 'ERROR', errorMessage);

      return {
        symbol: asset,
        timestamp: startTime,
        data: [],
        success: false,
        error: errorMessage,
      };
    } finally {
      await this.fixture.stop();
    }
  }

  /**
   * Scrape multiple assets
   */
  async scrapeMultiple(
    assets: string[],
    sourceName: string = 'default'
  ): Promise<Record<string, ScrapingResult>> {
    const results: Record<string, ScrapingResult> = {};

    console.log('\n' + '='.repeat(80));
    console.log(`SCRAPING ${assets.length} ASSETS`);
    console.log('='.repeat(80) + '\n');

    for (let i = 0; i < assets.length; i++) {
      const asset = assets[i];
      console.log(`\n--- Asset ${i + 1}/${assets.length}: ${asset.toUpperCase()} ---`);

      const result = await this.scrapeAsset(asset, undefined, sourceName);
      results[asset] = result;
    }

    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('SCRAPING SUMMARY');
    console.log('='.repeat(80));

    const successCount = Object.values(results).filter(r => r.success).length;

    for (const [asset, result] of Object.entries(results)) {
      const status = result.success ? '✅' : '❌';
      console.log(`${status} ${asset.toUpperCase()}: ${result.success ? 'Success' : 'Failed'}`);
      if (result.outputPath) {
        console.log(`    → ${result.outputPath.split('/').pop()}`);
      }
    }

    console.log(`\nTotal: ${successCount}/${assets.length} successful`);

    return results;
  }
}
