/**
 * Base Page Object
 *
 * Provides common functionality for all page objects.
 */

import { Page } from 'playwright';

export abstract class BasePage {
  protected readonly page: Page;
  protected timeout: number;

  constructor(page: Page, timeout: number = 30000) {
    this.page = page;
    this.timeout = timeout;
  }

  /**
   * Navigate to a URL
   */
  async navigate(url: string, waitUntil: 'load' | 'domcontentloaded' | 'networkidle' = 'load'): Promise<void> {
    await this.page.goto(url, { waitUntil, timeout: this.timeout });
  }

  /**
   * Wait for a selector to appear
   */
  async waitForSelector(
    selector: string,
    options: { state?: 'visible' | 'attached' | 'hidden'; timeout?: number } = {}
  ): Promise<void> {
    await this.page.waitForSelector(selector, {
      state: options.state || 'visible',
      timeout: options.timeout || this.timeout,
    });
  }

  /**
   * Click an element
   */
  async click(selector: string, options: { timeout?: number } = {}): Promise<void> {
    await this.page.click(selector, { timeout: options.timeout || this.timeout });
  }

  /**
   * Fill an input field
   */
  async fill(selector: string, text: string, options: { timeout?: number } = {}): Promise<void> {
    await this.page.fill(selector, text, { timeout: options.timeout || this.timeout });
  }

  /**
   * Select option from dropdown
   */
  async selectOption(selector: string, value: string | string[], options: { timeout?: number } = {}): Promise<void> {
    await this.page.selectOption(selector, value, { timeout: options.timeout || this.timeout });
  }

  /**
   * Get text content of an element
   */
  async getText(selector: string): Promise<string> {
    const element = await this.page.$(selector);
    if (!element) return '';

    const text = await element.textContent();
    return text?.trim() || '';
  }

  /**
   * Get text content of all matching elements
   */
  async getAllTexts(selector: string): Promise<string[]> {
    return await this.page.$$eval(selector, elements =>
      elements.map(el => el.textContent?.trim() || '')
    );
  }

  /**
   * Extract data from an HTML table
   */
  async extractTableData(tableSelector: string, includeHeader: boolean = true): Promise<string[][]> {
    // Extract headers
    const headers = await this.page.$$eval(`${tableSelector} thead th`, elements =>
      elements.map(el => el.textContent?.trim() || '')
    );

    // Extract rows
    const rows = await this.page.$$eval(`${tableSelector} tbody tr`, rows =>
      rows.map(row =>
        Array.from(row.querySelectorAll('td')).map((cell: Element) => cell.textContent?.trim() || '')
      )
    );

    if (includeHeader && headers.length > 0) {
      return [headers, ...rows];
    }
    return rows;
  }

  /**
   * Wait for page load state
   */
  async waitForLoadState(state: 'load' | 'domcontentloaded' | 'networkidle' = 'load'): Promise<void> {
    await this.page.waitForLoadState(state, { timeout: this.timeout });
  }

  /**
   * Sleep for specified duration
   */
  async sleep(milliseconds: number): Promise<void> {
    await this.page.waitForTimeout(milliseconds);
  }

  /**
   * Execute JavaScript in page context
   */
  async evaluate<R>(pageFunction: string | ((arg?: any) => R), arg?: any): Promise<R> {
    return await this.page.evaluate(pageFunction as any, arg);
  }

  /**
   * Check if element is visible
   */
  async isVisible(selector: string): Promise<boolean> {
    try {
      const element = await this.page.$(selector);
      if (!element) return false;

      return await element.isVisible();
    } catch {
      return false;
    }
  }

  /**
   * Take a screenshot
   */
  async screenshot(path: string): Promise<void> {
    await this.page.screenshot({ path });
  }

  /**
   * Get current URL
   */
  getCurrentUrl(): string {
    return this.page.url();
  }
}
