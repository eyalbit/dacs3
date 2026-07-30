# DACS-3.0 Installation Guide

Complete installation instructions for the DACS-3.0 Options Analysis System.

## System Overview

This system has two main components:

1. **TypeScript Scraper** (`scraper-ts/`) - Web scraping with Playwright
2. **Python Pipeline** (`csv_united.py`) - Data processing & AI analysis

---

## Prerequisites

### Required
- **Node.js 18+** (for TypeScript scraper)
- **Python 3.8+** (for data processing)
- **npm** (comes with Node.js)
- **pip** (comes with Python)

### Optional
- **Git** (for version control)

### Check Versions
```bash
node --version   # Should be v18+
npm --version    # Should be 9+
python --version # Should be 3.8+
pip --version
```

---

## Installation Steps

### Part 1: TypeScript Scraper Setup

#### 1. Navigate to Scraper Directory
```bash
cd scraper-ts
```

#### 2. Install Node Dependencies
```bash
npm install
```

This installs:
- Playwright (browser automation)
- TypeScript compiler
- All required dependencies

#### 3. Install Playwright Browsers
```bash
npx playwright install chromium
```

Optional (install all browsers):
```bash
npx playwright install
```

#### 4. Configure Environment
```bash
# Windows
copy .env.example .env

# Linux/Mac
cp .env.example .env
```

Edit `scraper-ts/.env`:
```bash
SCRAPER_HEADLESS=true
SCRAPER_SLOW_MO=0
OPTIONS_DATA_URL=https://yoursite.com/options/{symbol}
OUTPUT_DIR=../assets
DEFAULT_TIMEOUT=30000
```

#### 5. Build TypeScript
```bash
npm run build
```

#### 6. Verify Installation
```bash
npm run scrape -- --help
```

---

### Part 2: Python Pipeline Setup

#### 1. Return to Project Root
```bash
cd ..
```

#### 2. Create Virtual Environment (Recommended)
```bash
# Windows
python -m venv .venv
.venv\Scripts\activate

# Linux/Mac
python3 -m venv .venv
source .venv/bin/activate
```

#### 3. Install Python Dependencies
```bash
pip install -r requirements.txt
```

**Note:** The `requirements.txt` is now minimal because scraping is done via TypeScript.

#### 4. Configure Environment
```bash
# Windows
copy .env.example .env

# Linux/Mac
cp .env.example .env
```

Edit `.env`:
```bash
# Gemini API Configuration
GEMINI_API_KEY=your-gemini-api-key-here
GEMINI_MODEL=gemini-flash-lite-latest

# Email Configuration (optional)
GMAIL_USER=your-email@gmail.com
GMAIL_PASSWORD=your-app-password-here
```

**Get Gemini API Key:**
1. Go to https://ai.google.dev/
2. Click "Get API Key"
3. Copy and paste in `.env`

**Get Gmail App Password:**
1. Go to https://myaccount.google.com/apppasswords
2. Generate new app password
3. Use this (NOT your regular Gmail password)

---

## Project Structure After Installation

```
dacs3/
├── scraper-ts/              # TypeScript scraper
│   ├── node_modules/       # (created by npm install)
│   ├── dist/               # (created by npm run build)
│   ├── src/                # TypeScript source
│   ├── .env                # Scraper config
│   └── package.json
│
├── .venv/                  # Python virtual environment
├── assets/                 # Data folder (CSV files)
│   ├── spy/
│   ├── spy/
│   ├── spy/
│   └── spy/
│
├── agent-docs/             # DACS AI instructions
├── csv_united.py           # Main Python pipeline
├── .env                    # Python config
├── requirements.txt
├── README.md
├── PROJECT_SUMMARY.md
└── INSTALLATION.md         # This file
```

---

## Quick Start

### Test the Scraper

```bash
cd scraper-ts
npm run scrape -- --asset SPY --headless=false
```

This opens a visible browser so you can see what's happening.

### Customize Configuration

Before first run, edit `scraper-ts/src/config/index.ts`:

```typescript
export const DATA_SOURCES = {
  default: {
    // ⚠️ CHANGE THIS
    urlTemplate: 'https://YOUR-SITE.com/options/{symbol}',
    
    selectors: {
      // ⚠️ CHANGE THESE
      optionsTable: 'table.options-chain',
      expirationDropdown: 'select#expiration',
    },
  },
};
```

