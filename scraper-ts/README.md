# DACS Options Scraper (TypeScript + Playwright)

Professional-grade web scraper for options chain data using **TypeScript**, **Playwright**, and **Best Practices** architecture.

## Architecture

This scraper follows industry best practices:

- **📄 Page Object Model (POM)** - Separation of page logic from test/scraping logic
- **🔧 Fixtures** - Managed browser lifecycle with proper cleanup
- **🎯 Skills** - Reusable scraping patterns (Table Extraction, CSV Download, etc.)
- **📦 TypeScript** - Type safety and better IDE support
- **✅ Clean Code** - SOLID principles, dependency injection

## Project Structure

```
scraper-ts/
├── src/
│   ├── config/               # Configuration
│   │   └── index.ts         # Data sources, URLs, selectors
│   │
│   ├── fixtures/            # Browser lifecycle management
│   │   ├── BrowserFixture.ts
│   │   └── index.ts
│   │
│   ├── pages/               # Page Object Model (POM)
│   │   ├── BasePage.ts              # Base page with common methods
│   │   ├── OptionsChainPage.ts      # Options chain specific page
│   │   ├── BarchartLoginPage.ts     # Barchart login
│   │   ├── BarchartScreenerPage.ts  # Barchart screener
│   │   └── index.ts
│   │
│   ├── skills/              # Reusable scraping patterns
│   │   ├── BaseSkill.ts             # Base skill class
│   │   ├── TableExtractionSkill.ts  # Extract HTML tables
│   │   ├── CSVDownloadSkill.ts      # Download CSV files
│   │   ├── MultiExpirationSkill.ts  # Multi-expiration scraping
│   │   ├── BarchartLoginSkill.ts    # Barchart login + session
│   │   ├── BarchartScreenerSkill.ts # Barchart screener
│   │   └── index.ts
│   │
│   ├── scraper/             # Main scraper orchestration
│   │   └── OptionsScraper.ts
│   │
│   ├── utils/               # Utility functions
│   │   └── index.ts
│   │
│   ├── types/               # TypeScript type definitions
│   │   └── index.ts
│   │
│   ├── index.ts             # Main entry point
│   ├── cli.ts               # CLI interface
│   └── cli-screener.ts      # Barchart screener CLI
│
├── tests/                   # ✅ NEW - Test suite
│   ├── pages/               # Page Object tests
│   ├── skills/              # Skills tests
│   ├── integration/         # E2E tests
│   ├── setup.ts
│   └── README.md
│
├── dist/                    # Compiled JavaScript (generated)
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

## Installation

### 1. Install Dependencies

```bash
cd scraper-ts
npm install
```

### 2. Install Playwright Browsers

```bash
npx playwright install chromium
```

### 3. Configure Environment

```bash
cp .env.example .env
# Edit .env with your settings
```

### 4. Build TypeScript

```bash
npm run build
```

## Usage

### CLI Usage

```bash
# Scrape a single asset
npm run scrape -- --asset SPY

# Scrape all supported assets
npm run scrape -- --all

# Run with visible browser (debugging)
npm run scrape -- --asset SPY --headless=false

# Use a different data source configuration
npm run scrape -- --asset SPY --source cboe
```

### Programmatic Usage

```typescript
import { OptionsScraper } from './scraper/OptionsScraper';

async function main() {
  const scraper = new OptionsScraper({
    headless: true,
  });

  // Single asset
  const result = await scraper.scrapeAsset('SPY');
  console.log(result);

  // Multiple assets
  const results = await scraper.scrapeMultiple(['SPY', 'AAPL', 'MSFT']);
  console.log(results);
}

main();
```

### Using Skills Directly

```typescript
import { BrowserFixture } from './fixtures';
import { OptionsChainPage } from './pages';
import { TableExtractionSkill } from './skills';
import { getDataSourceConfig } from './config';

async function customScrape() {
  const fixture = new BrowserFixture({ headless: false });
  await fixture.start();

  try {
    const page = await fixture.newPage();
    const config = getDataSourceConfig('default');
    
    // Use Page Object
    const optionsPage = new OptionsChainPage(page, config);
    await optionsPage.loadSymbol('SPY');

    // Use Skill
    const tableSkill = new TableExtractionSkill(page, {
      tableSelector: config.selectors.optionsTable,
      includeHeader: true,
    });

    const result = await tableSkill.execute();
    console.log(result.data);
  } finally {
    await fixture.stop();
  }
}
```

## Configuration

### Edit `src/config/index.ts`

```typescript
export const DATA_SOURCES: Record<string, PageConfig> = {
  default: {
    urlTemplate: 'https://yoursite.com/options/{symbol}',
    selectors: {
      optionsTable: 'table.options-chain',
      expirationDropdown: 'select#expiration',
      downloadButton: 'button.download-csv',
    },
    waitFor: 'table.options-chain',
    timeout: 30000,
  },
};
```

### Environment Variables (`.env`)

```bash
# Browser settings
SCRAPER_HEADLESS=true
SCRAPER_SLOW_MO=0
SCRAPER_BROWSER=chromium

