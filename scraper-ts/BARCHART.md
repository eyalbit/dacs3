# Barchart Screener Integration

Complete guide for using the Barchart screener integration with DACS-3.0.

## Overview

This integration allows you to:
1. ✅ **Login** to Barchart.com automatically
2. ✅ **Run saved screeners** and get results
3. ✅ **Extract stock symbols** from screener results
4. ✅ **Download CSV** files with results
5. ✅ **Session persistence** - login once, use multiple times

---

## Quick Start

### 1. Setup Environment Variables

Edit `scraper-ts/.env`:

```bash
# Barchart Authentication
BARCHART_EMAIL=eb.bitan@gmail.com
BARCHART_PASSWORD=100%Gamba
BARCHART_LOGIN_URL=https://www.barchart.com/login
BARCHART_SCREENER_URL=https://www.barchart.com/stocks/stocks-screener?viewName=filter_view&screener=478448
```

### 2. Run Screener

```bash
cd scraper-ts
npm run screener
```

**Output:**
```
🚀 Starting Barchart Screener...

Checking authentication...
Loading existing session...
Existing session is valid
Using existing session
Running screener...
Found 15 symbols

✅ Screener completed successfully!

📊 Results:
   Symbols found: 15
   Symbols: AAPL, MSFT, GOOGL, ...
   CSV saved to: ./downloads/screener-results.csv
```

---

## Commands

### Run Screener (Headless)
```bash
npm run screener
```

### Run with Visible Browser (Debug)
```bash
npm run screener -- --headless=false
```

### Specify Output Directory
```bash
npm run screener -- --output ./my-results
```

### Don't Download CSV
```bash
npm run screener -- --no-download
```

### Clear Session (Force Fresh Login)
```bash
npm run screener -- --clear-session
```

---

## Architecture

### Page Objects (POM)

#### `BarchartLoginPage`
Handles login form interaction and session validation.

```typescript
import { BarchartLoginPage } from './pages/BarchartLoginPage';

const loginPage = new BarchartLoginPage(page, {
  loginUrl: 'https://www.barchart.com/login',
  email: 'your-email@example.com',
  password: 'your-password',
});

const result = await loginPage.login();
```

#### `BarchartScreenerPage`
Handles screener interaction, results extraction, and CSV download.

```typescript
import { BarchartScreenerPage } from './pages/BarchartScreenerPage';

const screenerPage = new BarchartScreenerPage(page, {
  screenerUrl: 'https://www.barchart.com/stocks/stocks-screener?screener=478448',
  screenerName: 'Base Screener-DACS3 for CALL',
});

await screenerPage.navigateToScreener();
await screenerPage.clickSeeResults();
const symbols = await screenerPage.extractSymbols();
```

---

### Skills

#### `BarchartLoginSkill`
Manages authentication with session persistence.

```typescript
import { BarchartLoginSkill } from './skills/BarchartLoginSkill';

const loginSkill = new BarchartLoginSkill(page, {
  loginUrl: 'https://www.barchart.com/login',
  email: 'your-email@example.com',
  password: 'your-password',
  forceLogin: false, // Use cached session if valid
});

const result = await loginSkill.execute();

if (result.success) {
  console.log('Logged in!');
  console.log('Used existing session:', result.data?.usedExistingSession);
}
```

**Session File:** `.auth/barchart-session.json`

**Clear Session:**
```typescript
import { BarchartLoginSkill } from './skills/BarchartLoginSkill';
BarchartLoginSkill.clearSession();
```

#### `BarchartScreenerSkill`
Runs screener and extracts results (combines Login + Screener).

```typescript
import { BarchartScreenerSkill } from './skills/BarchartScreenerSkill';

const screenerSkill = new BarchartScreenerSkill(page, {
  screenerUrl: 'https://www.barchart.com/stocks/stocks-screener?screener=478448',
  screenerName: 'Base Screener-DACS3 for CALL',
  loginConfig: {
    email: 'your-email@example.com',
    password: 'your-password',
    loginUrl: 'https://www.barchart.com/login',
  },
  downloadCSV: true,
  outputPath: './downloads',
});

const result = await screenerSkill.execute();

if (result.success) {
  console.log('Symbols:', result.data?.symbols);
  console.log('CSV Path:', result.data?.csvPath);
}
```

**Simplified Usage:**
```typescript
const symbols = await screenerSkill.getSymbols();
// Returns: ['AAPL', 'MSFT', 'GOOGL', ...]
```

---

## Integration with Python Pipeline

### Option 1: Run Screener First, Then Process

```bash
# Step 1: Run Barchart screener
cd scraper-ts
npm run screener -- --output ../assets

# Step 2: Process results with Python
cd ..
python csv_united.py --no-scrape
```

### Option 2: Python Calls TypeScript Screener

Edit `csv_united.py`:

```python
import subprocess
import os

def run_barchart_screener():
    """Run Barchart screener via TypeScript."""
    scraper_dir = os.path.join(os.path.dirname(__file__), 'scraper-ts')
    
    result = subprocess.run(
        ['npm', 'run', 'screener'],
        cwd=scraper_dir,
        capture_output=True,
        text=True
    )
    
    if result.returncode == 0:
        print('[OK] Barchart screener completed')
        # Parse symbols from output
        symbols = parse_symbols_from_output(result.stdout)
        return symbols
    else:
        print(f'[ERROR] Screener failed: {result.stderr}')
        return []

def parse_symbols_from_output(output: str) -> list:
    """Extract symbols from CLI output."""
    # Look for line: "Symbols: AAPL, MSFT, GOOGL, ..."
    for line in output.split('\n'):
        if 'Symbols:' in line:
            symbols_part = line.split('Symbols:')[1].strip()
            return [s.strip() for s in symbols_part.split(',')]
    return []

# Use in pipeline
if __name__ == '__main__':
    symbols = run_barchart_screener()
    
    for symbol in symbols:
        # Scrape options for each symbol
        scrape_options(symbol)
```

