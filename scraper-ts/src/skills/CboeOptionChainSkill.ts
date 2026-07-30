/**
 * CBOE Option Chain Skill
 *
 * Extracts option chains from CBOE for multiple symbols
 */

import { Page } from 'playwright';
import { BaseSkill } from './BaseSkill';
import { CboeOptionChainPage } from '../pages/CboeOptionChainPage';

export interface CboeOptionChainConfig {
  symbols: string[];
  assetsBasePath?: string;
}

export interface OptionChainResult {
  success: boolean;
  filePaths: { [symbol: string]: string[] };
  errors: { [symbol: string]: string };
}

export class CboeOptionChainSkill extends BaseSkill<CboeOptionChainConfig, OptionChainResult> {
  constructor(page: Page, config: CboeOptionChainConfig) {
    super(page, config);
    this.validateConfig(['symbols']);
  }

  /**
   * Extract option chain for a single symbol (current + next month)
   */
  private async extractForSymbol(symbol: string): Promise<{ success: boolean; filePaths?: string[]; error?: string }> {
    try {
      console.log(`\n📊 Extracting option chains for ${symbol}...`);

      const optionChainPage = new CboeOptionChainPage(this.page, {
        symbol,
        baseAssetsPath: this.config.assetsBasePath,
      });

      const result = await optionChainPage.extractOptionChain();

      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Execute option chain extraction for all symbols (current + next month)
   */
  async execute(): Promise<{ success: boolean; data?: OptionChainResult; error?: string }> {
    try {
      const filePaths: { [symbol: string]: string[] } = {};
      const errors: { [symbol: string]: string } = {};

      console.log(`\n🚀 Starting option chain extraction for ${this.config.symbols.length} symbols...\n`);

      for (const symbol of this.config.symbols) {
        const result = await this.extractForSymbol(symbol);

        if (result.success && result.filePaths && result.filePaths.length > 0) {
          filePaths[symbol] = result.filePaths;
          console.log(`✓ ${symbol}: ${result.filePaths.length} files downloaded`);
          result.filePaths.forEach((path, i) => console.log(`  ${i + 1}. ${path}`));
        } else {
          errors[symbol] = result.error || 'Unknown error';
          console.error(`✗ ${symbol}: ${result.error}`);
        }

        // Small delay between symbols
        await this.page.waitForTimeout(1000);
      }

      const successCount = Object.keys(filePaths).length;
      const errorCount = Object.keys(errors).length;

      console.log(`\n📊 Summary:`);
      console.log(`   Success: ${successCount}/${this.config.symbols.length}`);
      console.log(`   Failed: ${errorCount}/${this.config.symbols.length}`);

      return this.success({
        success: successCount > 0,
        filePaths,
        errors,
      });
    } catch (error) {
      return this.error(error instanceof Error ? error.message : 'Option chain skill failed');
    }
  }
}
