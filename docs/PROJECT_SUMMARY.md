# DACS-3.0 Project Summary

Complete overview of the DACS-3.0 Options Analysis System with TypeScript Playwright scraper.

## Project Components

### 1. TypeScript Playwright Scraper (`scraper-ts/`)

**Professional-grade web scraper** with Best Practices architecture:

- ✅ **Page Object Model (POM)** - Separation of concerns
- ✅ **Fixtures** - Managed browser lifecycle
- ✅ **Skills** - Reusable scraping patterns
- ✅ **TypeScript** - Type safety & IDE support
- ✅ **Playwright** - Modern browser automation

**Key Features:**
- Extract data from HTML tables
- Download CSV files
- Multi-expiration scraping
- Configurable data sources
- Error handling & validation

**Files:**
```
scraper-ts/
├── src/
│   ├── config/          # Data sources, URLs, selectors
│   ├── fixtures/        # Browser lifecycle (BrowserFixture)
│   ├── pages/          # Page Objects (BasePage, OptionsChainPage)
│   ├── skills/         # Reusable patterns (TableExtraction, CSVDownload, MultiExpiration)
│   ├── scraper/        # Main orchestration (OptionsScraper)
│   ├── utils/          # Utility functions
│   └── types/          # TypeScript definitions
├── README.md           # Overview & usage
├── SKILLS.md           # Skills pattern guide
└── INSTALLATION.md     # Setup instructions
```

### 2. Python Data Pipeline (`csv_united.py`)

**AI-powered options analysis** with Gemini integration:

- ✅ Merge CSV files
- ✅ Filter options by Delta/IV
- ✅ Calculate Expected Move
- ✅ DACS-3.0 AI analysis (Gemini)
- ✅ Generate HTML reports
- ✅ Email delivery

**Features:**
- Automated CSV processing
- Delta filtering (0.07-0.21)
- ATM strike detection
- Gemini AI analysis with DACS instructions
- Beautiful HTML reports with OptionStrat links

---

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     DACS-3.0 SYSTEM                          │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┴───────────────────┐
        │                                       │
        ▼                                       ▼
┌──────────────────┐
│  TypeScript      │
│  Scraper         │
│  (scraper-ts/)   │
│                  │
│  • POM           │
│  • Fixtures      │
│  • Skills        │
└────────┬─────────┘
         │
         │ Scrapes web data
         │ Saves to CSV
         │
                         │
                         ▼
                ┌────────────────┐
                │   assets/      │
                │   ├── bac/     │
                │   ├── jpm/     │
                │   ├── iwm/     │
                │   └── spy/     │
                │   (CSV files)  │
                └────────┬───────┘
                         │
                         ▼
                ┌─────────────────┐
                │  csv_united.py  │
                │                 │
                │  • Merge CSVs   │
                │  • Filter data  │
                │  • Gemini AI    │
                │  • HTML report  │
                │  • Email        │
                └────────┬────────┘
                         │
                         ▼
                ┌─────────────────┐
                │   HTML Report   │
                │   + Email       │
                └─────────────────┘
```

---

## Workflow

### Option 1: TypeScript Scraper (Recommended)

```bash
# 1. Scrape fresh data (TypeScript)
cd scraper-ts
npm run scrape -- --all

# 2. Process and analyze (Python)
cd ..
python csv_united.py --no-scrape

# Result: HTML reports in assets/{asset}/
```

### Option 2: Auto-Scrape with Python

```bash
# 1. Auto-runs TypeScript scraper, then processes
python csv_united.py

# Result: Runs "npm run scrape" automatically, then processes
```

### Option 3: Manual CSV Import

```bash
# 1. Add CSV files to assets/{asset}/