---

## How Session Persistence Works

### 1. **First Run (No Session)**
- Performs fresh login
- Saves cookies + localStorage to `.auth/barchart-session.json`
- Session is valid for ~30 days (depends on Barchart)

### 2. **Subsequent Runs (With Session)**
- Loads cookies + localStorage from file
- Validates session by checking a protected page
- If valid → reuses session (saves time!)
- If invalid → performs fresh login

### 3. **Clear Session**
```bash
npm run screener -- --clear-session
```

**Session File Format:**
```json
{
  "timestamp": "2026-07-29T18:30:00.000Z",
  "cookies": [
    {
      "name": "session_id",
      "value": "abc123...",
      "domain": ".barchart.com",
      "path": "/"
    }
  ],
  "localStorage": {
    "user_token": "xyz789...",
    "user_id": "12345"
  }
}
```

---

## Troubleshooting

### Issue: Login fails with wrong credentials

**Solution:**
```bash
# Update .env file with correct credentials
BARCHART_EMAIL=your-correct-email@example.com
BARCHART_PASSWORD=your-correct-password

# Clear old session
npm run screener -- --clear-session

# Try again
npm run screener
```

### Issue: "SEE RESULTS" button not found

**Solution:**
Run with visible browser to check selectors:
```bash
npm run screener -- --headless=false
```

Update selectors in `src/pages/BarchartScreenerPage.ts` if needed.

### Issue: Session expires quickly

**Solution:**
Force fresh login every time:
```typescript
const loginSkill = new BarchartLoginSkill(page, {
  ...config,
  forceLogin: true, // Always login
});
```

### Issue: CSV download fails

**Solution:**
Check if download button exists on the page:
```bash
npm run screener -- --headless=false
```

Update selector in `BarchartScreenerPage.ts`:
```typescript
downloadButton: 'your-new-selector'
```

---

## Customization

### Multiple Screeners

Create different .env variables:
```bash
BARCHART_SCREENER_CALL_URL=https://...&screener=478448
BARCHART_SCREENER_PUT_URL=https://...&screener=123456
```

Use in code:
```typescript
const callScreener = new BarchartScreenerSkill(page, {
  screenerUrl: process.env.BARCHART_SCREENER_CALL_URL!,
  screenerName: 'CALL Screener',
  // ...
});

const putScreener = new BarchartScreenerSkill(page, {
  screenerUrl: process.env.BARCHART_SCREENER_PUT_URL!,
  screenerName: 'PUT Screener',
  // ...
});
```

### Custom Selectors

If Barchart changes their HTML, update selectors:

**In `BarchartLoginPage.ts`:**
```typescript
private readonly selectors = {
  emailInput: 'input#your-new-email-selector',
  passwordInput: 'input#your-new-password-selector',
  submitButton: 'button.your-new-submit-class',
};
```

**In `BarchartScreenerPage.ts`:**
```typescript
private readonly selectors = {
  seeResultsButton: 'button.your-new-button-class',
  resultsTable: 'table.your-new-table-class',
  downloadButton: 'a.your-new-download-class',
};
```

---

## Complete Workflow Example

```typescript
import { chromium } from 'playwright';
import { BarchartScreenerSkill } from './skills/BarchartScreenerSkill';

async function runScreenerWorkflow() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Step 1: Run screener
    const screenerSkill = new BarchartScreenerSkill(page, {
      screenerUrl: process.env.BARCHART_SCREENER_URL!,
      screenerName: 'Base Screener-DACS3 for CALL',
      loginConfig: {
        email: process.env.BARCHART_EMAIL!,
        password: process.env.BARCHART_PASSWORD!,
        loginUrl: process.env.BARCHART_LOGIN_URL!,
      },
      downloadCSV: true,
      outputPath: './downloads',
    });

    const result = await screenerSkill.execute();

    if (result.success && result.data) {
      console.log(`Found ${result.data.symbols.length} symbols`);
      console.log('Symbols:', result.data.symbols);

      // Step 2: Process each symbol
      for (const symbol of result.data.symbols) {
        await scrapeOptionsForSymbol(symbol);
      }
    }
  } finally {
    await browser.close();
  }
}

async function scrapeOptionsForSymbol(symbol: string) {
  console.log(`Scraping options for ${symbol}...`);
  // Your options scraping logic here
}

runScreenerWorkflow();
```

---

## Files Created

```
scraper-ts/
├── .auth/
│   └── barchart-session.json       # Saved session (gitignored)
├── src/
│   ├── pages/
│   │   ├── BarchartLoginPage.ts    # Login page object
│   │   └── BarchartScreenerPage.ts # Screener page object
│   ├── skills/
│   │   ├── BarchartLoginSkill.ts   # Login with session persistence
│   │   └── BarchartScreenerSkill.ts# Screener skill
│   └── cli-screener.ts             # CLI interface
├── .env                            # Your credentials
└── BARCHART.md                     # This file
```

---

## Security Notes

⚠️ **IMPORTANT:**

1. **Never commit `.env` or `.auth/` to Git** (already in `.gitignore`)
2. **Use strong passwords** and enable 2FA on Barchart
3. **Session files contain sensitive data** - keep them secure
4. **Rotate passwords regularly** and clear old sessions

---

## Next Steps

1. ✅ Configure `.env` with your credentials
2. ✅ Test with: `npm run screener -- --headless=false`
3. ✅ Integrate with Python pipeline
4. ✅ Schedule automated runs
5. ✅ Add more screeners as needed

Happy scraping! 🚀