# Data source
OPTIONS_DATA_URL=https://example.com/options/{symbol}

# Output
OUTPUT_DIR=../assets

# Timeouts
DEFAULT_TIMEOUT=30000
```

## Customization Guide

### 1. Create a Custom Page Object

```typescript
// src/pages/MyCustomPage.ts
import { BasePage } from './BasePage';

export class MyCustomPage extends BasePage {
  async getOptions(symbol: string) {
    await this.navigate(`https://mysite.com/options/${symbol}`);
    return await this.extractTableData('table.options-data');
  }
}
```

### 2. Create a Custom Skill

```typescript
// src/skills/MyCustomSkill.ts
import { BaseSkill } from './BaseSkill';

export class MyCustomSkill extends BaseSkill<MyConfig, MyResult> {
  async execute(): Promise<SkillResult<MyResult>> {
    try {
      // Your scraping logic here
      const data = await this.page.evaluate(() => {
        // Extract data
        return { /* data */ };
      });

      return this.success(data);
    } catch (error) {
      return this.error(error.message);
    }
  }
}
```

### 3. Add to Main Scraper

```typescript
// src/scraper/OptionsScraper.ts
import { MyCustomSkill } from '../skills/MyCustomSkill';

// Use in scrapeAsset method
const customSkill = new MyCustomSkill(page, config);
const result = await customSkill.execute();
```

## Available Skills

### TableExtractionSkill

Extract data from HTML tables.

```typescript
const skill = new TableExtractionSkill(page, {
  tableSelector: 'table.options-chain',
  includeHeader: true,
  outputFormat: 'csv',
});

const result = await skill.execute('./output.csv');
```

### CSVDownloadSkill

Click download button and save CSV.

```typescript
const skill = new CSVDownloadSkill(page, {
  downloadButtonSelector: 'button.download',
  timeout: 10000,
});

const result = await skill.execute('./downloads', 'options.csv');
```

### MultiExpirationSkill

Scrape across multiple expiration dates.

```typescript
const skill = new MultiExpirationSkill(page, {
  expirationDropdownSelector: 'select#expiration',
  tableSelector: 'table.options-chain',
  waitAfterSelect: 1000,
});

const result = await skill.execute();
// Returns: { "Jan 2026": [[...]], "Feb 2026": [[...]] }
```

## Barchart Integration

Run saved Barchart screeners and extract symbols:

```bash
# Run Barchart screener
npm run screener

# With visible browser
npm run screener -- --headless=false

# Clear session and fresh login
npm run screener -- --clear-session
```

See [BARCHART.md](BARCHART.md) for complete guide.

## Testing

### Run All Tests

```bash
npm test
```

### Run with Visible Browser

```bash
npm run test:headed
```

### Debug Tests

```bash
npm run test:debug
```

### View Test Report

```bash
npm run test:report
```

See [TESTS.md](TESTS.md) for complete testing guide.

## Development

### Build

```bash
npm run build
```

### Dev Mode (with auto-reload)

```bash
npm run dev
```

### Lint

```bash
npm run lint
```

### Format Code

```bash
npm run format
```

## Integration with Python Pipeline

The scraper outputs CSV files to `../assets/{asset}/` which can be processed by the Python pipeline:

```bash
# 1. Scrape data (TypeScript)
cd scraper-ts
npm run scrape -- --all

# 2. Process with DACS analysis (Python)
cd ..
python csv_united.py --no-scrape
```

Or integrate programmatically:

```python
# csv_united.py
import subprocess

def scrape_with_typescript():
    result = subprocess.run(
        ['npm', 'run', 'scrape', '--', '--all'],
        cwd='scraper-ts',
        capture_output=True
    )
    return result.returncode == 0

# Use in pipeline
if scrape_with_typescript():
    results = process_all_assets(merge_only=False)
```

## Troubleshooting

### TypeScript errors

```bash
npm run build
# Fix errors shown in output
```

### Playwright not installed

```bash
npx playwright install chromium
```

### Timeout errors

Increase timeout in `src/config/index.ts`:
```typescript
timeout: 60000  // 60 seconds
```

### Debug with visible browser

```bash
npm run scrape -- --asset SPY --headless=false
```

## Best Practices Followed

✅ **Page Object Model (POM)** - Pages represent real pages, not test steps  
✅ **Don't Repeat Yourself (DRY)** - Skills are reusable across pages  
✅ **Single Responsibility** - Each class has one job  
✅ **Dependency Injection** - Pages/skills receive dependencies  
✅ **Type Safety** - Full TypeScript typing  
✅ **Proper Cleanup** - Fixtures handle resource management  
✅ **Configuration Over Code** - Selectors in config, not hardcoded  
✅ **Error Handling** - Graceful failure with meaningful errors  

## Why TypeScript over Python?

- ✅ **Type Safety** - Catch errors at compile time
- ✅ **Better IDE Support** - Autocomplete, refactoring, inline docs
- ✅ **Playwright Native** - Playwright is built for TypeScript
- ✅ **Performance** - V8 engine optimizations
- ✅ **Industry Standard** - Most companies use TS for Playwright

## License

All rights reserved
