# DACS-3.0 Commands Cheat Sheet 📝

## 🚀 Quick Run Commands

### PowerShell (Recommended)
```powershell
# Full workflow (Scrape → Merge → Gemini → HTML)
.\run-full-workflow.ps1

# Only scrape data
.\run-scraper-only.ps1

# Only analyze (use existing CSVs)
.\run-analysis-only.ps1
```

### Windows BAT
```cmd
run-full-workflow.bat
```

---

## 📦 TypeScript Scraper (scraper-ts/)

```powershell
cd scraper-ts

# Standard run (headless, with option chains)
npm run screener

# Debug mode (visible browser)
npm run screener -- --headless=false

# Skip option chains (Barchart only)
npm run screener -- --no-option-chains

# Custom assets folder
npm run screener -- --assets ../my-assets

# Clear Barchart session cache
npm run screener -- --clear-session

cd ..
```

---

## 🐍 Python Scripts

### Full Workflow
```powershell
# Scrape + Merge + Gemini + HTML + Email
python csv_united.py

# Use existing CSVs (no scraping)
python csv_united.py --no-scrape

# Only merge CSVs (no Gemini)
python csv_united.py --merge-only

# Only scrape (TypeScript), no processing
python csv_united.py --scrape-only
```

### Simple CSV Merger
```powershell
# Merge all CSVs in assets/ folders
python merge_csv.py
```

---

## 🔧 Setup Commands (First Time Only)

```powershell
# Install TypeScript dependencies
cd scraper-ts
npm install
npm run build

# Install Playwright browsers
npx playwright install chromium

cd ..
```

---

## 📂 File Locations

```
Output Files:
  assets/{SYMBOL}/merged_filtered_options.csv    ← Merged data
  assets/{SYMBOL}/{SYMBOL}_DACS-3.0_*.html      ← HTML report

Configuration:
  .env                                           ← API keys & credentials
  csv_united.py (top)                           ← Delta range, email settings

Session Cache:
  scraper-ts/.auth/barchart-session.json        ← Barchart login session
```

---

## 🎯 Common Workflows

### Daily Fresh Analysis
```powershell
.\run-full-workflow.ps1
```

### Re-analyze With Different Settings
```powershell
# 1. Edit csv_united.py (change DELTA_MIN/MAX)
# 2. Run:
.\run-analysis-only.ps1
```

### Debug Scraper Issues
```powershell
cd scraper-ts
npm run screener -- --headless=false --clear-session
cd ..
```

### Manual Step-by-Step
```powershell
# 1. Scrape
cd scraper-ts
npm run screener
cd ..

# 2. Merge
python merge_csv.py

# 3. Analyze
python csv_united.py --no-scrape
```

---

## 🐛 Troubleshooting Commands

```powershell
# Check versions
node --version
npm --version
python --version

# Clear Barchart session
cd scraper-ts
npm run screener -- --clear-session
cd ..

# Reinstall Playwright
cd scraper-ts
npx playwright install chromium
cd ..

# Test Gemini connection
python -c "import os; print('GEMINI_API_KEY:', 'SET' if os.getenv('GEMINI_API_KEY') else 'NOT SET')"
```

---

## ⚡ Quick Reference

| Task | Command |
|------|---------|
| **Everything (Recommended)** | `.\run-full-workflow.ps1` |
| **Only Scrape** | `.\run-scraper-only.ps1` |
| **Only Analyze** | `.\run-analysis-only.ps1` |
| **Debug Scraper** | `cd scraper-ts && npm run screener -- --headless=false` |
| **Simple Merge** | `python merge_csv.py` |
| **Full Python Flow** | `python csv_united.py` |

---

**💡 Tip:** Keep this file open while working with DACS-3.0!