# 2. Process existing files
python csv_united.py --no-scrape
```

---

## Key Files & Purposes

| File | Purpose |
|------|---------|
| `scraper-ts/` | **TypeScript scraper (Best Practices)** |
| `scraper-ts/src/config/index.ts` | 🔧 **Configure URLs & selectors** |
| `scraper-ts/src/pages/` | Page Objects (POM) |
| `scraper-ts/src/skills/` | Reusable scraping patterns |
| `scraper-ts/SKILLS.md` | 📖 **Skills guide (read this!)** |
| `scraper-ts/INSTALLATION.md` | 📝 **Setup instructions** |
| | |
| | |
| `csv_united.py` | **Main Python pipeline** |
| `assets/{asset}/` | CSV files storage |
| `agent-docs/` | DACS AI instructions |
| `.env` | **API keys & configuration** |
| `requirements.txt` | Python dependencies |

---

## Quick Start

### First Time Setup

```bash
# 1. Install TypeScript scraper
cd scraper-ts
npm install
npx playwright install chromium
cp .env.example .env
npm run build

# 2. Configure for your data source
# Edit: scraper-ts/src/config/index.ts
# Update: URL and selectors

# 3. Install Python dependencies
cd ..
pip install -r requirements.txt

# 4. Configure Python
cp .env.example .env
# Edit: Add GEMINI_API_KEY

# 5. Test scraper
cd scraper-ts
npm run scrape -- --asset BAC --headless=false

# 6. Run full pipeline
npm run scrape -- --all
cd ..
python csv_united.py --no-scrape
```

### Daily Usage

```bash
# Scrape and analyze all assets
cd scraper-ts && npm run scrape -- --all && cd .. && python csv_united.py --no-scrape

# Or use Python scraper
python csv_united.py
```

---

## Best Practices Architecture (TypeScript Scraper)

### Page Object Model (POM)

**Problem:** Mixing page logic with scraping logic → hard to maintain

**Solution:** Separate concerns

```typescript
// ✅ Good - Page Object
class OptionsChainPage extends BasePage {
  async loadSymbol(symbol: string) {
    await this.navigate(`/options/${symbol}`);
    await this.waitForSelector('table.options-chain');
  }

  async getExpirationDates() {
    return await this.page.$$eval('select#expiration option', ...);
  }
}

// Usage
const page = new OptionsChainPage(browserPage, config);
await page.loadSymbol('BAC');
const dates = await page.getExpirationDates();
```

### Fixtures

**Problem:** Manual browser setup/cleanup → memory leaks

**Solution:** Fixtures manage lifecycle

```typescript
// ✅ Good - Fixture
const fixture = new BrowserFixture({ headless: true });
await fixture.start();

try {
  const page = await fixture.newPage();
  // ... scraping
} finally {
  await fixture.stop();  // Always cleanup
}
```

### Skills

**Problem:** Repeating same scraping code → DRY violation

**Solution:** Reusable skills

```typescript
// ✅ Good - Skill
const tableSkill = new TableExtractionSkill(page, {
  tableSelector: 'table.options-chain',
  includeHeader: true,
});

const result = await tableSkill.execute();

// Reuse on different pages
await tableSkill.execute('./output.csv');
```

**See [SKILLS.md](scraper-ts/SKILLS.md) for complete guide!**

---

## Configuration Files

### TypeScript Scraper (scraper-ts/.env)

```bash
SCRAPER_HEADLESS=true
SCRAPER_SLOW_MO=0
OPTIONS_DATA_URL=https://yoursite.com/options/{symbol}
OUTPUT_DIR=../assets
DEFAULT_TIMEOUT=30000
```

### Python Pipeline (.env)

```bash
GEMINI_API_KEY=your-api-key
GEMINI_MODEL=gemini-flash-lite-latest
GMAIL_USER=your-email@gmail.com
GMAIL_PASSWORD=your-app-password
```

---

## Available Commands

### TypeScript Scraper

```bash
cd scraper-ts

# Build
npm run build

# Scrape single asset
npm run scrape -- --asset BAC

# Scrape all assets
npm run scrape -- --all

# Debug mode (visible browser)
npm run scrape -- --asset BAC --headless=false

# Lint & format
npm run lint
npm run format
```

### Python Pipeline

```bash
# Full pipeline (scrape + analyze)
python csv_united.py

# Process existing CSVs only
python csv_united.py --no-scrape

# Merge only (no AI analysis)
python csv_united.py --merge-only

