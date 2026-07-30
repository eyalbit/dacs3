/**
 * Multi-Expiration Skill
 *
 * Extracts options data across multiple expiration dates.
 */

import { Page } from 'playwright';
import { BaseSkill } from './BaseSkill';
import { TableExtractionSkill, TableExtractionConfig } from './TableExtractionSkill';
import { SkillResult } from '../types';

export interface MultiExpirationConfig {
  expirationDropdownSelector: string;
  tableSelector: string;
  waitAfterSelect?: number;
  includeHeader?: boolean;
}

export interface ExpirationData {
  [expiration: string]: string[][];
}

export class MultiExpirationSkill extends BaseSkill<MultiExpirationConfig, ExpirationData> {
  constructor(page: Page, config: MultiExpirationConfig) {
    super(page, {
      waitAfterSelect: 1000,
      includeHeader: true,
      ...config,
    });
  }

  /**
   * Execute multi-expiration extraction
   */
  async execute(): Promise<SkillResult<ExpirationData>> {
    try {
      this.validateConfig(['expirationDropdownSelector', 'tableSelector']);

      // Get all expiration options
      const expirations = await this.page.$$eval(
        `${this.config.expirationDropdownSelector} option`,
        options =>
          options.map(option => ({
            value: option.getAttribute('value') || '',
            text: option.textContent?.trim() || '',
          }))
      );

      const allData: ExpirationData = {};

      // Create table extraction skill
      const tableSkill = new TableExtractionSkill(this.page, {
        tableSelector: this.config.tableSelector,
        includeHeader: this.config.includeHeader,
        outputFormat: 'array',
      });

      // Extract data for each expiration
      for (const exp of expirations) {
        // Select expiration
        await this.page.selectOption(this.config.expirationDropdownSelector, exp.value);
        await this.page.waitForTimeout(this.config.waitAfterSelect!);

        // Extract table data
        const result = await tableSkill.execute();

        if (result.success && Array.isArray(result.data)) {
          allData[exp.text] = result.data;
        }
      }

      return this.success(allData);
    } catch (error) {
      return this.error(error instanceof Error ? error.message : 'Unknown error');
    }
  }
}
