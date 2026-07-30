/**
 * Scraper Configuration
 *
 * Central configuration for scraper behavior, data sources, and selectors.
 */

import dotenv from 'dotenv';
import { ScraperConfig, PageConfig } from '../types';

// Load environment variables
dotenv.config();

/**
 * Default browser configuration
 */
export const DEFAULT_SCRAPER_CONFIG: ScraperConfig = {
  headless: process.env.SCRAPER_HEADLESS === 'true',
  slowMo: parseInt(process.env.SCRAPER_SLOW_MO || '0'),
  browserType: (process.env.SCRAPER_BROWSER as any) || 'chromium',
  viewport: {
    width: parseInt(process.env.SCRAPER_VIEWPORT_WIDTH || '1920'),
    height: parseInt(process.env.SCRAPER_VIEWPORT_HEIGHT || '1080'),
  },
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  timeout: parseInt(process.env.DEFAULT_TIMEOUT || '30000'),
};

/**
 * DEPRECATED: Asset symbols are now dynamically fetched from Barchart screener.
 * No hardcoded asset list should be used.
 * Use BarchartScreenerPage.scrapeSymbols() to get dynamic list of assets.
 */

/**
 * Data source configurations
 *
 * TODO: Customize these for your specific data source
 */
export const DATA_SOURCES: Record<string, PageConfig> = {
  default: {
    urlTemplate: process.env.OPTIONS_DATA_URL || 'https://example.com/options/{symbol}',
    selectors: {
      optionsTable: 'table.options-chain',
      expirationDropdown: 'select#expiration',
      downloadButton: 'button.download-csv',
      loadingIndicator: '.loading',
      symbolInput: 'input#symbol',
    },
    waitFor: 'table.options-chain',
    timeout: parseInt(process.env.LOAD_TIMEOUT || '60000'),
  },

  // Example: CBOE configuration
  cboe: {
    urlTemplate: 'https://www.cboe.com/delayed_quotes/{symbol}/quote_table',
    selectors: {
      optionsTable: 'table.options-table',
      expirationDropdown: 'select.expiration-picker',
    },
    waitFor: 'table.options-table',
    timeout: 30000,
  },
};

/**
 * Output configuration
 */
export const OUTPUT_CONFIG = {
  baseDir: process.env.OUTPUT_DIR || '../assets',
  filenamePrefix: 'quotedata',
  encoding: 'utf-8' as BufferEncoding,
};

/**
 * Get configuration for a specific data source
 */
export function getDataSourceConfig(sourceName: string = 'default'): PageConfig {
  return DATA_SOURCES[sourceName] || DATA_SOURCES.default;
}

/**
 * Get output folder for an asset
 */
export function getOutputFolder(asset: string): string {
  return `${OUTPUT_CONFIG.baseDir}/${asset.toLowerCase()}`;
}
