#!/usr/bin/env node
/**
 * CLI Interface for DACS Options Scraper
 */

import { OptionsScraper } from './scraper/OptionsScraper';
import { SUPPORTED_ASSETS } from './config';

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
DACS Options Scraper CLI

Usage:
  npm run scrape -- [options]

Options:
  --asset <symbol>     Scrape a single asset (e.g., BAC, SPY)
  --all                Scrape all supported assets
  --headless=false     Run browser in visible mode (for debugging)
  --source <name>      Data source configuration (default: 'default')
  --help, -h           Show this help message

Examples:
  npm run scrape -- --asset BAC
  npm run scrape -- --all
  npm run scrape -- --asset SPY --headless=false
  npm run scrape -- --asset BAC --source cboe

Supported assets: ${SUPPORTED_ASSETS.join(', ')}
`);
}

async function main() {
  const args = parseArgs();

  const scraper = new OptionsScraper({
    headless: args.headless,
  });

  if (args.all) {
    // Scrape all assets
    await scraper.scrapeMultiple(SUPPORTED_ASSETS, args.source);
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