**How to find selectors:**
1. Open your data source in Chrome
2. Right-click element → Inspect
3. Right-click HTML → Copy → Copy selector
4. Paste in config

### Run Full Pipeline

```bash
# Option 1: Scrape + Process separately
cd scraper-ts && npm run scrape -- --all
cd .. && python csv_united.py --no-scrape

# Option 2: Auto-scrape + process
python csv_united.py
```

---

## Troubleshooting

### TypeScript Scraper Issues

**Issue:** `playwright: command not found`  
**Solution:**
```bash
cd scraper-ts
npx playwright install chromium
```

**Issue:** TypeScript compilation errors  
**Solution:**
```bash
rm -rf dist node_modules
npm install
npm run build
```

**Issue:** Timeout errors  
**Solution:** Edit `scraper-ts/src/config/index.ts`:
```typescript
timeout: 60000  // Increase to 60 seconds
```

**Issue:** Selectors not found  
**Solution:**
1. Run with `--headless=false`
2. Verify element exists
3. Update selector in `src/config/index.ts`

---

### Python Pipeline Issues

**Issue:** `GEMINI_API_KEY not found`  
**Solution:**
```bash
# Make sure .env file exists in project root
# Add: GEMINI_API_KEY=your-key-here
```

**Issue:** `No CSV files found`  
**Solution:**
```bash
# Run scraper first
cd scraper-ts && npm run scrape -- --all
```

**Issue:** Email not sending  
**Solution:**
- Use Gmail App Password (not regular password)
- Enable 2FA on Gmail first
- Generate app password at: https://myaccount.google.com/apppasswords

**Issue:** Import errors  
**Solution:**
```bash
# Activate virtual environment
.venv\Scripts\activate  # Windows
source .venv/bin/activate  # Linux/Mac

# Reinstall dependencies
pip install -r requirements.txt
```

---

## Development Mode

### TypeScript Scraper Debug

```bash
cd scraper-ts

# Run with visible browser
npm run scrape -- --asset SPY --headless=false

# Slow down actions (500ms)
# Edit .env: SCRAPER_SLOW_MO=500
npm run scrape -- --asset SPY --headless=false
```

### Watch TypeScript Changes

```bash
cd scraper-ts
npm run dev
```

---

## Updating

### Update TypeScript Dependencies

```bash
cd scraper-ts
npm update
npx playwright install --force
```

### Update Python Dependencies

```bash
pip install --upgrade -r requirements.txt
```

---

## Uninstallation

### TypeScript Scraper
```bash
cd scraper-ts
rm -rf node_modules dist
```

### Python Environment
```bash
# Deactivate virtual environment
deactivate

# Remove virtual environment
rm -rf .venv
```

### Complete Removal
```bash
# Remove entire project
rm -rf dacs3
```

---

## Next Steps

1. ✅ Complete installation (both TypeScript & Python)
2. 📝 Configure `scraper-ts/src/config/index.ts` for your data source
3. 🧪 Test with: `npm run scrape -- --asset SPY --headless=false`
4. 🔧 Fix selectors if needed
5. 🚀 Run full pipeline: `npm run scrape -- --all && python csv_united.py --no-scrape`
6. 📖 Read [scraper-ts/SKILLS.md](scraper-ts/SKILLS.md) to understand Skills pattern
7. 🎨 Customize Skills for your specific needs

---

## Documentation

- **[PROJECT_SUMMARY.md](PROJECT_SUMMARY.md)** - Complete overview
- **[scraper-ts/README.md](scraper-ts/README.md)** - TypeScript scraper usage
- **[scraper-ts/SKILLS.md](scraper-ts/SKILLS.md)** - Skills pattern guide
- **[scraper-ts/INSTALLATION.md](scraper-ts/INSTALLATION.md)** - Detailed scraper setup

---

## Installation Checklist

### TypeScript Scraper
- [ ] Node.js 18+ installed
- [ ] `npm install` completed
- [ ] `npx playwright install chromium` completed
- [ ] `.env` created in `scraper-ts/`
- [ ] `npm run build` succeeded
- [ ] `scraper-ts/src/config/index.ts` configured
- [ ] Test run successful

### Python Pipeline
- [ ] Python 3.8+ installed
- [ ] Virtual environment created
- [ ] `pip install -r requirements.txt` completed
- [ ] `.env` created in project root
- [ ] `GEMINI_API_KEY` configured
- [ ] Test run successful

Ready to scrape! 🚀
