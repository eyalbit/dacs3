/**
 * CSV Download Skill
 *
 * Clicks download button and saves CSV file.
 */

import { Page } from 'playwright';
import { BaseSkill } from './BaseSkill';
import { SkillResult } from '../types';
import * as fs from 'fs';
import * as path from 'path';

export interface CSVDownloadConfig {
  downloadButtonSelector: string;
  timeout?: number;
}

export class CSVDownloadSkill extends BaseSkill<CSVDownloadConfig, string> {
  constructor(page: Page, config: CSVDownloadConfig) {
    super(page, {
      timeout: 10000,
      ...config,
    });
  }

  /**
   * Execute CSV download
   */
  async execute(outputDir: string, filename?: string): Promise<SkillResult<string>> {
    try {
      this.validateConfig(['downloadButtonSelector']);

      // Ensure output directory exists
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Wait for download
      const [download] = await Promise.all([
        this.page.waitForEvent('download', { timeout: this.config.timeout }),
        this.page.click(this.config.downloadButtonSelector),
      ]);

      // Determine filename
      const finalFilename = filename || download.suggestedFilename();
      const filepath = path.join(outputDir, finalFilename);

      // Save file
      await download.saveAs(filepath);

      return this.success(filepath);
    } catch (error) {
      return this.error(error instanceof Error ? error.message : 'Unknown error');
    }
  }
}
