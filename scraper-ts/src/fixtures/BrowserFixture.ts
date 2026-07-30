/**
 * Browser Fixture
 *
 * Manages Playwright browser lifecycle with proper resource cleanup.
 */

import { chromium, firefox, webkit, Browser, BrowserContext, Page } from 'playwright';
import { ScraperConfig, IBrowserFixture } from '../types';
import { DEFAULT_SCRAPER_CONFIG } from '../config';

export class BrowserFixture implements IBrowserFixture {
  public browser: Browser | null = null;
  public context: BrowserContext | null = null;
  private pages: Page[] = [];
  private config: ScraperConfig;

  constructor(config: Partial<ScraperConfig> = {}) {
    this.config = { ...DEFAULT_SCRAPER_CONFIG, ...config };
  }

  /**
   * Start browser session
   */
  async start(): Promise<void> {
    // Select browser type
    const browserLauncher =
      this.config.browserType === 'firefox'
        ? firefox
        : this.config.browserType === 'webkit'
        ? webkit
        : chromium;

    // Launch browser
    this.browser = await browserLauncher.launch({
      headless: this.config.headless,
      slowMo: this.config.slowMo,
    });

    // Create context
    this.context = await this.browser.newContext({
      viewport: this.config.viewport,
      userAgent: this.config.userAgent,
    });

    // Set default timeout
    if (this.config.timeout) {
      this.context.setDefaultTimeout(this.config.timeout);
    }
  }

  /**
   * Stop browser and cleanup resources
   */
  async stop(): Promise<void> {
    // Close all pages
    for (const page of this.pages) {
      try {
        await page.close();
      } catch (error) {
        // Ignore errors during cleanup
      }
    }
    this.pages = [];

    // Close context
    if (this.context) {
      try {
        await this.context.close();
      } catch (error) {
        // Ignore errors during cleanup
      }
      this.context = null;
    }

    // Close browser
    if (this.browser) {
      try {
        await this.browser.close();
      } catch (error) {
        // Ignore errors during cleanup
      }
      this.browser = null;
    }
  }

  /**
   * Create a new page
   */
  async newPage(): Promise<Page> {
    if (!this.context) {
      throw new Error('Browser context not initialized. Call start() first.');
    }

    const page = await this.context.newPage();
    this.pages.push(page);
    return page;
  }

  /**
   * Set default timeout for all pages
   */
  setDefaultTimeout(timeout: number): void {
    if (this.context) {
      this.context.setDefaultTimeout(timeout);
    }
  }

  /**
   * Create a new browser context
   */
  async newContext(options = {}): Promise<BrowserContext> {
    if (!this.browser) {
      throw new Error('Browser not initialized. Call start() first.');
    }

    return await this.browser.newContext(options);
  }
}

/**
 * Create a browser fixture with auto-cleanup
 */
export async function withBrowser<T>(
  config: Partial<ScraperConfig>,
  callback: (fixture: BrowserFixture) => Promise<T>
): Promise<T> {
  const fixture = new BrowserFixture(config);

  try {
    await fixture.start();
    return await callback(fixture);
  } finally {
    await fixture.stop();
  }
}

/**
 * Create browser fixture from environment variables
 */
export function createBrowserFromEnv(): BrowserFixture {
  return new BrowserFixture(DEFAULT_SCRAPER_CONFIG);
}