# Scrape only (no processing)
python csv_united.py --scrape-only
```

---

## Customization Checklist

### Before First Run

TypeScript scraper (`scraper-ts/src/config/index.ts`):
- [ ] Update `urlTemplate` with your data source URL
- [ ] Update `optionsTable` selector
- [ ] Update `expirationDropdown` selector (if applicable)
- [ ] Update `downloadButton` selector (if applicable)
- [ ] Set appropriate `timeout` values

Python pipeline (`csv_united.py`):
- [ ] Set `DEFAULT_ASSET`
- [ ] Configure `DELTA_MIN` and `DELTA_MAX`
- [ ] Set `AUTO_SEND_EMAIL` (True/False)
- [ ] Configure `EMAIL_TO` address

---

## Documentation Index

| Document | Description |
|----------|-------------|
| [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md) | **This file** - Complete overview |
| [scraper-ts/README.md](scraper-ts/README.md) | TypeScript scraper overview |
| [scraper-ts/SKILLS.md](scraper-ts/SKILLS.md) | **Skills pattern guide** (read this!) |
| [scraper-ts/INSTALLATION.md](scraper-ts/INSTALLATION.md) | TypeScript setup instructions |
| [INSTALLATION.md](INSTALLATION.md) | Main project setup |
| [README.md](README.md) | Project overview (Hebrew) |

---

## Technology Stack

### TypeScript Scraper
- **Language:** TypeScript 5.3+
- **Framework:** Playwright 1.40+
- **Runtime:** Node.js 18+
- **Patterns:** POM, Fixtures, Skills

### Python Pipeline
- **Language:** Python 3.8+
- **AI:** Google Gemini API
- **Libraries:** csv, urllib, smtplib
- **Output:** HTML, CSV, Email

---

## Why TypeScript for Scraping?

**TypeScript Scraper (scraper-ts/)** is the only scraper in this project:

**Advantages:**
- ✅ **Type Safety** - Catch errors at compile time
- ✅ **Better IDE Support** - Autocomplete, refactoring
- ✅ **Playwright Native** - Playwright is built for TypeScript
- ✅ **Best Practices** - POM, Fixtures, Skills patterns
- ✅ **Maintainable** - Easier to test and extend
- ✅ **Industry Standard** - Professional teams use TS for Playwright

**Why Not Python?**
Python Playwright exists but lacks the tooling and patterns that make TypeScript superior for this use case. The small learning curve pays off quickly.

---

## Output Structure

```
assets/
├── bac/
│   ├── bac_quotedata_2026-07-29T18-30-00.csv    # Raw scraped data
│   ├── merged_filtered_options.csv               # Processed data
│   └── bac_DACS-3.0_20260729_183145.html        # Analysis report
├── jpm/
│   └── ...
├── iwm/
│   └── ...
└── spy/
    └── ...
```

---

## Common Issues & Solutions

### TypeScript Scraper

**Issue:** Selectors not found  
**Solution:** Update selectors in `src/config/index.ts`

**Issue:** Timeout errors  
**Solution:** Increase `timeout` in config

**Issue:** Build errors  
**Solution:** `rm -rf dist node_modules && npm install && npm run build`

### Python Pipeline

**Issue:** Missing GEMINI_API_KEY  
**Solution:** Add to `.env` file

**Issue:** No CSV files found  
**Solution:** Run scraper first or add CSV files manually

**Issue:** Email not sending  
**Solution:** Use Gmail App Password, not regular password

---

## Next Steps

1. ✅ **Read this summary** (you're here!)
2. 📖 **Read [SKILLS.md](scraper-ts/SKILLS.md)** - Learn Skills pattern
3. 🔧 **Setup:** Follow [scraper-ts/INSTALLATION.md](scraper-ts/INSTALLATION.md)
4. ⚙️ **Configure:** Edit `scraper-ts/src/config/index.ts`
5. 🧪 **Test:** `npm run scrape -- --asset BAC --headless=false`
6. 🚀 **Run:** `npm run scrape -- --all`
7. 📊 **Analyze:** `python csv_united.py --no-scrape`
8. 🎨 **Customize:** Create custom Page Objects and Skills

---

## Support

- **TypeScript/Playwright:** https://playwright.dev/
- **Python/Gemini:** https://ai.google.dev/
- **Skills Guide:** [SKILLS.md](scraper-ts/SKILLS.md)

---

**Built with ❤️ using Best Practices**

TypeScript + Playwright + Page Object Model + Fixtures + Skills = 🚀
