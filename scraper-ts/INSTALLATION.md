# Installation Guide - TypeScript Scraper

Complete installation and setup guide for the DACS TypeScript Playwright scraper.

## Prerequisites

- **Node.js** 18+ (with npm)
- **Git** (optional)
- **Python** 3.8+ (for integration with main pipeline)

Check your versions:
```bash
node --version   # Should be v18+
npm --version    # Should be 9+
```

---

## Installation Steps

### 1. Navigate to Scraper Directory

```bash
cd scraper-ts
```

### 2. Install Node Dependencies

```bash
npm install
```

This installs:
- `playwright` - Browser automation
- `@playwright/test` - Playwright test framework
- `typescript` - TypeScript compiler
- `ts-node` - Run TypeScript directly
- `csv-writer` - CSV file handling
- `dotenv` - Environment variables

### 3. Install Playwright Browsers

```bash
npx playwright install chromium
```

Optional: Install all browsers (Chrome, Firefox, WebKit):
```bash
npx playwright install
```

### 4. Configure Environment

```bash
# Windows
copy .env.example .env

# Linux/Mac
cp .env.example .env
```

Edit `.env` file:
```bash
# Browser settings
SCRAPER_HEADLESS=true
SCRAPER_SLOW_MO=0
SCRAPER_BROWSER=chromium
SCRAPER_VIEWPORT_WIDTH=1920
SCRAPER_VIEWPORT_HEIGHT=1080

# Data source (customize for your site)
OPTIONS_DATA_URL=https://example.com/options/{symbol}

# Output
OUTPUT_DIR=../assets

# Timeouts
DEFAULT_TIMEOUT=30000
LOAD_TIMEOUT=60000
```

### 5. Build TypeScript

```bash
npm run build
```

This compiles TypeScript to JavaScript in the `dist/` folder.

### 6. Verify Installation

```bash
# Check if build succeeded
ls dist/

# Test CLI
npm run scrape -- --help
```

---

## Project Structure After Installation

```
scraper-ts/
├── node_modules/        # Dependencies (created by npm install)
├── dist/                # Compiled JavaScript (created by npm run build)
│
├── src/                 # TypeScript source code
│   ├── config/
│   ├── fixtures/
│   ├── pages/
│   ├── skills/
│   ├── scraper/
│   ├── utils/
│   ├── types/
│   ├── index.ts
│   └── cli.ts
│
├── package.json         # Dependencies and scripts
├── tsconfig.json        # TypeScript configuration
├── .env                 # Your configuration (DO NOT commit)
├── .env.example         # Example configuration
├── README.md
├── SKILLS.md
└── INSTALLATION.md      # This file
```

---

## Customization (Before First Run)

### Update Data Source Configuration

Edit `src/config/index.ts`:

```typescript
export const DATA_SOURCES: Record<string, PageConfig> = {
  default: {
    // ⚠️ CHANGE THIS to your actual URL
    urlTemplate: 'https://YOUR-SITE.com/options/{symbol}',
    
    selectors: {
      // ⚠️ CHANGE THESE to match your page
      optionsTable: 'table.options-chain',
      expirationDropdown: 'select#expiration',
      downloadButton: 'button.download-csv',
    },
    
    waitFor: 'table.options-chain',  // Wait for this element
    timeout: 30000,
  },
};
```

### How to Find Selectors

1. Open your data source website in Chrome/Edge
2. Right-click on the element (table, button, etc.) → **Inspect**
3. In DevTools, right-click the HTML element → **Copy** → **Copy selector**
4. Paste the selector in `config/index.ts`

Example:
```
DevTools: #app > div.main > table.options-data
Config:   optionsTable: 'table.options-data'
```

---

## Quick Start Guide

### Test with Single Asset

```bash
# Run with visible browser (to see what's happening)
npm run scrape -- --asset BAC --headless=false
```

Watch the browser and verify:
- ✅ Correct page loads
- ✅ Table is found
- ✅ Data is extracted
- ✅ CSV file is created in `../assets/bac/`

### Customize If Needed

If scraping fails:

1. **Check URL** - Is the site accessible?
2. **Check Selectors** - Do they match your page?
3. **Check Timeouts** - Does the page load slowly?
4. **Check Loading** - Is there a loading indicator?

### Run in Headless Mode

Once verified, run in headless mode:

```bash
npm run scrape -- --asset BAC
```

### Scrape All Assets

```bash
npm run scrape -- --all
```

---

