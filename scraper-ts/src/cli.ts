#!/usr/bin/env node
/**
 * CLI Interface for DACS Options Scraper
 *
 * ⚠️ DEPRECATED: Use cli-screener.ts instead for dynamic screener-based scraping
 * This file is kept for backwards compatibility only.
 */

import { OptionsScraper } from './scraper/OptionsScraper';

interface CliArgs {
  asset?: string;
  all?: boolean;
  headless?: boolean;
  source?: string;
}

function parseArgs(): CliArgs {
  const args: CliArgs = {
    headless: true,
    source: 'default',
  };

  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];

    if (arg === '--asset' && i + 1 < process.argv.length) {
      args.asset = process.argv[++i];
    } else if (arg === '--all') {
      args.all = true;
    } else if (arg === '--headless=false' || arg === '--no-headless') {
      args.headless = false;
    } else if (arg === '--source' && i + 1 < process.argv.length) {
      args.source = process.argv[++i];
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  return args;
}

function printHelp(): void {
  console.log(`
⚠️  DEPRECATED: This CLI is no longer maintained.

Use the Barchart Screener CLI instead:
  npm run screener

This command dynamically fetches symbols from your Barchart screener
and scrapes them automatically. No hardcoded asset lists needed.

For manual single-asset scraping (testing only):
  --asset <symbol>     Scrape a single asset
  --headless=false     Run browser in visible mode
  --help, -h           Show this help message

Recommended: Use "npm run screener" for production scraping.
`);
}

async function main() {
  const args = parseArgs();

  const scraper = new OptionsScraper({
    headless: args.headless,
  });

  if (args.all) {
    // DEPRECATED: Use screener instead
    console.error('\n⚠️  ERROR: --all flag is deprecated.');
    console.error('Use "npm run screener" to dynamically scrape from Barchart screener.\n');
    process.exit(1);
  } else if (args.asset) {
    // Scrape single asset
    const result = await scraper.scrapeAsset(args.asset, undefined, args.source);

    if (result.success) {
      console.log(`\n✅ Success: ${result.outputPath}`);
      process.exit(0);
    } else {
      console.log(`\n❌ Failed: ${result.error}`);
      process.exit(1);
    }
  } else {
    // No arguments, show help
    printHelp();
    process.exit(0);
  }
}

// Run CLI
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
