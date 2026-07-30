#!/usr/bin/env node
/**
 * CLI for Barchart Screener
 *
 * Run saved Barchart screeners and export results
 */

import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { BarchartScreenerSkill } from './skills/BarchartScreenerSkill';
import { CboeOptionChainSkill } from './skills/CboeOptionChainSkill';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config();

interface CliArgs {
  headless?: boolean;
  download?: boolean;
  assetsPath?: string;
  clearSession?: boolean;
  optionChains?: boolean;
}

function parseArgs(): CliArgs {
  const args: CliArgs = {
    headless: true,
    download: true,
    assetsPath: path.join(__dirname, '../../assets'),
    optionChains: true,
  };

  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];

    if (arg === '--headless=false' || arg === '--no-headless') {
      args.headless = false;
    } else if (arg === '--no-download') {
      args.download = false;
    } else if (arg === '--no-option-chains') {
      args.optionChains = false;
    } else if (arg === '--assets' && i + 1 < process.argv.length) {
      args.assetsPath = process.argv[++i];
    } else if (arg === '--clear-session') {
      args.clearSession = true;
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  return args;
}

function printHelp(): void {
  console.log(`
Barchart Screener + CBOE Option Chain Extractor

Usage:
  npm run screener [options]

Options:
  --headless=false       Run browser in visible mode (for debugging)
  --no-download          Don't download CSV files
  --no-option-chains     Skip CBOE option chain extraction
  --assets <path>        Base assets directory (default: ../assets)
  --clear-session        Clear saved session and force fresh login
  --help, -h             Show this help message

Examples:
  npm run screener
  npm run screener -- --headless=false
  npm run screener -- --assets ./my-assets
  npm run screener -- --no-option-chains
  npm run screener -- --clear-session

Output Structure:
  Each symbol gets its own directory:
    assets/SPY/
      ├── screener.csv                    (Barchart screener data)
      └── SPY_quotedata_2026-07-30.csv  (CBOE option chain)
    assets/AAPL/
      ├── screener.csv
      └── AAPL_quotedata_2026-07-30.csv

Environment Variables (set in .env):
  BARCHART_EMAIL        Your Barchart email
  BARCHART_PASSWORD     Your Barchart password
  BARCHART_LOGIN_URL    Login page URL (default: https://www.barchart.com/login)
  BARCHART_SCREENER_URL Screener URL with your saved screener ID
`);
}

async function main() {
  const args = parseArgs();

  // Clear session if requested
  if (args.clearSession) {
    const { BarchartLoginSkill } = await import('./skills/BarchartLoginSkill');
    BarchartLoginSkill.clearSession();
    console.log('✓ Session cleared');
    process.exit(0);
  }

  // Validate environment variables
  const email = process.env.BARCHART_EMAIL;
  const password = process.env.BARCHART_PASSWORD;
  const loginUrl = process.env.BARCHART_LOGIN_URL || 'https://www.barchart.com/login';
  const screenerUrl = process.env.BARCHART_SCREENER_URL;

  if (!email || !password) {
    console.error('❌ Error: BARCHART_EMAIL and BARCHART_PASSWORD must be set in .env file');
    process.exit(1);
  }

  if (!screenerUrl) {
    console.error('❌ Error: BARCHART_SCREENER_URL must be set in .env file');
    process.exit(1);
  }

  let browser: Browser | null = null;
  let context: BrowserContext | null = null;
  let page: Page | null = null;

  try {
    console.log('🚀 Starting Barchart Screener...\n');

    // Launch browser
    browser = await chromium.launch({
      headless: args.headless,
      slowMo: args.headless ? 0 : 100,
    });

    context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });

    page = await context.newPage();

    // Create screener skill
    const screenerSkill = new BarchartScreenerSkill(page, {
      screenerUrl,
      screenerName: 'Base Screener-DACS3 for CALL',
      loginConfig: {
        email,
        password,
        loginUrl,
      },
      downloadCSV: args.download,
      assetsBasePath: args.assetsPath,
    });

    // Execute screener
    const result = await screenerSkill.execute();

    if (!result.success) {
      console.error(`\n❌ Screener failed: ${result.error}`);
      process.exit(1);
    }

    // Display results
    console.log('\n✅ Screener completed successfully!\n');
    console.log(`📊 Results:`);
    console.log(`   Symbols found: ${result.data?.symbols.length || 0}`);

    if (result.data?.symbols && result.data.symbols.length > 0) {
      console.log(`   Symbols: ${result.data.symbols.join(', ')}`);
    }

    if (result.data?.csvPaths) {
      console.log(`\n📁 Screener CSV Files:`);
      for (const [symbol, filePath] of Object.entries(result.data.csvPaths)) {
        console.log(`   ${symbol}: ${filePath}`);
      }
    }

    // Step 2: Extract option chains from CBOE
    if (args.optionChains && result.data?.symbols && result.data.symbols.length > 0) {
      console.log('\n📊 Extracting Option Chains from CBOE...\n');

      const optionChainSkill = new CboeOptionChainSkill(page, {
        symbols: result.data.symbols,
        assetsBasePath: args.assetsPath,
      });

      const optionChainResult = await optionChainSkill.execute();

      if (optionChainResult.success && optionChainResult.data) {
        console.log(`\n📁 Option Chain CSV Files:`);
        for (const [symbol, filePaths] of Object.entries(optionChainResult.data.filePaths)) {
          console.log(`   ${symbol}:`);
          filePaths.forEach((path, i) => console.log(`     ${i + 1}. ${path}`));
        }

        if (Object.keys(optionChainResult.data.errors).length > 0) {
          console.log(`\n⚠️ Errors:`);
          for (const [symbol, error] of Object.entries(optionChainResult.data.errors)) {
            console.log(`   ${symbol}: ${error}`);
          }
        }
      }
    }

    console.log('');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  } finally {
    // Cleanup
    if (page) await page.close();
    if (context) await context.close();
    if (browser) await browser.close();
  }
}

// Run CLI
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
