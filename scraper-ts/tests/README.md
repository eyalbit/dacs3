# Tests - Barchart Integration

מדריך לבדיקות של אינטגרציית Barchart.

---

## 📁 מבנה Tests

```
tests/
├── setup.ts                           # Utilities + config
├── pages/
│   ├── BarchartLoginPage.test.ts     # Login page tests
│   └── BarchartScreenerPage.test.ts  # Screener page tests
├── skills/
│   ├── BarchartLoginSkill.test.ts    # Login skill tests
│   └── BarchartScreenerSkill.test.ts # Screener skill tests
├── integration/
│   └── complete-workflow.test.ts     # End-to-end tests
└── README.md                          # This file
```

---

## 🚀 הרצת Tests

### All Tests
```bash
npm test
```

### Specific Test File
```bash
npx playwright test tests/pages/BarchartLoginPage.test.ts
```

### With Visible Browser (Debug)
```bash
TEST_HEADLESS=false npx playwright test
```

### Watch Mode (Dev)
```bash
npx playwright test --watch
```

### Generate HTML Report
```bash
npx playwright test
npx playwright show-report
```

---

## 📝 Test Categories

### 1. **Page Object Tests** (`tests/pages/`)

#### `BarchartLoginPage.test.ts`
- ✅ Navigate to login page
- ✅ Fill login form
- ✅ Submit login
- ✅ Detect successful login
- ✅ Handle invalid credentials

#### `BarchartScreenerPage.test.ts`
- ✅ Navigate to screener
- ✅ Click "See Results"
- ✅ Extract symbols
- ✅ Extract full table data
- ✅ Complete workflow

---

### 2. **Skills Tests** (`tests/skills/`)

#### `BarchartLoginSkill.test.ts`
- ✅ Perform login and save session
- ✅ Reuse existing session
- ✅ Force fresh login
- ✅ Clear session

#### `BarchartScreenerSkill.test.ts`
- ✅ Run screener with auto-login
- ✅ Use `getSymbols()` shortcut
- ✅ Handle errors gracefully

---

### 3. **Integration Tests** (`tests/integration/`)

#### `complete-workflow.test.ts`
- ✅ Full workflow: Login → Screener → Results
- ✅ Session reuse in multiple runs
- ✅ Multiple symbols handling
- ✅ Data validation

---

## ⚙️ Configuration

### Environment Variables (.env)

```bash
# Required for tests
BARCHART_EMAIL=your-email@example.com
BARCHART_PASSWORD=your-password
BARCHART_LOGIN_URL=https://www.barchart.com/login
BARCHART_SCREENER_URL=https://www.barchart.com/stocks/stocks-screener?screener=478448

# Optional
TEST_HEADLESS=true  # Set to 'false' for visible browser
```

### Playwright Config (`playwright.config.ts`)

```typescript
export default defineConfig({
  testDir: './tests',
  fullyParallel: false,  // Sequential tests
  workers: 1,            // Single worker
  timeout: 60000,        // 60 seconds
});
```

---

## 🧪 Writing New Tests

### Template

```typescript
import { test, expect } from '@playwright/test';
import { YourSkill } from '../../src/skills/YourSkill';
import { getBarchartConfig } from '../setup';

test.describe('YourSkill', () => {
  test('should do something', async ({ page }) => {
    const config = getBarchartConfig();
    
    const skill = new YourSkill(page, config);
    const result = await skill.execute();
    
    expect(result.success).toBe(true);
  });
});
```

### Best Practices

1. **Use `getBarchartConfig()`** - centralized config
2. **Clean up** - use `afterEach` for cleanup
3. **Skip gracefully** - use `test.skip()` if config missing
4. **Log results** - use `console.log()` for debugging
5. **Single assertion per test** - keep tests focused

---

## 🐛 Debugging Tests

### 1. Run with Visible Browser
```bash
TEST_HEADLESS=false npx playwright test
```

### 2. Use Playwright Inspector
```bash
PWDEBUG=1 npx playwright test
```

### 3. Take Screenshots
```typescript
await page.screenshot({ path: 'debug.png' });
```

### 4. Add Breakpoints
```typescript
await page.pause(); // Opens Playwright Inspector
```

---

## 📊 Coverage

### Run Tests with Coverage
```bash
npm test -- --coverage
```

### Current Coverage
- **Pages:** 100% (BarchartLoginPage, BarchartScreenerPage)
- **Skills:** 100% (BarchartLoginSkill, BarchartScreenerSkill)
- **Integration:** Complete workflow tested

---

## 🔄 CI/CD Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      
      - name: Install dependencies
        run: npm install
      
      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium
      
      - name: Run tests
        run: npm test
        env:
          BARCHART_EMAIL: ${{ secrets.BARCHART_EMAIL }}
          BARCHART_PASSWORD: ${{ secrets.BARCHART_PASSWORD }}
          BARCHART_SCREENER_URL: ${{ secrets.BARCHART_SCREENER_URL }}
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

---

## 🚨 Common Issues

### Issue: Tests fail with timeout

**Solution:**
```typescript
// Increase timeout in playwright.config.ts
timeout: 120000, // 2 minutes
```

### Issue: Session conflicts

**Solution:**
Tests run sequentially by default. If issues persist:
```bash
# Clear sessions before tests
rm -rf scraper-ts/.auth/*.json
npm test
```

### Issue: Missing credentials

**Solution:**
```bash
# Verify .env file
cat .env | grep BARCHART

# Should show:
# BARCHART_EMAIL=...
# BARCHART_PASSWORD=...
```

---

## 📚 Resources

- **[Playwright Docs](https://playwright.dev/)** - Official documentation
- **[Best Practices](https://playwright.dev/docs/best-practices)** - Testing guidelines
- **[Debugging Guide](https://playwright.dev/docs/debug)** - Debug tips

---

## ✅ Test Checklist

Before committing:
- [ ] All tests pass
- [ ] No credentials in code
- [ ] Tests run in CI
- [ ] Coverage above 80%
- [ ] No flaky tests

---

**Happy Testing! 🧪✨**