## npm Scripts Reference

```bash
# Build TypeScript to JavaScript
npm run build

# Run CLI
npm run scrape -- [options]

# Run in development mode (with auto-reload)
npm run dev

# Run tests (if configured)
npm test

# Lint code
npm run lint

# Format code
npm run format
```

---

## Troubleshooting

### Issue: `playwright: command not found`

**Solution:**
```bash
npx playwright install chromium
```

### Issue: `tsc: command not found`

**Solution:**
```bash
npm install
```

### Issue: TypeScript errors during build

**Solution:**
```bash
# Clean and rebuild
rm -rf dist node_modules
npm install
npm run build
```

### Issue: Timeout errors

**Solution:** Increase timeout in `src/config/index.ts`:
```typescript
timeout: 60000  // 60 seconds
```

### Issue: Selector not found

**Solution:**
1. Run with `--headless=false`
2. Check if element exists
3. Update selector in `src/config/index.ts`
4. Wait for element to load: add `wait_for` config

### Issue: CSV not created

**Solution:**
1. Check output folder exists: `../assets/{asset}/`
2. Check file permissions
3. Look for error messages in console

### Issue: `Cannot find module 'csv-writer'`

**Solution:**
```bash
npm install csv-writer
```

---

## Development Setup

### VS Code (Recommended)

Install extensions:
- **TypeScript** (built-in)
- **Playwright Test for VSCode**
- **ESLint**
- **Prettier**

### Settings

```json
// .vscode/settings.json
{
  "typescript.tsdk": "node_modules/typescript/lib",
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode"
}
```

---

## Integration with Python Pipeline

### Option 1: Manual Integration

```bash
# Step 1: Scrape with TypeScript
cd scraper-ts
npm run scrape -- --all

# Step 2: Process with Python
cd ..
python csv_united.py --no-scrape
```

### Option 2: Python Subprocess

Edit `csv_united.py`:

```python
import subprocess
import os

def scrape_with_typescript():
    """Run TypeScript scraper from Python."""
    scraper_dir = os.path.join(os.path.dirname(__file__), 'scraper-ts')
    
    result = subprocess.run(
        ['npm', 'run', 'scrape', '--', '--all'],
        cwd=scraper_dir,
        capture_output=True,
        text=True
    )
    
    if result.returncode == 0:
        print('[OK] TypeScript scraper completed')
        return True
    else:
        print(f'[ERROR] TypeScript scraper failed: {result.stderr}')
        return False

# Use in main pipeline
if __name__ == '__main__':
    if scrape_with_typescript():
        results = process_all_assets(merge_only=False)
```

### Option 3: npm Script

Edit `package.json`:

```json
{
  "scripts": {
    "scrape-and-process": "npm run scrape -- --all && cd .. && python csv_united.py --no-scrape"
  }
}
```

Run:
```bash
npm run scrape-and-process
```

---

## Updating

### Update Dependencies

```bash
# Update all dependencies
npm update

# Update Playwright browsers
npx playwright install --force
```

### Update to Latest TypeScript

```bash
npm install typescript@latest --save-dev
npm run build
```

---

## Uninstallation

```bash
# Remove node_modules and build artifacts
rm -rf node_modules dist

# Remove package-lock
rm package-lock.json

# Optional: Remove entire scraper-ts folder
cd ..
rm -rf scraper-ts
```

---

## Next Steps

1. ✅ Complete installation
2. 📝 Customize `src/config/index.ts` for your data source
3. 🧪 Test with single asset: `npm run scrape -- --asset BAC --headless=false`
4. 🔧 Fix selectors if needed
5. 🚀 Run full scrape: `npm run scrape -- --all`
6. 📖 Read [SKILLS.md](SKILLS.md) to learn about reusable patterns
7. 🎨 Create custom Page Objects for your specific site

---

## Getting Help

- **README.md** - Overview and usage
- **SKILLS.md** - Skills pattern guide
- **Playwright Docs** - https://playwright.dev/
- **TypeScript Docs** - https://www.typescriptlang.org/docs/

---

## Checklist

Before first run, ensure:

- [ ] Node.js 18+ installed
- [ ] `npm install` completed
- [ ] `npx playwright install chromium` completed
- [ ] `.env` file created and configured
- [ ] `src/config/index.ts` updated with your URL
- [ ] Selectors updated for your site
- [ ] `npm run build` succeeded
- [ ] Test run with `--headless=false` successful

Ready to scrape! 🚀
