/**
 * Type definitions for DACS Scraper
 */

import { Page, Browser, BrowserContext } from 'playwright';

/**
 * Scraper configuration options
 */
export interface ScraperConfig {
  headless?: boolean;
  slowMo?: number;
  browserType?: 'chromium' | 'firefox' | 'webkit';
  viewport?: ViewportSize;
  userAgent?: string;
  timeout?: number;
}

/**
 * Viewport size
 */
export interface ViewportSize {
  width: number;
  height: number;
}

/**
 * Page object configuration
 */
export interface PageConfig {
  urlTemplate: string;
  selectors: PageSelectors;
  waitFor?: string;
  timeout?: number;
}

/**
 * CSS selectors for page elements
 */
export interface PageSelectors {
  optionsTable: string;
  expirationDropdown?: string;
  downloadButton?: string;
  loadingIndicator?: string;
  symbolInput?: string;
  [key: string]: string | undefined;
}

/**
 * Options chain data row
 */
export interface OptionsRow {
  expiration: string;
  strike: number;
  callBid: number;
  callAsk: number;
  callDelta: number;
  callVolume: number;
  callOI: number;
  callIV: number;
  putBid: number;
  putAsk: number;
  putDelta: number;
  putVolume: number;
  putOI: number;
  putIV: number;
  [key: string]: string | number;
}

/**
 * Stock information
 */
export interface StockInfo {
  symbol: string;
  price?: number;
  change?: number;
  volume?: number;
  [key: string]: string | number | undefined;
}

/**
 * Scraping result
 */
export interface ScrapingResult {
  symbol: string;
  timestamp: Date;
  data: string[][];
  stockInfo?: StockInfo;
  outputPath?: string;
  success: boolean;
  error?: string;
}

/**
 * Skill execution result
 */
export interface SkillResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Browser fixture interface
 */
export interface IBrowserFixture {
  browser: Browser | null;
  context: BrowserContext | null;
  start(): Promise<void>;
  stop(): Promise<void>;
  newPage(): Promise<Page>;
  setDefaultTimeout(timeout: number): void;
}

/**
 * Base skill interface
 */
export interface ISkill<T = any> {
  execute(...args: any[]): Promise<SkillResult<T>>;
}
