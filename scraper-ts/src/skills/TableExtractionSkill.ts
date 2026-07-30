/**
 * Table Extraction Skill
 *
 * Extracts data from HTML tables.
 */

import { Page } from 'playwright';
import { BaseSkill } from './BaseSkill';
import { SkillResult } from '../types';
import * as fs from 'fs';
import * as path from 'path';

export interface TableExtractionConfig {
  tableSelector: string;
  includeHeader?: boolean;
  outputFormat?: 'array' | 'csv';
}

export class TableExtractionSkill extends BaseSkill<TableExtractionConfig, string[][] | string> {
  constructor(page: Page, config: TableExtractionConfig) {
    super(page, {
      includeHeader: true,
      outputFormat: 'array',
      ...config,
    });
  }

  /**
   * Execute table extraction
   */
  async execute(outputPath?: string): Promise<SkillResult<string[][] | string>> {
    try {
      this.validateConfig(['tableSelector']);

      // Extract headers
      const headers = await this.page.$$eval(`${this.config.tableSelector} thead th`, elements =>
        elements.map(el => el.textContent?.trim() || '')
      );

      // Extract rows
      const rows = await this.page.$$eval(`${this.config.tableSelector} tbody tr`, rows =>
        rows.map(row =>
          Array.from(row.querySelectorAll('td')).map((cell: Element) => cell.textContent?.trim() || '')
        )
      );

      // Combine data
      let data: string[][];
      if (this.config.includeHeader && headers.length > 0) {
        data = [headers, ...rows];
      } else {
        data = rows;
      }

      // Output
      if (this.config.outputFormat === 'csv' && outputPath) {
        const csvPath = await this.saveToCSV(data, outputPath);
        return this.success(csvPath);
      } else {
        return this.success(data);
      }
    } catch (error) {
      return this.error(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Save data to CSV file
   */
  private async saveToCSV(data: string[][], outputPath: string): Promise<string> {
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const csvContent = data.map(row => row.join(',')).join('\n');
    fs.writeFileSync(outputPath, csvContent, 'utf-8');

    return outputPath;
  }
}
